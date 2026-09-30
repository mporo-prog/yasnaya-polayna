import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { existsSync, readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const tick = () => new Promise((resolve) => setImmediate(resolve));
const picture = (key) => ({ type: 'image', key, url: key + '.png' });

function fixture(concurrency = 4) {
  const window = { VN: { systems: {}, data: {}, scenes: {} } };
  const context = vm.createContext({
    window, URL, console,
    document: { currentScript: { src: 'https://example.test/yasnaya-polayna/resource/systems/AudioManager.js' } },
    localStorage: { getItem: () => null },
    Phaser: { Scene: class {}, Loader: { File: class { constructor(loader) { this.loader = loader; } } } },
  });
  for (const file of ['SaveManager', 'GameState', 'AudioManager', 'SceneAudio', 'AssetQueue', 'SceneAssets']) {
    vm.runInContext(readFileSync(new URL(`../public/resource/systems/${file}.js`, import.meta.url), 'utf8'), context);
  }
  for (const file of ['start/StartScene', 'story/StoryScene']) {
    vm.runInContext(readFileSync(new URL(`../public/resource/scenes/${file}.js`, import.meta.url), 'utf8'), context);
  }
  const cached = new Set();
  const batches = [];
  const queue = new window.VN.systems.AssetQueue({
    concurrency,
    isCached: ({ type, key }) => cached.has(type + ':' + key),
    loadBatch: (assets, onFileComplete) => new Promise((resolve) => batches.push({
      assets,
      complete(asset) {
        cached.add(asset.type + ':' + asset.key);
        onFileComplete(asset);
      },
      finish(failed = []) {
        for (const asset of assets) if (!failed.includes(asset.key)) cached.add(asset.type + ':' + asset.key);
        resolve();
      },
    })),
  });
  const systems = window.VN.systems;
  const data = window.VN.data;
  data.sceneAudio = { MainMenuScene: { music: 'music/menu.mp3' }, GameScene1: { sounds: ['voice_and_sound/game.mp3'] } };
  data.storyAudio = [{ music: 'music/first.mp3', screens: [{ sounds: ['voice_and_sound/first.mp3'] }] }, {}];
  data.storyLines = [[{ speaker: 'A' }, { speaker: 'A' }], [{ speaker: 'B' }]];
  data.storyBackgrounds = [['first.png', 'first.png'], ['second.png']];
  data.storyCharacterPortraits = { A: 'a.png', B: 'b.png' };
  data.storyMinigameLinks = ['GameScene1', null];
  const game = { scene: { getScene(key) {
    if (key === 'AssetLoaderScene') return { queue };
    if (key === 'MainMenuScene') return new window.VN.scenes.StartScene();
    if (key === 'StoryScene') return new window.VN.scenes.StoryScene();
    if (key === 'GameScene1') return { getAssetManifest: () => ({ images: [{ key: 'bird', url: '/yasnaya-polayna/images/bird.png' }], audio: ['voice_and_sound/bird.wav'] }) };
    return {};
  } } };
  function scene(key = 'StoryScene', passed = {}) {
    const objects = [];
    const object = () => {
      const result = { destroyed: false, text: '',
        setOrigin() { return this; }, setText(value) { this.text = value; return this; },
        destroy() { this.destroyed = true; },
      };
      objects.push(result);
      return result;
    };
    return { game, events: new EventEmitter(), objects,
      sys: { settings: { key, data: passed } },
      scale: { width: 1920, height: 1080 },
      add: { rectangle: object, text: object },
      load: { files: [], completed: 0,
        addFile(file) { this.files.push(file); }, nextFile() { this.completed++; },
      },
    };
  }
  return { queue, cached, batches, systems, game, data, scene, assets: systems.SceneAssets };
}

test('a foreground transition shares in-flight work and cached images with background loading', async () => {
  const f = fixture();
  const progress = [];
  const background = f.queue.ensure([picture('shared'), picture('shared')]);
  f.queue.pump();
  await tick();
  const foreground = f.queue.ensure([picture('shared')], { priority: 1, onProgress: (value) => progress.push(value) });
  assert.equal(f.batches.length, 1);
  assert.equal(f.batches[0].assets.length, 1);
  f.batches[0].finish();
  assert.equal((await background).length, 0);
  assert.equal((await foreground).length, 0);
  assert.deepEqual(progress, [0, 1]);
  await f.queue.ensure([picture('shared')]);
  f.queue.pump();
  assert.equal(f.batches.length, 1, 'Cache hits do not download again');
});

test('a requested scene takes priority over queued speculation without duplicating it', async () => {
  const f = fixture(1);
  const background = f.queue.ensure(['a', 'b', 'c'].map(picture));
  f.queue.pump();
  await tick();
  const foreground = f.queue.ensure([picture('c')], { priority: 1 });
  f.batches[0].finish();
  await tick();
  assert.equal(f.batches[1].assets[0].key, 'c');
  f.batches[1].finish();
  await foreground;
  await tick();
  assert.equal(f.batches[2].assets[0].key, 'b');
  f.batches[2].finish();
  await background;
});

test('progress advances per decoded file while a slower file in the same batch is pending', async () => {
  const f = fixture();
  const progress = [];
  let finished = false;
  const ready = f.queue.ensure(['fast', 'medium', 'slow'].map(picture), {
    onProgress: (value) => progress.push(value),
  }).then(() => { finished = true; });
  f.queue.pump();
  await tick();
  f.batches[0].complete(picture('fast'));
  await tick();
  assert.deepEqual(progress, [0, 1 / 3]);
  assert.equal(finished, false);
  f.batches[0].complete(picture('fast'));
  f.batches[0].complete(picture('medium'));
  await tick();
  assert.deepEqual(progress, [0, 1 / 3, 2 / 3], 'A repeated event cannot count a file twice');
  f.batches[0].finish();
  await ready;
  assert.deepEqual(progress, [0, 1 / 3, 2 / 3, 1]);
});

test('failed files settle, may retry on demand, and do not evict successful resources', async () => {
  const f = fixture();
  const result = f.queue.ensure([picture('good'), picture('missing')]);
  f.queue.pump();
  await tick();
  f.batches[0].finish(['missing']);
  assert.deepEqual(Array.from(await result, (asset) => asset.key), ['missing']);
  const retry = f.queue.ensure([picture('good'), picture('missing')]);
  f.queue.pump();
  await tick();
  assert.deepEqual(Array.from(f.batches[1].assets, (asset) => asset.key), ['missing']);
  f.batches[1].finish();
  assert.equal((await retry).length, 0);
});

test('destroy settles both queued and in-flight requests', async () => {
  const f = fixture(1);
  const result = f.queue.ensure([picture('a'), picture('b')]);
  f.queue.pump();
  await tick();
  f.queue.destroy();
  assert.equal((await result).length, 2);
  f.batches[0].finish();
  await tick();
  assert.equal(f.batches.length, 1);
});

test('menu needs only its visuals; a story includes only its own speakers, images and audio', () => {
  const f = fixture();
  const menu = f.assets.assetsFor(f.game, 'MainMenuScene', {}, { visualsOnly: true });
  assert.deepEqual(Array.from(menu, (asset) => asset.key).sort(), ['gameLogo', 'mainButtonBg', 'menuBackground', 'saveButtonBg']);
  assert.ok(menu.every((asset) => asset.type === 'image'));
  const story = f.assets.assetsFor(f.game, 'StoryScene', { storySceneIndex: 0 });
  const keys = story.map((asset) => asset.key);
  assert.equal(keys.filter((key) => key === 'first.png').length, 1);
  assert.ok(keys.includes('a.png'));
  assert.ok(!keys.includes('b.png') && !keys.includes('second.png'));
  assert.ok(!keys.some((key) => key.includes('menu.mp3')));
  assert.ok(story.filter((asset) => asset.type === 'audio').every((asset) => asset.url.startsWith('https://example.test/yasnaya-polayna/')));
  const gameAssets = f.assets.assetsFor(f.game, 'GameScene1');
  assert.equal(gameAssets.length, 3, 'Mini-game declaration, bird voice and scene audio are included');
  const overridden = f.assets.assetsFor(f.game, 'StoryScene', { storySceneIndex: 0, audio: null });
  assert.ok(overridden.every((asset) => asset.type === 'image'));
});

test('actual menu and story manifests include UI texture aliases backed by existing PNG files', () => {
  const f = fixture();
  const expected = {
    MainMenuScene: { gameLogo: 'game_logo.png', mainButtonBg: 'main_button.png', saveButtonBg: 'save_button.png' },
    StoryScene: { dialogTextBg: 'dialog_text_bg.png', historyModalBg: 'history_modal_bg.png', closeButton: 'close_button.png' },
  };
  for (const [scene, textures] of Object.entries(expected)) {
    const assets = f.assets.assetsFor(f.game, scene, { storySceneIndex: 0 }, { visualsOnly: true });
    for (const [key, filename] of Object.entries(textures)) {
      const matches = assets.filter((asset) => asset.key === key);
      assert.equal(matches.length, 1, `${scene} must prepare ${key} exactly once`);
      assert.equal(matches[0].url, 'images/icon_UI/' + filename);
      assert.ok(existsSync(new URL('../public/' + matches[0].url, import.meta.url)), `${key} URL must point to a shipped file`);
    }
  }
});

test('look-ahead follows menu -> story -> mini-game -> next story -> final menu', () => {
  const f = fixture();
  assert.equal(f.assets.nextTarget('MainMenuScene').data.storySceneIndex, 0);
  assert.equal(f.assets.nextTarget('StoryScene', { storySceneIndex: 0 }).key, 'GameScene1');
  assert.equal(f.assets.nextTarget('GameScene1', { storySceneIndex: 0 }).data.storySceneIndex, 1);
  assert.equal(f.assets.nextTarget('StoryScene', { storySceneIndex: 1 }).key, 'PlaceholderMinigameScene');
  assert.equal(f.assets.nextTarget('PlaceholderMinigameScene', { storySceneIndex: 1 }).key, 'MainMenuScene');
  assert.equal(f.assets.nextTarget('SettingsScene'), null);
});

test('menu prefetch prepares a new game regardless of saved story or minigame progress', () => {
  const f = fixture();
  Object.assign(f.systems.GameState.state, { status: 'menu', resumeStatus: 'story', storySceneIndex: 1, screenIndex: 3 });
  assert.equal(f.assets.nextTarget('MainMenuScene').data.storySceneIndex, 0);
  assert.equal(f.assets.nextTarget('MainMenuScene').data.screenIndex, 0);
  Object.assign(f.systems.GameState.state, { resumeStatus: 'minigame', storySceneIndex: 0 });
  assert.equal(f.assets.nextTarget('MainMenuScene').key, 'StoryScene');
});

test('a scene waits for resources; leaving during the wait cannot revive the stopped scene', async () => {
  const f = fixture(30);
  const stopped = f.scene('MainMenuScene');
  f.assets.preload(stopped, { visualsOnly: true });
  stopped.load.files[0].load();
  f.queue.pump();
  await tick();
  assert.equal(stopped.load.completed, 0);
  stopped.events.emit('shutdown');
  const next = f.scene('MainMenuScene');
  f.assets.preload(next, { visualsOnly: true });
  next.load.files[0].load();
  f.batches[0].finish();
  await tick();
  assert.equal(stopped.load.completed, 0);
  assert.equal(next.load.completed, 1);
  assert.ok(next.objects.every((object) => object.destroyed));
  assert.equal(next.events.listenerCount('shutdown'), 0);
  const cached = f.scene('MainMenuScene');
  f.assets.preload(cached, { visualsOnly: true });
  assert.equal(cached.load.files.length, 0);
  assert.equal(cached.objects.length, 0, 'No loading flash on a cached transition');
});

test('late menu music never starts after navigation, even if the same scene is restarted', async () => {
  const f = fixture(30);
  let enters = 0;
  f.systems.SceneAudio.enter = () => { enters++; };
  const menu = f.scene('MainMenuScene');
  f.assets.enterMenu(menu);
  f.queue.pump();
  await tick();
  assert.equal(enters, 0);
  menu.events.emit('shutdown');
  f.assets.enterMenu(menu);
  f.batches[0].finish();
  await tick();
  assert.equal(enters, 1);
  assert.equal(f.batches.length, 1);
});

test('destroying a waiting scene cancels its callbacks without touching shared work', async () => {
  const f = fixture();
  const scene = f.scene('MainMenuScene');
  f.assets.preload(scene, { visualsOnly: true });
  scene.load.files[0].load();
  f.queue.pump();
  await tick();
  scene.events.emit('destroy');
  f.batches[0].finish();
  await tick();
  assert.equal(scene.load.completed, 0);
  assert.equal(scene.events.listenerCount('shutdown'), 0);
  assert.ok(f.cached.has('image:menuBackground'));
});
