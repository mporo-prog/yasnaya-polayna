import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

function fixture(search = '') {
  const window = { VN: { systems: {}, scenes: {} }, location: { search } };
  const elements = {
    'startup-loading': { remove() { delete elements['startup-loading']; } },
    'startup-label': { textContent: 'Запускаем игру…' },
    'startup-progress': {},
  };
  const document = { getElementById: (id) => elements[id] };
  const context = vm.createContext({
    window, URLSearchParams, Date,
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    document,
    Phaser: { Scene: class {} },
  });
  for (const path of ['systems/SaveManager.js', 'systems/GameState.js', 'systems/StartupScreen.js', 'scenes/BootScene.js']) {
    vm.runInContext(readFileSync(new URL('../public/resource/' + path, import.meta.url), 'utf8'), context);
  }
  return { window, document, elements, screen: window.VN.systems.StartupScreen,
    scene: { events: new EventEmitter(), game: { events: new EventEmitter() } } };
}

test('startup overlay stays through loading and creation until the first rendered frame', () => {
  const f = fixture();
  const update = f.screen.track(f.scene);
  update(1 / 3);
  assert.equal(f.elements['startup-label'].textContent, 'Загрузка… 33%');
  assert.equal(f.elements['startup-progress'].value, 33);
  f.scene.game.events.emit('postrender');
  assert.ok(f.elements['startup-loading'], 'A loading frame is not a ready scene');
  update(1);
  f.scene.events.emit('create');
  assert.ok(f.elements['startup-loading'], 'Creation alone has not drawn the canvas');
  f.scene.game.events.emit('postrender');
  assert.equal(f.elements['startup-loading'], undefined);
  assert.equal(f.scene.events.listenerCount('shutdown'), 0);
  assert.equal(f.scene.events.listenerCount('destroy'), 0);
  assert.equal(f.screen.track(f.scene), null, 'Later transitions use the scene loader');
});

test('late stylesheet and fonts redraw canvas text, including containers, without leaking listeners', () => {
  const f = fixture();
  const events = () => Object.assign(new EventEmitter(), {
    addEventListener: EventEmitter.prototype.on,
    removeEventListener: EventEmitter.prototype.off,
  });
  const fonts = f.document.fonts = events();
  const stylesheet = f.elements['game-fonts'] = events();
  let redraws = 0;
  const text = { type: 'Text', style: { update(metrics) { assert.equal(metrics, true); redraws++; } } };
  f.scene.game.scene = { scenes: [{ children: { list: [text, { list: [text] }] } }] };
  f.screen.track(f.scene);
  stylesheet.emit('load');
  assert.equal(redraws, 2);
  fonts.emit('loadingdone');
  assert.equal(redraws, 4);
  f.scene.game.events.emit('destroy');
  assert.equal(fonts.listenerCount('loadingdone'), 0);
  assert.equal(stylesheet.listenerCount('load'), 0);
});

test('leaving a startup scene cancels callbacks and lets the next scene own the overlay', () => {
  const f = fixture();
  const update = f.screen.track(f.scene);
  update(0.5);
  f.scene.events.emit('create');
  f.scene.events.emit('shutdown');
  update(1);
  f.scene.game.events.emit('postrender');
  assert.equal(f.elements['startup-label'].textContent, 'Загрузка… 50%');
  assert.ok(f.elements['startup-loading']);
  f.screen.track(f.scene)(1);
  f.scene.events.emit('create');
  f.scene.game.events.emit('postrender');
  assert.equal(f.elements['startup-loading'], undefined);
});

test('Boot starts the shared loader and target without preloading any story media', () => {
  for (const search of ['', '?game=1', '?game=5']) {
    const f = fixture(search);
    const boot = new f.window.VN.scenes.BootScene();
    const calls = [];
    const unexpectedLoad = () => assert.fail('Boot must not download media before the visible loader');
    boot.load = { image: unexpectedLoad, audio: unexpectedLoad };
    f.window.VN.systems.SceneAudio = { preload: unexpectedLoad };
    boot.preload?.();
    boot.scene = {
      launch: (key) => calls.push(key),
      start: (key) => calls.push(key),
    };
    boot.create();
    assert.deepEqual(calls, ['AssetLoaderScene', search === '?game=1' ? 'GameScene1'
      : search === '?game=5' ? 'QuoteMinigameScene' : 'MainMenuScene']);
  }
});
