import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { fixture as audioFixture } from './helpers/audio-fixture.js';

function displayObject() {
  const object = new EventEmitter();
  object.text = '';
  for (const method of ['setInteractive', 'disableInteractive', 'setDisplaySize', 'setY']) {
    object[method] = () => object;
  }
  object.setAlpha = (alpha) => { object.alpha = alpha; return object; };
  object.setVisible = (visible) => { object.visible = visible; return object; };
  object.setText = (text) => { object.text = text; return object; };
  object.getWrappedText = (text) => [text];
  return object;
}

function fixture() {
  const f = audioFixture();
  f.window.VN.scenes = {};
  const savedScreens = [];
  Object.assign(f.window.VN.systems, {
    GameState: {
      state: {}, save() {}, addHistoryEntry() {}, markMinigameCompleted() {},
      goToScreen: (...screen) => savedScreens.push(screen),
    },
    SceneAssets: { prefetchNext() {} },
    Layout: { onLayout() {} },
  });
  const scope = vm.createContext({
    window: f.window,
    console: { warn: (...message) => f.warnings.push(message) },
    document: { addEventListener() {}, removeEventListener() {} },
    Phaser: {
      Scene: class {}, Scenes: { Events: { SHUTDOWN: 'shutdown' } },
      Math: { Clamp: (value, min, max) => Math.min(max, Math.max(min, value)) },
    },
  });
  for (const file of [
    'data/story/storyLines', 'data/story/storyHistoryTexts', 'data/story/storyBackgrounds',
    'data/story/storyAudio', 'systems/minigameFlow', 'scenes/story/StoryScene',
  ]) {
    vm.runInContext(readFileSync(new URL(`../public/resource/${file}.js`, import.meta.url), 'utf8'), scope);
  }
  f.window.VN.data.getGlossaryLinksFor = () => [];
  for (const path of f.sceneAudio.paths(f.window.VN.data.storyAudio)) {
    f.buffers.set(f.audio.getUrl(path), { duration: 10, path });
  }

  let now = 1000;
  const timers = new Set();
  f.game.getTime = () => now;
  const story = new f.window.VN.scenes.StoryScene();
  Object.assign(story, f.scene(), {
    time: { now, delayedCall(delay, callback) {
      const timer = { remaining: delay, paused: false, callback, remove() { timers.delete(timer); } };
      timers.add(timer);
      return timer;
    } },
    add: { container: () => ({}), image: displayObject },
    panelBg: displayObject(), speakerNameText: displayObject(),
    dialogueText: displayObject(), dialogueRevealedText: displayObject(),
    backBtn: { bg: displayObject() },
  });
  // Only the visual construction is stubbed; lifecycle, rendering, audio and navigation are real.
  for (const method of ['buildBackgroundLayer', 'buildCharacterLayer', 'buildBottomBar',
    'buildNavButtons', 'buildTopButtons', 'buildHistoryOverlay', 'buildGlossaryOverlay',
    'setBackground', 'setCharacter', 'buildGlossaryWordOverlays']) {
    story[method] = () => {};
  }
  const backgrounds = [];
  story.setBackground = (path) => { backgrounds.push(path); };
  story.setCharacter = (name) => { story.characterName = name; };
  function start(index, screenIndex = 0) {
    story.init({ storySceneIndex: index, screenIndex });
    story.create();
  }
  function tick(time) {
    const delta = time - now;
    now = time;
    story.time.now = time;
    for (const timer of [...timers]) {
      if (timer.paused) continue;
      timer.remaining -= delta;
      if (timer.remaining <= 0) {
        timers.delete(timer);
        timer.callback();
      }
    }
    story.update(time);
  }
  function finishMinigame(index) {
    f.window.VN.systems.finishMinigameAndAdvance({
      scene: { start(key, data) {
        assert.equal(key, 'StoryScene');
        story.init(data);
        story.create();
      } },
    }, index, `story_${index + 1}_minigame`);
  }
  return { ...f, story, start, tick, finishMinigame, savedScreens, backgrounds, setNow: (time) => { now = time; } };
}

test('story 2 opens with the visitor and advances after two seconds despite active audio', () => {
  const f = fixture();
  f.start(1);
  assert.equal(f.story.characterName, 'ПОСЕТИТЕЛЬ');
  assert.equal(f.story.panelBg.alpha, 0);
  assert.equal(f.story.speakerNameText.text, '');
  const introVoice = f.story.voiceTrack;
  f.tick(2999);
  assert.equal(f.story.screenIndex, 0);
  assert.equal(f.story.voiceActive, true);
  f.tick(3000);
  assert.equal(f.story.screenIndex, 1);
  assert.deepEqual(f.savedScreens.at(-1), [1, 1]);
  assert.notEqual(f.story.voiceTrack, introVoice);
  f.tick(6000);
  assert.equal(f.story.screenIndex, 1, 'The intro timer must only advance once');
});

test('story 2 screen 12 changes road2 to house after two seconds without restarting the screen', () => {
  const f = fixture();
  f.start(1, 11);
  const voice = f.story.voiceTrack;
  assert.equal(f.backgrounds.at(-1), 'images/backgrounds/road2.png');
  f.tick(2999);
  assert.equal(f.backgrounds.length, 1);
  f.tick(3000);
  assert.deepEqual(f.backgrounds, ['images/backgrounds/road2.png', 'images/backgrounds/house.png']);
  assert.equal(f.story.screenIndex, 11);
  assert.equal(f.savedScreens.length, 1);
  assert.equal(f.story.voiceTrack, voice, 'Changing the background preserves the current audio');
  f.story.goNext();
  assert.equal(f.story.screenIndex, 12, 'After the timed change, one click advances');
});

test('an early click on screen 12 changes the background; the second advances and cancels the timer', () => {
  const f = fixture();
  f.start(1, 11);
  f.tick(1500);
  f.story.goNext();
  assert.equal(f.backgrounds.at(-1), 'images/backgrounds/house.png');
  assert.equal(f.story.screenIndex, 11);
  f.story.goNext();
  assert.equal(f.story.screenIndex, 12);
  f.tick(4000);
  assert.equal(f.story.screenIndex, 12);
  assert.deepEqual(f.backgrounds, [
    'images/backgrounds/road2.png', 'images/backgrounds/house.png', 'images/backgrounds/hat.png',
  ]);
});

test('screen 12 advances automatically two seconds after the timed background change', () => {
  const f = fixture();
  f.start(1, 11);
  f.tick(3000);
  assert.equal(f.story.screenIndex, 11);
  assert.equal(f.backgrounds.at(-1), 'images/backgrounds/house.png');
  f.tick(4999);
  assert.equal(f.story.screenIndex, 11);
  f.tick(5000);
  assert.equal(f.story.screenIndex, 12);
  assert.deepEqual(f.savedScreens.at(-1), [1, 12]);
  assert.equal(f.backgrounds.at(-1), 'images/backgrounds/hat.png');
  f.tick(9000);
  assert.equal(f.story.screenIndex, 12, 'The timer must only advance once');
});

test('an early background change starts a fresh two-second countdown to the next screen', () => {
  const f = fixture();
  f.start(1, 11);
  f.tick(1500);
  f.story.goNext();
  f.tick(3000);
  assert.equal(f.story.screenIndex, 11);
  assert.equal(f.backgrounds.length, 2);
  f.tick(3499);
  assert.equal(f.story.screenIndex, 11);
  f.tick(3500);
  assert.equal(f.story.screenIndex, 12);
});

test('back and shutdown cancel the auto-advance after the background has changed', () => {
  for (const exit of ['back', 'shutdown']) {
    const f = fixture();
    f.start(1, 11);
    f.tick(3000);
    if (exit === 'back') f.story.goBack();
    else f.story.events.emit('shutdown');
    const screen = f.story.screenIndex;
    const backgroundCount = f.backgrounds.length;
    f.tick(6000);
    assert.equal(f.story.screenIndex, screen);
    assert.equal(f.backgrounds.length, backgroundCount);
  }
});

test('back cancels the background timer and returning to screen 12 starts again from road2', () => {
  const f = fixture();
  f.start(1, 11);
  f.tick(1500);
  f.story.goBack();
  f.tick(4000);
  assert.equal(f.story.screenIndex, 10);
  assert.ok(!f.backgrounds.includes('images/backgrounds/house.png'));
  f.story.goNext();
  assert.equal(f.story.screenIndex, 11);
  assert.equal(f.backgrounds.at(-1), 'images/backgrounds/road2.png');
  f.tick(5999);
  assert.equal(f.backgrounds.at(-1), 'images/backgrounds/road2.png');
  f.tick(6000);
  assert.equal(f.backgrounds.at(-1), 'images/backgrounds/house.png');
});

test('leaving the scene cancels both kinds of screen timer', () => {
  for (const screenIndex of [0, 11]) {
    const f = fixture();
    f.start(1, screenIndex);
    f.story.events.emit('shutdown');
    f.tick(5000);
    assert.equal(f.story.screenIndex, screenIndex);
    assert.equal(f.backgrounds.length, 1);
  }
});

for (const screenIndex of [0, 11]) {
  test(`history suspends auto-advance on screen ${screenIndex + 1} and closing it continues the remaining delay`, () => {
    const f = fixture();
    f.start(1, screenIndex);
    if (screenIndex === 11) f.story.goNext();
    Object.assign(f.story, {
      historyContainer: displayObject(), historyBtn: { bg: displayObject() },
      historyText: displayObject(), setHistoryScroll() {},
    });
    f.window.VN.systems.GameState.getFullHistory = () => [];
    f.tick(2000);
    f.story.toggleHistory();
    f.tick(10000);
    assert.equal(f.story.screenIndex, screenIndex);
    f.story.toggleHistory();
    f.tick(10999);
    assert.equal(f.story.screenIndex, screenIndex);
    f.tick(11000);
    assert.equal(f.story.screenIndex, screenIndex + 1);
  });
}

for (const game of [2, 3, 4, 5]) {
  test(`game${game} -> story ${game + 1}: reused scene animates its first line after a long minigame`, () => {
    const f = fixture();
    f.start(game - 1);
    f.tick(2000);
    f.story.events.emit('shutdown');
    f.setNow(120000); // Phaser's scene clock stays at 2000 until the next scene update.
    f.finishMinigame(game - 1);
    const { story } = f;
    assert.equal(story.screenIndex, 0);
    assert.equal(story.dialogueRevealedText.text, '');
    f.tick(120016);
    assert.equal(story.voiceActive, true);
    assert.notEqual(story.dialogueRevealedText.text, story.voiceFullText);
    f.tick(125000);
    assert.equal(story.dialogueRevealedText.text, story.voiceRevealText.slice(0, Math.floor(story.voiceRevealText.length / 2)));
    f.tick(130000);
    assert.equal(story.dialogueRevealedText.text, story.voiceFullText);
    assert.equal(story.voiceActive, false);
    assert.deepEqual(f.savedScreens.at(-1), [game, 0]);
    assert.deepEqual(f.warnings, []);
  });
}

test('cold story entry after loading also uses current game time, preserving voice delay and margin', () => {
  const f = fixture();
  f.setNow(120000);
  f.start(0); // First line: 4 second delay, 1 second margin, 10 second test buffer.
  f.tick(123999);
  assert.equal(f.story.dialogueRevealedText.text, '');
  assert.equal(f.story.voiceActive, true);
  f.tick(126500);
  assert.equal(f.story.dialogueRevealedText.text.length, Math.floor(f.story.voiceRevealText.length / 2));
  f.tick(129000);
  assert.equal(f.story.dialogueRevealedText.text, f.story.voiceFullText);
});

test('release from game4 cannot skip the first dialogue; a new click reveals it, then advances', () => {
  const f = fixture();
  f.start(4);
  const pointer = { id: 0 };
  const button = f.story.makeIconButton(0, 0, 'next', () => f.story.goNext()).bg;
  button.emit('pointerup', pointer); // Press began on the minigame's victory overlay.
  assert.equal(f.story.voiceActive, true);
  assert.equal(f.story.dialogueRevealedText.text, '');
  assert.equal(f.story.screenIndex, 0);
  button.emit('pointerdown', pointer);
  button.emit('pointerup', pointer);
  assert.equal(f.story.screenIndex, 0);
  assert.equal(f.story.dialogueRevealedText.text, f.story.voiceFullText);
  assert.equal(f.story.voiceActive, false);
  button.emit('pointerup', pointer);
  assert.equal(f.story.screenIndex, 0, 'A release must not reuse an earlier press');
  button.emit('pointerdown', pointer);
  button.emit('pointerup', pointer);
  assert.equal(f.story.screenIndex, 1);
  assert.equal(f.story.voiceActive, true);
});

test('release from another scene cannot advance a line whose animation already ended', () => {
  const f = fixture();
  f.start(4);
  f.tick(11000);
  const button = f.story.makeIconButton(0, 0, 'next', () => f.story.goNext()).bg;
  button.emit('pointerup', { id: 0 });
  assert.equal(f.story.screenIndex, 0);
});

test('dragging off a story button cancels its click; a different touch cannot finish it', () => {
  const f = fixture();
  let clicks = 0;
  const button = f.story.makeIconButton(0, 0, 'next', () => clicks++).bg;
  const pointer = { id: 0 };
  button.emit('pointerdown', pointer);
  button.emit('pointerout', pointer);
  button.emit('pointerup', pointer);
  assert.equal(clicks, 0);
  button.emit('pointerdown', pointer);
  button.emit('pointerup', { id: 1 });
  assert.equal(clicks, 0);
  button.emit('pointerdown', pointer);
  button.emit('pointerup', pointer);
  assert.equal(clicks, 1);
});

test('pause resume restarts the current voice on the next frame; back still reveals instantly', () => {
  const f = fixture();
  f.start(2);
  f.tick(3000);
  f.story.voiceInterruptedByOverlay = f.story.voiceActive;
  f.story.stopVoice();
  f.story.resumeVoiceIfNeeded();
  f.tick(120000);
  assert.equal(f.story.voiceActive, true);
  assert.equal(f.story.dialogueRevealedText.text, '');
  f.story.goNext();
  assert.equal(f.story.screenIndex, 0);
  f.story.goNext();
  assert.equal(f.story.screenIndex, 1);
  f.story.goBack();
  assert.equal(f.story.screenIndex, 0);
  assert.equal(f.story.voiceActive, false);
  assert.equal(f.story.dialogueRevealedText.text, f.story.currentLines[0].text);
});
