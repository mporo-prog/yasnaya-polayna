import assert from 'node:assert/strict';
import test from 'node:test';
import { fixture as audioFixture } from './helpers/audio-fixture.js';

globalThis.Phaser = {
  Scene: class {},
  Scenes: { Events: { SHUTDOWN: 'shutdown' } },
  Utils: { Array: { Shuffle: (array) => array.reverse() } },
};
globalThis.window = { VN: { systems: {
  finishMinigameAndAdvance(scene) { scene.advances += 1; },
  SceneAudio: { enter() {} },
} } };
const { GameScene1 } = await import('../games/game1/GameScene1.js');

function fixture(round = 2, audio = true) {
  const scene = new GameScene1();
  scene.init({ hintDurationSeconds: 0.1 });
  Object.assign(scene, {
    phase: 'input', paused: false, completed: false, activeHint: null,
    input: { enabled: true, keyboard: { enabled: true } },
    inputIndex: 0, sequence: [0, 1], round_number: round, advances: 0,
    playedBirds: new Set(),
  });
  for (const name of ['introOverlay', 'repeatOverlay', 'loseOverlay', 'winOverlay']) {
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

function narratedIntroFixture(t, { blocked = false, sounds = ['voice_and_sound/line.mp3'] } = {}) {
  const f = fixture(2, false);
  const audio = audioFixture();
  const audioScene = audio.scene('GameScene1', { audio: { sounds } });
  const scene = f.scene;
  Object.assign(scene, {
    phase: 'intro',
    game: audioScene.game, events: audioScene.events,
    sound: audioScene.sound, cache: audioScene.cache, sys: audioScene.sys,
  });
  let resumeAllowed = !blocked;
  let resumeCalls = 0;
  audio.context.state = 'suspended';
  audio.context.resume = () => {
    resumeCalls += 1;
    if (resumeAllowed) audio.context.state = 'running';
  };
  scene.createOverlay = (text, onClick) => {
    scene.introOverlay.onClick = onClick;
    return scene.introOverlay;
  };
  t.mock.method(window.VN.systems.SceneAudio, 'enter', (owner) => {
    assert.equal(owner.introOverlay.visible, true, 'The instruction is visible when narration starts');
    return audio.sceneAudio.enter(owner);
  });
  scene.createIntroOverlay();
  return { ...f, audio, get resumeCalls() { return resumeCalls; },
    allowResume() { resumeAllowed = true; } };
}

test('first instruction starts narration immediately and waits for its actual end before starting birds', (t) => {
  const f = narratedIntroFixture(t);
  const { scene, audio, advance } = f;
  assert.equal(f.resumeCalls, 1, 'Unlock audio on the first instruction, not on startRound');
  assert.equal(audio.sources.length, 1);
  assert.equal(audio.sources[0].startAt, 0);
  assert.equal(audio.context.state, 'running');

  scene.introOverlay.onClick();
  advance(4000);
  assert.equal(scene.introOverlay.visible, true, 'Clicks and the old four-second timeout cannot skip narration');
  assert.equal(scene.phase, 'intro');
  assert.ok(scene.birds.every((bird) => bird.voice.plays === 0));

  audio.advance(9.99);
  scene.update();
  assert.equal(scene.introOverlay.visible, true);
  audio.advance(10);
  scene.update();
  assert.equal(scene.introOverlay.visible, false);
  assert.equal(scene.phase, 'demo');
  advance(699);
  assert.ok(scene.birds.every((bird) => bird.voice.plays === 0));
  advance(1);
  assert.equal(scene.birds[0].voice.plays, 1);

  scene.nextRound();
  scene.introOverlay.onClick();
  assert.equal(scene.phase, 'demo', 'The next round instruction can still be skipped');
  scene.restartRound();
  advance(100);
  assert.equal(scene.phase, 'demo', 'A retry uses the regular hint duration');
  assert.equal(audio.sources.length, 1, 'Later instruction displays never replay narration');
});

test('autoplay-blocked narration keeps the first instruction open until a click unlocks audio and it finishes', (t) => {
  const f = narratedIntroFixture(t, { blocked: true });
  const { scene, audio, advance } = f;
  advance(30000);
  assert.equal(scene.introOverlay.visible, true);
  assert.equal(scene.phase, 'intro');
  assert.equal(f.resumeCalls, 1, 'Waiting does not repeatedly request audio unlock');

  f.allowResume();
  scene.introOverlay.onClick();
  assert.equal(audio.context.state, 'running');
  assert.equal(scene.introOverlay.visible, true, 'The unlocking click cannot also dismiss the instruction');
  assert.equal(audio.sources.length, 1);
  audio.advance(10);
  scene.update();
  assert.equal(scene.phase, 'demo');
});

test('finishing narration while paused defers the instruction transition until the scene resumes', (t) => {
  const { scene, audio, advance } = narratedIntroFixture(t);
  advance(4000);
  scene.paused = true;
  audio.advance(10);
  scene.update();
  assert.equal(scene.introOverlay.visible, true);
  scene.paused = false;
  scene.update();
  assert.equal(scene.phase, 'demo');
});

test('missing narration does not trap the player on the first instruction', (t) => {
  const { scene, audio, advance } = narratedIntroFixture(t, { sounds: ['voice_and_sound/missing.mp3'] });
  assert.equal(audio.warnings.length, 1);
  advance(4000);
  assert.equal(scene.introOverlay.visible, false);
  assert.equal(scene.phase, 'demo');
});

test('leaving the first instruction cancels narration and cannot start the bird demonstration later', (t) => {
  const { scene, audio, advance } = narratedIntroFixture(t);
  scene.input.keyboard.on = () => {};
  scene.birds.forEach((bird) => { bird.voice.destroy = () => {}; });
  scene.setupInput();
  advance(4000);
  scene.events.emit('shutdown');
  assert.equal(scene.activeHint, null);
  assert.equal(audio.controller.effects.size, 0);
  audio.advance(10);
  advance(10000);
  assert.equal(scene.phase, 'intro');
  assert.ok(scene.birds.every((bird) => bird.voice.plays === 0));
});

for (const [label, round, lastBird, overlay] of [
  ['round victory', 2, 1, 'introOverlay'],
  ['final victory', 3, 1, 'winOverlay'],
  ['mistake', 2, 2, 'loseOverlay'],
]) {
  test(`${label} waits for overlapping songs and unlocks input when the result appears`, () => {
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
    assert.equal(scene.input.enabled, true, 'The visible result can be dismissed by clicking');
    assert.equal(scene.input.keyboard.enabled, true);
    assert.ok(scene.birds.every((bird) => bird.box.texture === bird.idleKey));
    assert.equal(scene.advances, 0);
    if (lastBird === 1 && round === 2) {
      assert.equal(scene.round_number, 3, 'The next round starts without a round-victory screen');
    }

    scene.selectBird(3);
    assert.deepEqual(scene.birds.map((bird) => bird.voice.plays), plays);
    advance(99);
    assert.equal(scene[overlay].visible, true, 'Result keeps its full display duration after the songs');
    assert.equal(scene.input.enabled, true);
    advance(1);
    if (round === 3) {
      advance(6899);
      assert.equal(scene[overlay].visible, true, 'The victory fact stays open for seven seconds');
      assert.equal(scene.advances, 0);
      advance(1);
      assert.equal(scene[overlay].visible, false);
      assert.equal(scene.advances, 1);
      scene.update();
      advance(1000);
      assert.equal(scene.advances, 1, 'Finish only once');
      return;
    }
    assert.equal(scene[overlay].visible, false);

    assert.equal(scene.round_number, lastBird === 1 ? 3 : 2);
    advance(100);
    assert.equal(scene.input.enabled, true, 'A new round or retry keeps input enabled');
    assert.equal(scene.input.keyboard.enabled, true);
    assert.equal(scene.phase, 'demo');
    scene.selectBird(3);
    assert.equal(scene.inputIndex, 0, 'Bird answers are still ignored during the demonstration');
    advance(700 + 5250 + 2250 + 100);
    assert.equal(scene.phase, 'input');
    scene.selectBird(0);
    assert.equal(scene.inputIndex, 1);
  });

  test(`${label} can be dismissed before its timer expires`, () => {
    const { scene, advance } = fixture(round, false);
    scene.selectBird(0);
    scene.selectBird(lastBird);
    advance(300);
    assert.equal(scene[overlay].visible, true);
    assert.equal(scene.input.enabled, true);

    scene.dismissHint();
    assert.equal(scene[overlay].visible, false);
    if (round === 3) {
      assert.equal(scene.advances, 1);
      advance(1000);
      assert.equal(scene.advances, 1, 'The cancelled hint timer cannot finish the game again');
      return;
    }

    assert.equal(scene.round_number, lastBird === 1 ? 3 : 2);
    if (lastBird !== 1) {
      assert.equal(scene.introOverlay.visible, true);
      assert.equal(scene.input.enabled, true, 'The next hint can also be skipped immediately');
      scene.dismissHint();
    }
    assert.equal(scene.introOverlay.visible, false);
    assert.equal(scene.phase, 'demo');
    scene.selectBird(3);
    assert.equal(scene.inputIndex, 0, 'Skipping a hint does not enable answers during the demonstration');
    advance(100);
    assert.equal(scene.phase, 'demo');
    assert.equal(scene.demoStep, 0, 'Cancelled hint timers do not advance the demonstration');
    assert.equal(scene.round_number, lastBird === 1 ? 3 : 2);
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
  assert.equal(scene.introOverlay.visible, false);
  advance(1);
  assert.equal(scene.introOverlay.visible, true);
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

function permutations(values) {
  if (values.length === 0) return [[]];
  return values.flatMap((value, index) =>
    permutations(values.filter((_, i) => i !== index)).map((rest) => [value, ...rest]));
}

test('two rounds cover every bird without duplicates for every bird ordering', (t) => {
  const orders = permutations([0, 1, 2, 3]);
  let order;
  t.mock.method(Phaser.Utils.Array, 'Shuffle', (array) =>
    array.sort((a, b) => order.indexOf(a) - order.indexOf(b)));

  for (const firstOrder of orders) {
    for (const secondOrder of orders) {
      const { scene, advance } = fixture(2, false);
      delete scene.buildSequence;
      const rounds = [];

      for (order of [firstOrder, secondOrder]) {
        if (rounds.length === 0) scene.startRound();
        else scene.dismissHint();
        const sequence = [...scene.sequence];
        rounds.push(sequence);
        assert.equal(sequence.length, rounds.length + 1);
        assert.equal(new Set(sequence).size, sequence.length, 'No bird repeats within a round');
        assert.ok(sequence.every((index) => index >= 0 && index < scene.birds.length));
        advance(700 + sequence.length * 750 + 100);
        assert.equal(scene.phase, 'input');
        for (const index of sequence) scene.selectBird(index);
        advance(300);
        if (rounds.length === 2) scene.dismissHint();
      }

      assert.equal(new Set(rounds.flat()).size, 4, 'All four birds sing across the two rounds');
      assert.equal(scene.advances, 1, 'The scene finishes immediately after the three-bird round');
      assert.equal(scene.round_number, 3, 'There is no four-bird round');
    }
  }
});

test('failed attempts do not replace the birds required for the two successful rounds', () => {
  const { scene, advance } = fixture(2, false);
  delete scene.buildSequence;

  function failAndRetry() {
    advance(700 + scene.sequence.length * 750 + 100);
    scene.selectBird((scene.sequence[0] + 1) % scene.birds.length);
    advance(300);
    assert.equal(scene.loseOverlay.visible, true);
    scene.dismissHint();
    scene.dismissHint();
    assert.equal(scene.phase, 'demo');
  }

  scene.startRound();
  failAndRetry();
  assert.equal(scene.playedBirds.size, 0, 'A failed first round does not count towards coverage');

  advance(700 + scene.sequence.length * 750 + 100);
  const firstRound = [...scene.sequence];
  for (const index of firstRound) scene.selectBird(index);
  advance(300);
  scene.dismissHint();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    failAndRetry();
    assert.deepEqual([...scene.playedBirds], firstRound);
    assert.equal(scene.sequence.length, 3);
    assert.equal(new Set(scene.sequence).size, 3);
    assert.equal(new Set([...firstRound, ...scene.sequence]).size, 4);
  }
});
