import assert from 'node:assert/strict';
import test from 'node:test';
import { letterList } from '../games/game4/data/letterLists.js';

globalThis.Phaser = {
  Scene: class {},
  Utils: { Array: { Shuffle: (items) => items } },
  Math: { Between: (min) => min, Clamp: (value, min, max) => Math.min(Math.max(value, min), max) },
};
const { GameScene4 } = await import('../games/game4/GameScene4.js');

// TIME_LIMIT в GameScene4.js.
const TIME_LIMIT = 30;

// Игровой объект Phaser: цепочки set*() и контейнер со списком детей.
class Fake {
  constructor(props = {}) {
    Object.assign(this, { x: 0, y: 0, width: 100, height: 100, scale: 1, list: [], visible: true }, props);
  }
  add(items) { this.list.push(...[items].flat()); return this; }
  setText(text) { this.text = text; return this; }
  setVisible(visible) { this.visible = visible; return this; }
  setPosition(x, y) { this.x = x; this.y = y; return this; }
  setScale(scale) { this.scale = scale; return this; }
}
for (const name of ['setOrigin', 'setDisplaySize', 'setDepth', 'setInteractive', 'disableInteractive',
  'setAngle', 'setMask', 'on', 'clear', 'fillStyle', 'slice', 'fillPath', 'createGeometryMask']) {
  Fake.prototype[name] = function () { return this; };
}

// Браузер одного игрока: общее localStorage и обработчики pagehide.
function browser(t, initial = {}) {
  const values = new Map(Object.entries(initial));
  const writes = [];
  const listeners = [];
  const saved = { localStorage: globalThis.localStorage, window: globalThis.window };
  t.after(() => Object.assign(globalThis, saved));
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { writes.push(key); values.set(key, String(value)); },
    removeItem: (key) => { writes.push(key); values.delete(key); },
  };
  globalThis.window = {
    VN: { systems: { Layout: {
      addBackground: () => ({ stage: new Fake({ scaleX: 1, scaleY: 1 }) }),
      fromCenter: () => ({ x: 0, y: 0 }),
      pin() {}, pinPauseButton() {}, onLayout() {}, fill() {}, placeNextArrow() {},
    } } },
    addEventListener: (type, listener) => listeners.push({ type, listener }),
    removeEventListener() {},
  };
  return {
    values, writes,
    // Уход со страницы перед перезагрузкой.
    unload: () => listeners.filter(({ type }) => type === 'pagehide').forEach(({ listener }) => listener()),
  };
}

// Запуск сцены как после загрузки страницы: новый экземпляр и настоящий create().
function launch() {
  const scene = new GameScene4();
  const timerEvents = [];
  Object.assign(scene, {
    add: {
      image: (x, y, key) => new Fake({ x, y, type: 'Image', texture: { key } }),
      text: (x, y, text) => new Fake({ type: 'Text', text }),
      rectangle: () => new Fake(),
      zone: () => new Fake({ type: 'Zone' }),
      container: (x, y, list = []) => new Fake({ list: [...list] }),
    },
    make: { graphics: () => new Fake() },
    input: { on() {}, keyboard: { on() {} } },
    events: { on() {}, off() {}, once() {} },
    time: {
      addEvent: (config) => { timerEvents.push(config); return { remove() {}, getProgress: () => 0 }; },
      delayedCall: () => ({ remove() {} }),
    },
    tweens: { add: ({ onComplete }) => onComplete?.() },
  });
  scene.init({ storySceneIndex: 3, minigameId: 'story_4_minigame' });
  scene.create();
  // Прошедшие секунды таймера.
  scene.tick = (seconds) => {
    for (let i = 0; i < seconds; i++) timerEvents.at(-1).callback();
  };
  return scene;
}

function play(scene, sorted, seconds) {
  scene.dismissHint();
  scene.startTimerOnce();
  scene.tick(seconds);
  for (let i = 0; i < sorted; i++) scene.sortLetter(scene.letterStack.getTopLetter());
}

function lettersInTrays(scene) {
  return scene.background.stage.list.filter((object) => object.texture?.key.startsWith('game4-letter-')).length;
}

function assertFreshAttempt(scene) {
  assert.equal(scene.activeHint?.overlay, scene.introOverlay, 'Rules screen is shown again');
  assert.equal(scene.letterStack.getCount(), letterList.length, 'Every letter is back in the stack');
  assert.equal(lettersInTrays(scene), 0, 'Trays are empty');
  assert.equal(scene.sortedLetters, 0);
  assert.equal(scene.counterText.text, `0/${letterList.length}`);
  assert.equal(scene.timeLeft, TIME_LIMIT);
  assert.equal(scene.timerText.text, `${TIME_LIMIT}`);
  assert.equal(scene.timerStarted, false, 'Timer waits for the first letter again');
}

test('reload after sorting starts a full new attempt: rules, every letter in the stack, empty trays, 0 sorted, full timer', (t) => {
  const { writes, unload } = browser(t);
  const before = launch();
  play(before, 3, 9);
  assert.equal(before.sortedLetters, 3);
  assert.equal(lettersInTrays(before), 3);
  assert.equal(before.timeLeft, TIME_LIMIT - 9);
  unload();

  assertFreshAttempt(launch());
  assert.deepEqual(writes, [], 'The attempt is never written to localStorage');
});

test('a letters save left by the previous version is ignored', (t) => {
  const legacy = JSON.stringify({
    letters: letterList.slice(0, 2),
    trayLetters: letterList.slice(2),
    sortedLetters: letterList.length - 2, totalLetters: letterList.length,
    timeLeft: 5, lastActiveAt: Date.now(),
  });
  browser(t, { game4_save_v1: legacy });
  assertFreshAttempt(launch());
});

test('reload after a win also starts over instead of restoring the victory', (t) => {
  const { unload } = browser(t);
  const before = launch();
  play(before, letterList.length, 4);
  assert.equal(before.completed, true);
  assert.equal(before.activeHint?.overlay, before.winOverlay);
  unload();

  assertFreshAttempt(launch());
});
