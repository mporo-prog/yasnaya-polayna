import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const TTL = 30 * 60 * 1000;
const START = 1_800_000_000_000;
const plain = (value) => JSON.parse(JSON.stringify(value));
const eventTarget = () => Object.assign(new EventEmitter(), {
  addEventListener: EventEmitter.prototype.on,
  removeEventListener: EventEmitter.prototype.off,
});

function fixture({ storage = new Map(), now = START, search = '' } = {}) {
  const clock = { now };
  const window = Object.assign(eventTarget(), {
    VN: { systems: {}, scenes: {}, data: {} }, location: { search },
  });
  const document = Object.assign(eventTarget(), { hidden: false });
  const localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  };
  const context = vm.createContext({
    window, document, localStorage, URLSearchParams, console: { warn() {} },
    Date: { now: () => clock.now }, Phaser: { Scene: class {} },
  });
  for (const file of ['systems/SaveManager', 'systems/GameState', 'systems/ProgressLifecycle',
    'data/story/storyMinigameLinks', 'scenes/BootScene', 'scenes/start/StartScene']) {
    vm.runInContext(readFileSync(new URL('../public/resource/' + file + '.js', import.meta.url), 'utf8'), context);
  }
  const calls = [];
  const scenePlugin = {
    launch: (key) => calls.push({ launch: key }),
    start: (key, data) => calls.push({ key, ...(data ? { data: plain(data) } : {}) }),
  };
  const boot = () => {
    const scene = new window.VN.scenes.BootScene();
    scene.scene = scenePlugin;
    scene.create();
    return calls.at(-1);
  };
  const menu = new window.VN.scenes.StartScene();
  menu.scene = scenePlugin;
  const systems = window.VN.systems;
  return { window, document, localStorage, storage, clock, calls, boot, menu,
    state: systems.GameState, saves: systems.SaveManager, lifecycle: systems.ProgressLifecycle,
    reload: (search = '') => fixture({ storage, now: clock.now, search }),
    stored: () => JSON.parse(storage.get('vn_save_v1')),
  };
}

test('a fresh browser opens the menu; Start opens the first story screen', () => {
  const f = fixture();
  assert.deepEqual(f.boot(), { key: 'MainMenuScene' });
  f.state.markAtMenu();
  f.menu.startGame();
  assert.deepEqual(f.calls.at(-1), { key: 'StoryScene', data: { storySceneIndex: 0, screenIndex: 0 } });
});

test('reload restores the exact story screen, history and completed games before 30 minutes', () => {
  const f = fixture();
  f.state.goToScreen(2, 3);
  f.state.addHistoryEntry(2, 3, 'Реплика', 'Лев Николаевич');
  f.state.markMinigameCompleted('story_2_minigame');
  f.clock.now += TTL - 1;
  const reloaded = f.reload();
  assert.deepEqual(reloaded.boot(), { key: 'StoryScene', data: { storySceneIndex: 2, screenIndex: 3 } });
  reloaded.state.addHistoryEntry(2, 3, 'Реплика', 'Лев Николаевич');
  assert.equal(reloaded.state.state.history.length, 1, 'Re-rendering does not duplicate history');
  assert.deepEqual(reloaded.stored().completedMinigames, ['story_2_minigame']);
  assert.equal(reloaded.stored().status, 'story', 'Boot must not mark a loaded story as menu');
});

test('reload restores every minigame with its real story index and completion id', () => {
  const f = fixture();
  for (const [index, key] of [...f.window.VN.data.storyMinigameLinks].entries()) {
    f.state.goToScreen(index, 2);
    f.state.markMinigameStarted();
    assert.deepEqual(f.reload().boot(), {
      key: key || 'PlaceholderMinigameScene',
      data: { storySceneIndex: index, minigameId: `story_${index + 1}_minigame` },
    });
  }
});

test('Start clears story and minigame progress only on click, including after a menu reload', () => {
  for (const status of ['story', 'minigame']) {
    const f = fixture();
    f.state.goToScreen(3, 4);
    f.state.addHistoryEntry(3, 4, 'Прошлая реплика');
    f.state.markMinigameCompleted('story_3_minigame');
    f.storage.set('game4_save_v1', '{"letters":[]}');
    f.storage.set('vn_audio_settings_v1', '{"music":25}');
    if (status === 'minigame') f.state.markMinigameStarted();
    const expected = { key: 'StoryScene', data: { storySceneIndex: 0, screenIndex: 0 } };
    f.state.markAtMenu();
    f.state.markAtMenu();
    const reloaded = f.reload();
    assert.deepEqual(reloaded.boot(), { key: 'MainMenuScene' });
    assert.equal(reloaded.state.state.screenIndex, 4, 'Entering or reloading the menu alone does not reset progress');
    assert.equal(reloaded.state.state.history.length, 1);
    reloaded.menu.startGame();
    assert.deepEqual(reloaded.calls.at(-1), expected);
    assert.equal(reloaded.stored().status, 'story');
    assert.deepEqual(reloaded.stored().history, []);
    assert.deepEqual(reloaded.stored().visitedScreens, []);
    assert.deepEqual(reloaded.stored().completedMinigames, []);
    assert.equal(reloaded.stored().resumeStatus, undefined);
    assert.equal(f.storage.has('game4_save_v1'), false);
    assert.equal(f.storage.get('vn_audio_settings_v1'), '{"music":25}');
    assert.deepEqual(reloaded.reload().boot(), expected, 'Reload during new-game loading preserves the new beginning');
  }
});

test('Start also resets saves from the old menu format', () => {
  const f = fixture({ storage: new Map([['vn_save_v1', JSON.stringify({
    status: 'menu', storySceneIndex: 2, screenIndex: 3, lastActiveAt: START,
  })]]) });
  f.menu.startGame();
  assert.deepEqual(f.calls.at(-1), { key: 'StoryScene', data: { storySceneIndex: 0, screenIndex: 0 } });
  assert.deepEqual(f.stored().history, []);
});

test('expiry boundary: 30 minutes retained, more than 30 cleared along with the letters save', () => {
  for (const elapsed of [TTL, TTL + 1]) {
    const f = fixture();
    f.state.goToScreen(3, 2);
    f.storage.set('game4_save_v1', '{}');
    f.storage.set('vn_audio_settings_v1', '{"music":25}');
    f.clock.now += elapsed;
    const reloaded = f.reload();
    assert.equal(reloaded.boot().key, elapsed === TTL ? 'StoryScene' : 'MainMenuScene');
    if (elapsed > TTL) {
      assert.equal(reloaded.state.state.storySceneIndex, 0);
      assert.equal(f.storage.has('game4_save_v1'), false);
    }
    assert.equal(f.storage.get('vn_audio_settings_v1'), '{"music":25}');
  }
});

test('Start also clears expired progress; reset removes minigame state', () => {
  const f = fixture();
  f.state.goToScreen(3, 2);
  f.state.markMinigameStarted();
  f.state.markAtMenu();
  f.storage.set('game4_save_v1', '{}');
  f.clock.now += TTL + 1;
  f.menu.startGame();
  assert.deepEqual(f.calls.at(-1), { key: 'StoryScene', data: { storySceneIndex: 0, screenIndex: 0 } });
  assert.equal(f.storage.has('game4_save_v1'), false);
  f.storage.set('game4_save_v1', '{}');
  f.state.reset();
  assert.equal(f.storage.has('game4_save_v1'), false);
});

test('direct game links still override automatic restoration', () => {
  const f = fixture();
  f.state.goToScreen(2, 3);
  for (let index = 1; index <= 5; index++) {
    const key = index === 5 ? 'QuoteMinigameScene' : 'GameScene' + index;
    assert.deepEqual(f.reload('?game=' + index).boot(), {
      key, data: { storySceneIndex: 0, minigameId: 'test_' + key, direct: true },
    });
  }
});

test('unreadable or unavailable storage does not prevent starting and playing in memory', () => {
  const f = fixture({ storage: new Map([['vn_save_v1', 'broken JSON']]) });
  assert.equal(f.boot().key, 'MainMenuScene');
  for (const name of ['getItem', 'setItem', 'removeItem']) {
    f.localStorage[name] = () => { throw new Error('Storage denied'); };
  }
  assert.doesNotThrow(() => {
    f.state.goToScreen(2, 3);
    f.state.reset();
    f.menu.startGame();
  });
  assert.equal(f.state.state.status, 'story');
});

function installLifecycle(f) {
  const stopped = [];
  const started = [];
  const scenes = ['StoryScene', 'PauseScene', 'SettingsScene', 'AssetLoaderScene'].map((key) => ({
    sys: { settings: { key } }, isAssetLoader: key === 'AssetLoaderScene',
  }));
  const game = { events: new EventEmitter(), scene: {
    getScenes(activeOnly) { assert.equal(activeOnly, false); return scenes; },
    stop: (key) => stopped.push(key), start: (key) => started.push(key),
  } };
  f.lifecycle.install(game);
  const hide = () => { f.document.hidden = true; f.document.emit('visibilitychange'); };
  const show = () => { f.document.hidden = false; f.document.emit('visibilitychange'); };
  return { game, stopped, started, hide, show };
}

test('leaving after a long active session saves the current position for a full 30 minutes', () => {
  const f = fixture();
  const l = installLifecycle(f);
  f.state.goToScreen(2, 3);
  f.clock.now += TTL * 2;
  l.hide();
  assert.equal(f.stored().lastActiveAt, f.clock.now);
  f.clock.now += TTL - 1;
  l.show();
  assert.deepEqual(l.started, []);
  assert.equal(f.state.state.screenIndex, 3);
  assert.equal(f.stored().lastActiveAt, f.clock.now);
});

test('closing or reloading a long-hidden tab never renews an expired save', () => {
  const f = fixture();
  const l = installLifecycle(f);
  f.state.goToScreen(2, 3);
  l.hide();
  const leftAt = f.stored().lastActiveAt;
  f.clock.now += TTL + 1;
  f.window.emit('beforeunload');
  f.window.emit('pagehide');
  f.document.emit('visibilitychange');
  assert.equal(f.stored().lastActiveAt, leftAt);
  assert.equal(f.reload().boot().key, 'MainMenuScene');
});

test('expired return stops paused and sleeping scenes but keeps the shared loader', () => {
  const f = fixture();
  const l = installLifecycle(f);
  f.state.goToScreen(2, 3);
  l.hide();
  f.clock.now += TTL + 1;
  l.show();
  assert.deepEqual(l.stopped, ['StoryScene', 'PauseScene', 'SettingsScene']);
  assert.deepEqual(l.started, ['MainMenuScene']);
  assert.equal(f.state.state.status, 'menu');
  assert.equal(f.state.state.screenIndex, 0);
});

test('pagehide/pageshow cover back-forward cache and listeners are cleaned on destruction', () => {
  const f = fixture();
  const l = installLifecycle(f);
  f.state.goToScreen(2, 3);
  f.window.emit('pagehide');
  f.clock.now += TTL + 1;
  f.window.emit('pageshow', { persisted: true });
  assert.deepEqual(l.started, ['MainMenuScene']);
  l.game.events.emit('destroy');
  assert.equal(f.document.listenerCount('visibilitychange'), 0);
  for (const name of ['beforeunload', 'pagehide', 'pageshow']) assert.equal(f.window.listenerCount(name), 0);
});
