import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { fixture as audioFixture } from './helpers/audio-fixture.js';

function displayObject() {
  const object = new EventEmitter();
  object.text = '';
  for (const method of ['setInteractive', 'disableInteractive', 'setDisplaySize', 'setAlpha', 'setY']) {
    object[method] = () => object;
  }
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
  f.game.getTime = () => now;
  const story = new f.window.VN.scenes.StoryScene();
  Object.assign(story, f.scene(), {
    time: { now },
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
  function start(index) {
    story.init({ storySceneIndex: index, screenIndex: 0 });
    story.create();
  }
  function tick(time) {
    now = time;
    story.time.now = time;
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
  return { ...f, story, start, tick, finishMinigame, savedScreens, setNow: (time) => { now = time; } };
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
