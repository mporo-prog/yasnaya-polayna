import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import { fixture } from './helpers/audio-fixture.js';

const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);

function pauseFixture() {
  const f = fixture();
  f.window.VN.scenes = {};
  f.window.VN.data.sceneAudio = { PauseScene: { music: 'music/b.mp3' } };
  f.window.VN.data.pauseMenuData = { buttons: [] };
  f.window.VN.data.startMenuData = { title: 'Game' };
  f.window.VN.systems.Layout = { fill() {}, addBackground() {}, onLayout() {}, isCompact: () => false };
  const scope = vm.createContext({ window: f.window, Phaser: { Scene: class {} } });
  vm.runInContext(readFileSync(new URL('../public/resource/scenes/pause/PauseScene.js', import.meta.url), 'utf8'), scope);
  const pause = Object.assign(new f.window.VN.scenes.PauseScene(), f.scene('PauseScene'));
  const gameScene = { input: { enabled: false }, resumeVoiceIfNeeded() { this.resumedVoice = true; } };
  const actions = [];
  pause.scale = { width: 1920, height: 1080 };
  const display = () => ({
    setOrigin() { return this; }, setInteractive() { return this; }, on() { return this; },
  });
  pause.add = { rectangle: display, text: display, image: display, zone: display };
  pause.scene = {
    get: () => gameScene,
    stop(key) {
      actions.push(['stop', key]);
      if (!key) pause.events.emit('shutdown');
    },
    resume: (key) => actions.push(['resume', key]),
    sleep: () => pause.events.emit('sleep'),
    launch: (key) => actions.push(['launch', key]),
    start: (key) => actions.push(['start', key]),
  };
  pause.init({ returnSceneKey: 'StoryScene' });
  return { ...f, pause, gameScene, actions };
}

test('pause and settings play their own music; resume restores the game track and its volume', () => {
  const f = pauseFixture();
  const gameMusic = f.controller.fadeIn('music/a.mp3', { duration: 0, volume: 0.8 });
  gameMusic.setVolume(0.6);
  const gameSound = f.controller.playSound('voice_and_sound/line.mp3');
  f.pause.create();
  const pauseMusic = f.controller.current;
  assert.equal(pauseMusic.path, 'music/b.mp3');
  assert.equal(pauseMusic.source.loop, true);
  f.advance(2);
  assert.equal(gameMusic.ended, true);
  f.pause.openSettings();
  assert.equal(f.controller.current, pauseMusic);
  f.audio.saveSettings({ music: 25, ui: 50, voice: 50 });
  near(pauseMusic.level.gain.at(2), 0.2);
  f.pause.events.emit('wake');
  assert.equal(f.controller.current, pauseMusic);
  f.pause.resumeGame();
  assert.equal(f.controller.current.path, 'music/a.mp3');
  near(f.controller.current.level.gain.at(2), 0.12);
  assert.equal(f.controller.current.stopAt, Infinity);
  assert.equal(f.controller.effects.size, 1, 'Restoring music does not replay game effects');
  assert.equal(gameSound.ended, false);
  assert.equal(f.gameScene.input.enabled, true);
  assert.equal(f.gameScene.resumedVoice, true);
  f.advance(3);
  assert.equal(pauseMusic.ended, true);
  assert.equal(f.controller.tracks.size, 1);
  assert.deepEqual(f.warnings, []);
});

test('resuming a silent scene fades out pause music and remains silent', () => {
  const f = pauseFixture();
  f.pause.create();
  f.advance(2);
  f.pause.resumeGame();
  assert.equal(f.controller.current, null);
  f.advance(3);
  assert.equal(f.controller.tracks.size, 0);
});

test('leaving pause for the main menu stops pause music without restoring the game track', () => {
  const f = pauseFixture();
  f.controller.fadeIn('music/a.mp3', { duration: 0 });
  f.pause.create();
  f.advance(2);
  f.pause.goToMainMenu();
  assert.equal(f.controller.current, null);
  assert.deepEqual(f.actions, [['stop', undefined], ['stop', 'StoryScene'], ['start', 'MainMenuScene']]);
  f.advance(3);
  assert.equal(f.controller.tracks.size, 0);
  f.sceneAudio.enter(f.scene('MainMenuScene'), { music: 'music/c.mp3' });
  assert.equal(f.controller.current.path, 'music/c.mp3');
});

test('rapid pause reopen restores the latest track and leaves no stale shutdown listeners', () => {
  const f = pauseFixture();
  f.controller.fadeIn('music/a.mp3', { duration: 0 });
  f.pause.create();
  f.pause.resumeGame();
  assert.equal(f.pause.events.listenerCount('shutdown'), 0);
  f.controller.transitionTo({ path: 'music/c.mp3', loop: false, volume: 0.4 });
  f.pause.init({ returnSceneKey: 'GameScene1' });
  f.pause.create();
  f.pause.resumeGame();
  assert.equal(f.controller.current.path, 'music/c.mp3');
  assert.equal(f.controller.current.source.loop, false);
  near(f.controller.current.level.gain.at(0), 0.16);
  f.advance(1);
  assert.equal(f.controller.tracks.size, 1);
  assert.equal(f.pause.events.listenerCount('shutdown'), 0);
});
