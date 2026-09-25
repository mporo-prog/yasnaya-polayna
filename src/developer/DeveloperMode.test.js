import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';
import { DeveloperMode } from './DeveloperMode.js';

function fixture(states) {
  const queue = [];
  const scenes = Object.entries(states).map(([key, initialStatus]) => {
    const scene = { key, status: initialStatus, starts: 0 };
    scene.sys = {
      isActive: () => scene.status === 'running',
      isPaused: () => scene.status === 'paused',
      isSleeping: () => scene.status === 'sleeping',
      load: { isLoading: () => scene.status === 'loading' },
      pause: () => { scene.status = 'paused'; },
      resume: () => { scene.status = 'running'; },
    };
    scene.scene = {
      stop: () => queue.push(() => { scene.status = 'stopped'; }),
      start: (target, data) => queue.push(() => {
        const next = scenes.find((item) => item.key === target);
        scene.status = 'stopped';
        next.status = 'running';
        next.data = data;
        next.starts++;
      }),
    };
    return scene;
  });
  const game = {
    events: new EventEmitter(),
    scene: {
      getScenes: (active) => scenes.filter((scene) => !active || scene.sys.isActive()),
      getScene: (key) => scenes.find((scene) => scene.key === key),
    },
  };
  const keyboard = new EventTarget();
  const screen = {
    visible: false,
    removed: false,
    show() { this.visible = true; },
    hide() { this.visible = false; },
    destroy() { this.removed = true; },
  };
  const entry = { key: 'GameScene4', data: { storySceneIndex: 3, minigameId: 'story_4_minigame' } };
  const saved = [];
  const mode = new DeveloperMode(game, screen, [entry], (item) => saved.push(item.data), keyboard);
  return {
    game, mode, screen, scenes, entry, saved,
    press(overrides = {}) {
      const event = new Event('keydown', { cancelable: true });
      Object.assign(event, { code: 'KeyD', key: 'd', ctrlKey: true, ...overrides });
      keyboard.dispatchEvent(event);
      return event;
    },
    frame() {
      game.events.emit('prestep');
      while (queue.length) queue.shift()();
    },
  };
}

test('Ctrl+D captures the browser shortcut; D alone, other modifiers and repeats do not toggle', () => {
  const f = fixture({ MainMenuScene: 'running' });
  assert.equal(f.press({ ctrlKey: false }).defaultPrevented, false);
  assert.equal(f.press({ shiftKey: true }).defaultPrevented, false);
  assert.equal(f.screen.visible, false);
  assert.equal(f.press({ key: 'в' }).defaultPrevented, true);
  assert.equal(f.screen.visible, true);
  assert.equal(f.scenes[0].status, 'paused');
  f.press({ repeat: true });
  assert.equal(f.screen.visible, true);
  f.press();
  assert.equal(f.screen.visible, false);
  assert.equal(f.scenes[0].status, 'running');
  assert.deepEqual(f.saved, []);
  f.mode.destroy();
});

test('closing from the pause menu restores only the scenes paused by developer mode', () => {
  const f = fixture({ StoryScene: 'paused', PauseScene: 'running', GameScene4: 'stopped' });
  f.press();
  assert.deepEqual(f.scenes.map((scene) => scene.status), ['paused', 'paused', 'stopped']);
  f.press({ key: 'Escape', code: 'Escape', ctrlKey: false });
  assert.deepEqual(f.scenes.map((scene) => scene.status), ['paused', 'running', 'stopped']);
  f.mode.destroy();
});

test('launch stops paused, sleeping and loading scenes and passes the real story context', () => {
  const f = fixture({ StoryScene: 'paused', PauseScene: 'running', Extra: 'sleeping', BootScene: 'loading', GameScene4: 'stopped' });
  f.mode.open();
  f.mode.launch(f.entry);
  f.frame();
  assert.equal(f.screen.visible, false);
  assert.deepEqual(f.game.scene.getScenes(true).map((scene) => scene.key), ['GameScene4']);
  assert.ok(f.scenes.slice(0, -1).every((scene) => scene.status === 'stopped'));
  assert.deepEqual(f.game.scene.getScene('GameScene4').data, f.entry.data);
  assert.deepEqual(f.saved, [f.entry.data]);

  f.mode.open();
  f.mode.launch(f.entry);
  f.frame();
  assert.equal(f.game.scene.getScene('GameScene4').starts, 2);
  assert.equal(f.game.scene.getScenes(true).length, 1);
  f.mode.destroy();
});

test('a scene finishing preload while the screen is open is paused and can be resumed', () => {
  const f = fixture({ GameScene4: 'loading' });
  f.mode.open();
  assert.equal(f.scenes[0].status, 'loading');
  f.scenes[0].status = 'running';
  f.frame();
  assert.equal(f.scenes[0].status, 'paused');
  f.mode.close();
  assert.equal(f.scenes[0].status, 'running');
  f.mode.destroy();
});

test('unknown entries cannot replace the current game or change the save', () => {
  const f = fixture({ StoryScene: 'running' });
  f.mode.open();
  f.mode.launch({ key: 'StoryScene', data: {} });
  f.mode.launch(f.entry); // Registered entry with an unavailable scene.
  f.frame();
  assert.deepEqual(f.saved, []);
  assert.equal(f.screen.visible, true);
  f.mode.close();
  assert.equal(f.scenes[0].status, 'running');
  f.mode.destroy();
});

test('uninstall and game destruction remove hooks and restore owned pauses', () => {
  for (const destroyGame of [false, true]) {
    const f = fixture({ StoryScene: 'running' });
    f.mode.open();
    if (destroyGame) f.game.events.emit('destroy');
    else f.mode.destroy();
    f.mode.destroy(); // Cleanup is idempotent.
    assert.equal(f.screen.removed, true);
    assert.equal(f.scenes[0].status, 'running');
    assert.equal(f.game.events.listenerCount('prestep'), 0);
    assert.equal(f.game.events.listenerCount('destroy'), 0);
    assert.equal(f.press().defaultPrevented, false);
    assert.equal(f.screen.visible, false);
  }
});
