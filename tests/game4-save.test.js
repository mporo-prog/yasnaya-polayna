import assert from 'node:assert/strict';
import test from 'node:test';
import { Game4Storage } from '../games/game4/systems/Game4Storage.js';

globalThis.Phaser = { Scene: class {} };
const { GameScene4 } = await import('../games/game4/GameScene4.js');
const KEY = 'game4_save_v1';

function fixture() {
  const values = new Map();
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  const scene = new GameScene4();
  Object.assign(scene, {
    storage: new Game4Storage(KEY), completed: false,
    letterStack: { getAll: () => [{ envelope: 'blue', image: 'blue1' }] },
    trayLetters: [{ envelope: 'pink', image: 'red1' }],
    sortedLetters: 2, totalLetters: 3, timeLeft: 21,
  });
  return { scene, values };
}

test('pagehide preserves remaining letters, count and timer instead of deleting the attempt', () => {
  const { scene } = fixture();
  scene.saveGame4State();
  scene.timeLeft = 19;
  scene.handlePageHide();
  const restored = new Game4Storage(KEY).load();
  assert.deepEqual(restored.letters, [{ envelope: 'blue', image: 'blue1' }]);
  assert.deepEqual(restored.trayLetters, [{ envelope: 'pink', image: 'red1' }]);
  assert.equal(restored.sortedLetters, 2);
  assert.equal(restored.totalLetters, 3);
  assert.equal(restored.timeLeft, 19);
  assert.ok(restored.lastActiveAt > 0);
});

test('pagehide cannot recreate a completed or lost attempt', () => {
  const { scene, values } = fixture();
  scene.saveGame4State();
  scene.completed = true;
  scene.clearGame4Save();
  scene.handlePageHide();
  assert.equal(values.has(KEY), false);
});

test('letters have the same 30-minute retention; legacy attempts remain readable', () => {
  const { scene, values } = fixture();
  scene.saveGame4State();
  const save = scene.storage.load();
  for (const minutes of [29, 31]) {
    values.set(KEY, JSON.stringify({ ...save, lastActiveAt: Date.now() - minutes * 60 * 1000 }));
    assert.equal(scene.storage.load() !== null, minutes === 29);
  }
  delete save.lastActiveAt;
  values.set(KEY, JSON.stringify(save));
  assert.equal(scene.storage.load().timeLeft, 21);
});

test('malformed or inaccessible letter storage cannot crash the minigame', (t) => {
  const { scene, values } = fixture();
  t.mock.method(console, 'warn', () => {});
  t.mock.method(console, 'error', () => {});
  for (const data of ['broken', 'null', '{}']) {
    values.set(KEY, data);
    assert.equal(scene.storage.load(), null);
  }
  for (const name of ['getItem', 'setItem', 'removeItem']) {
    globalThis.localStorage[name] = () => { throw new Error('Storage denied'); };
  }
  assert.doesNotThrow(() => {
    scene.saveGame4State();
    assert.equal(scene.storage.load(), null);
    scene.clearGame4Save();
  });
});

test('letters use the shared activity time when continued from a long pause or menu visit', (t) => {
  const { scene, values } = fixture();
  const originalWindow = globalThis.window;
  t.after(() => { globalThis.window = originalWindow; });
  globalThis.window = { VN: { systems: { GameState: { state: { lastActiveAt: Date.now() } } } } };
  scene.saveGame4State();
  const saved = JSON.parse(values.get(KEY));
  values.set(KEY, JSON.stringify({ ...saved, lastActiveAt: Date.now() - 40 * 60 * 1000 }));
  assert.equal(scene.storage.load().timeLeft, 21, 'Active shared session retains the paused attempt');
  window.VN.systems.GameState.state.lastActiveAt = Date.now() - 31 * 60 * 1000;
  assert.equal(scene.storage.load(), null);
});
