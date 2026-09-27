import assert from 'node:assert/strict';
import test from 'node:test';

globalThis.Phaser = { Scene: class {} };
globalThis.window = { VN: { systems: {
  finishMinigameAndAdvance(scene) { scene.advances += 1; },
} } };
const { GameScene1 } = await import('../games/game1/GameScene1.js');

function fixture(round = 2, audio = true) {
  const scene = new GameScene1();
  scene.init({ hintDurationSeconds: 0.1 });
  Object.assign(scene, {
    phase: 'input', paused: false, completed: false, activeHint: null,
    input: { enabled: true, keyboard: { enabled: true } },
    inputIndex: 0, sequence: [0, 1], round_number: round, advances: 0,
  });
  for (const name of ['introOverlay', 'repeatOverlay', 'loseOverlay', 'winOverlay', 'winRoundOverlay']) {
    scene[name] = { visible: false, setVisible(value) { this.visible = value; return this; } };
  }
  scene.birds = [5, 2, 1, 1].map((duration, index) => ({
    voice: {
      totalDuration: audio ? duration : 0, isPlaying: false, isPaused: false, plays: 0,
      play() { this.plays += 1; this.isPlaying = audio; return audio; },
      stop() { this.isPlaying = false; this.isPaused = false; },
    },
    timer: null, idleKey: `idle-${index}`, singKey: `sing-${index}`, width: 350, height: 330,
    box: {
      texture: `idle-${index}`,
      setTexture(value) { this.texture = value; return this; },
      setDisplaySize() { return this; },
    },
  }));
  let now = 0;
  let timers = [];
  scene.time = {
    delayedCall(delay, callback) {
      const timer = { at: now + delay, callback, removed: false, remove() { this.removed = true; } };
      timers.push(timer);
      return timer;
    },
    removeAllEvents() { timers = []; },
  };
  scene.buildSequence = () => [0, 1];
  function advance(ms) {
    const end = now + ms;
    let timer;
    while ((timer = timers.filter((item) => !item.removed && item.at <= end)
      .sort((a, b) => a.at - b.at)[0])) {
      now = timer.at;
      timer.removed = true;
      timer.callback();
      scene.update();
    }
    now = end;
    scene.update();
  }
  return { scene, advance };
}

for (const [label, round, lastBird, overlay] of [
  ['round victory', 2, 1, 'winRoundOverlay'],
  ['final victory', 4, 1, 'winOverlay'],
  ['mistake', 2, 2, 'loseOverlay'],
]) {
  test(`${label} waits for overlapping songs and ignores further input through the result screen`, () => {
    const { scene, advance } = fixture(round);
    scene.selectBird(0);
    assert.equal(scene.phase, 'input', 'Partial correct input remains available');
    scene.selectBird(lastBird);
    const inputIndex = scene.inputIndex;
    const plays = scene.birds.map((bird) => bird.voice.plays);
    assert.equal(scene.input.enabled, false, 'Pointer events cannot dismiss overlays or open the menu');
    assert.equal(scene.input.keyboard.enabled, false);

    for (let i = 0; i < 20; i += 1) scene.selectBird(i % 4);
    assert.equal(scene.inputIndex, inputIndex);
    assert.deepEqual(scene.birds.map((bird) => bird.voice.plays), plays);
    assert.equal(scene[overlay].visible, false);

    // Scene timers may finish before the audio context; duration alone is insufficient.
    advance(5000);
    assert.equal(scene[overlay].visible, false);
    scene.birds[lastBird].voice.stop();
    scene.update();
    assert.equal(scene[overlay].visible, false, 'The earlier, longer trill must also finish');
    scene.birds[0].voice.stop();
    scene.update();
    assert.equal(scene[overlay].visible, true);
    assert.ok(scene.birds.every((bird) => bird.box.texture === bird.idleKey));
    assert.equal(scene.advances, 0);

    scene.selectBird(3);
    assert.deepEqual(scene.birds.map((bird) => bird.voice.plays), plays);
    advance(99);
    assert.equal(scene[overlay].visible, true, 'Result keeps its full display duration after the songs');
    assert.equal(scene.input.enabled, false);
    advance(1);
    assert.equal(scene[overlay].visible, false);
    if (round === 4) {
      assert.equal(scene.advances, 1);
      scene.update();
      advance(1000);
      assert.equal(scene.advances, 1, 'Finish only once');
      return;
    }

    assert.equal(scene.round_number, lastBird === 1 ? 3 : 2);
    advance(100);
    assert.equal(scene.input.enabled, true, 'A new round or retry unlocks input');
    assert.equal(scene.input.keyboard.enabled, true);
    assert.equal(scene.phase, 'demo');
    scene.selectBird(3);
    assert.equal(scene.inputIndex, 0, 'Bird answers are still ignored during the demonstration');
    advance(700 + 5250 + 2250 + 100);
    assert.equal(scene.phase, 'input');
    scene.selectBird(0);
    assert.equal(scene.inputIndex, 1);
  });
}

test('an incorrect first answer cannot be corrected while its trill is playing', () => {
  const { scene, advance } = fixture();
  scene.selectBird(2);
  scene.selectBird(0);
  assert.equal(scene.inputIndex, 0);
  assert.equal(scene.birds[0].voice.plays, 0);
  advance(1000);
  assert.equal(scene.loseOverlay.visible, false);
  scene.birds[2].voice.stop();
  scene.update();
  assert.equal(scene.loseOverlay.visible, true);
});

test('no-audio mode still shows the result after the bird animation', () => {
  const { scene, advance } = fixture(2, false);
  scene.selectBird(0);
  scene.selectBird(1);
  advance(299);
  assert.equal(scene.winRoundOverlay.visible, false);
  advance(1);
  assert.equal(scene.winRoundOverlay.visible, true);
});

test('paused audio cannot prematurely reveal a result', () => {
  const { scene, advance } = fixture();
  scene.selectBird(2);
  scene.birds[2].voice.isPlaying = false;
  scene.birds[2].voice.isPaused = true;
  advance(1000);
  assert.equal(scene.loseOverlay.visible, false);
  scene.birds[2].voice.stop();
  scene.update();
  assert.equal(scene.loseOverlay.visible, true);
});

test('leaving or restarting the scene discards the pending result', () => {
  const { scene, advance } = fixture();
  scene.selectBird(2);
  scene.resetBirds();
  scene.phase = 'intro';
  advance(10000);
  assert.equal(scene.loseOverlay.visible, false);
  assert.equal(scene.activeHint, null);
});
