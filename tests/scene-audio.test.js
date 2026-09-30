import assert from 'node:assert/strict';
import test from 'node:test';
import { fixture } from './helpers/audio-fixture.js';

test('preload traverses scene and screen audio, deduplicates paths and uses the deployment base URL', () => {
  const f = fixture();
  f.buffers.clear();
  f.sceneAudio.preload(f.scene(), [{
    music: 'music/a.mp3', transitionSound: { path: 'ui/transition.mp3' },
    sounds: ['voice_and_sound/line.mp3'],
    screens: [{ music: 'music/a.mp3', sounds: ['ui/screen.mp3'] }],
  }, { music: 'music/a.mp3' }]);
  assert.equal(f.loads.length, 4);
  assert.ok(f.loads.every(({ key, url }) => key === url && url.startsWith('https://example.test/yasnaya-polayna/resource/sound/')));
});

test('screen voice lines are queued like other audio but are not auto-played by the scene session', () => {
  const f = fixture();
  f.buffers.clear();
  const config = {
    music: 'music/a.mp3',
    screens: [
      { voice: { path: 'voice_and_sound/line1.mp3', delay: 2, margin: 0.5 } },
      { voice: 'voice_and_sound/line2.mp3' },
      { voice: 'voice_and_sound/line1.mp3' },
    ],
  };
  assert.deepEqual([...f.sceneAudio.paths(config)].sort(),
    ['music/a.mp3', 'voice_and_sound/line1.mp3', 'voice_and_sound/line2.mp3']);
  f.sceneAudio.preload(f.scene(), config);
  assert.equal(f.loads.length, 3);
  f.buffers.clear();
  f.sceneAudio.enter(f.scene(), config);
  assert.equal(f.controller.effects.size, 0, 'StoryScene plays the voice itself to sync the text');
});

test('saved screen restores its inherited music without replaying previous screen effects; Back restores earlier music', () => {
  const f = fixture();
  const scene = f.scene();
  scene.screenIndex = 2;
  const session = f.sceneAudio.enter(scene, {
    music: 'music/a.mp3', sounds: ['voice_and_sound/line.mp3'],
    screens: [
      { sounds: ['ui/transition.mp3'] },
      { music: 'music/b.mp3', sounds: ['ui/screen.mp3'] },
      {},
    ],
  });
  assert.equal(f.controller.current.path, 'music/b.mp3');
  assert.deepEqual([...f.controller.effects].map((effect) => effect.path), ['voice_and_sound/line.mp3']);
  const sources = f.sources.length;
  session.showScreen(2);
  assert.equal(f.sources.length, sources, 'A redraw does not replay any audio');
  session.showScreen(0);
  assert.equal(f.controller.current.path, 'music/a.mp3');
  assert.equal(f.controller.effects.size, 2);
});

test('screen sounds are stopped on navigation; scene sounds, music and transition have distinct lifetimes', () => {
  const f = fixture();
  const scene = f.scene();
  const session = f.sceneAudio.enter(scene, {
    music: 'music/a.mp3', transitionSound: 'ui/transition.mp3',
    sounds: [{ path: 'voice_and_sound/line.mp3', loop: true }],
    screens: [{ sounds: [{ path: 'ui/screen.mp3', delay: 4 }] }, {}],
  });
  const oldMusic = f.controller.current;
  const screenSound = [...f.controller.effects].find((sound) => sound.path === 'ui/screen.mp3');
  session.showScreen(1);
  assert.equal(screenSound.ended, true);
  assert.equal(f.controller.effects.size, 1);
  const transition = f.controller.playTransition('ui/transition.mp3');
  scene.events.emit('shutdown');
  assert.equal(f.controller.effects.size, 1);
  assert.equal(transition.ended, false);
  assert.equal(oldMusic.ended, false);
  assert.equal(scene.events.listenerCount('destroy'), 0);
  const nextScene = f.scene('GameScene1');
  f.sceneAudio.enter(nextScene, { music: 'music/b.mp3' });
  assert.equal(f.controller.current.path, 'music/b.mp3');
  assert.equal(f.window.VN.systems.MusicController.forScene(nextScene), f.controller);
  assert.equal(oldMusic.source.stopAt, 1);
});

test('scene declarations and start parameters resolve independently; null stops, omitted music continues', () => {
  const f = fixture();
  f.window.VN.data.storyAudio = [{ music: 'music/a.mp3' }, { music: 'music/b.mp3' }];
  f.window.VN.data.sceneAudio = { GameScene1: { music: 'music/c.mp3' }, MainMenuScene: { music: null } };
  const story = f.scene();
  story.storySceneIndex = 1;
  f.sceneAudio.enter(story);
  assert.equal(f.controller.current.path, 'music/b.mp3');
  f.sceneAudio.enter(f.scene('SettingsScene'));
  assert.equal(f.controller.current.path, 'music/b.mp3');
  f.sceneAudio.enter(f.scene('GameScene1', { audio: { music: 'music/a.mp3' } }));
  assert.equal(f.controller.current.path, 'music/a.mp3');
  f.sceneAudio.enter(f.scene('MainMenuScene'));
  assert.equal(f.controller.current, null);
});

test('one missing sound does not break a scene or prevent other effects, explicit null overrides transition effect', () => {
  const f = fixture();
  const music = f.controller.fadeIn('music/a.mp3');
  f.sceneAudio.enter(f.scene(), {
    music: 'music/missing.mp3', transitionSound: 'ui/transition.mp3',
    sounds: ['ui/missing.mp3', 'voice_and_sound/line.mp3'],
    screens: [{ transitionSound: null }],
  });
  assert.equal(f.controller.current, music);
  assert.equal(f.controller.transitionSound, null);
  assert.equal(f.controller.effects.size, 1);
  assert.equal(f.warnings.length, 2);
});

test('active sound status includes delayed narration and excludes background music', () => {
  const f = fixture();
  const session = f.sceneAudio.enter(f.scene(), {
    music: 'music/a.mp3',
    sounds: [{ path: 'voice_and_sound/line.mp3', delay: 4 }],
    screens: [{ sounds: ['ui/screen.mp3'] }],
  });
  assert.equal(session.hasActiveSounds, true, 'Pending narration also blocks an early transition');
  f.advance(10);
  assert.equal(session.hasActiveSounds, true, 'A finished screen sound does not hide active scene narration');
  f.advance(14);
  assert.equal(session.hasActiveSounds, false);
  assert.equal(f.controller.tracks.size, 1, 'Looping music never blocks an instruction');
});
