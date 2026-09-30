import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../public/resource/systems/AudioManager.js', import.meta.url), 'utf8');
const storageKey = 'vn_audio_settings_v1';

function fixture(raw, options = {}) {
  const stored = new Map(raw === undefined ? [] : [[storageKey, raw]]);
  const window = { VN: { systems: {} } };
  vm.runInNewContext(source, {
    window, URL,
    document: { currentScript: { src: 'https://example.test/yasnaya-polayna/resource/systems/AudioManager.js' } },
    localStorage: {
      getItem(key) {
        if (options.blockRead) throw new Error('Storage unavailable');
        return stored.get(key) ?? null;
      },
      setItem(key, value) {
        if (options.blockWrite) throw new Error('Storage full');
        stored.set(key, value);
      },
    },
  });
  const loaded = [];
  const cached = new Set();
  const created = [];
  function scene() {
    return {
      cache: { audio: { exists: (key) => cached.has(key) } },
      load: { audio: (key, url) => loaded.push({ key, url }) },
      sound: {
        add(key, config) {
          const sound = new EventEmitter();
          Object.assign(sound, {
            key, config, volume: config.volume, destroyed: false, isPlaying: false,
            setVolume(value) {
              assert.equal(this.destroyed, false, 'Destroyed sounds must be unregistered');
              this.volume = this.config.volume = value;
            },
            play() { this.volume = this.config.volume; this.isPlaying = true; },
            pause() { this.isPlaying = false; },
            destroy() { this.destroyed = true; this.emit('destroy'); },
          });
          created.push(sound);
          return sound;
        },
      },
    };
  }
  return { manager: window.VN.systems.AudioManager, stored, loaded, cached, created, scene };
}

// Сравниваем копии из vm в текущем realm.
const settings = (manager) => ({ ...manager.getSettings() });

test('defaults are 50%; opening/editing a draft does not apply or persist it', () => {
  const f = fixture();
  assert.deepEqual(settings(f.manager), { music: 50, ui: 50, voice: 50 });
  f.manager.getSettings().music = 0;
  assert.equal(f.manager.getSettings().music, 50);
  assert.equal(f.stored.size, 0);
  assert.equal(f.loaded.length, 0);
  assert.equal(f.created.length, 0);
});

test('all files and nested folders use their category; base URL survives deployment in a subdirectory', () => {
  const f = fixture();
  for (const path of ['music/test_music.mp3', 'music/chapter 2/new.ogg', 'music/another.wav']) {
    assert.equal(f.manager.getCategory(path), 'music');
  }
  assert.equal(f.manager.getCategory('ui/any-file.mp3'), 'ui');
  assert.equal(f.manager.getCategory('voice_and_sound/scene/line.mp3'), 'voice');
  assert.equal(f.manager.getCategory('music/../ui/click.mp3'), 'ui');
  for (const path of ['music/', '../elsewhere.mp3', 'unknown/test.mp3', 'constructor/test.mp3']) {
    assert.throws(() => f.manager.getCategory(path));
  }
  const key = f.manager.load(f.scene(), 'music/chapter 2/new.ogg');
  assert.equal(key, 'https://example.test/yasnaya-polayna/resource/sound/music/chapter%202/new.ogg');
  assert.deepEqual(f.loaded, [{ key, url: key }]);
  f.cached.add(key);
  f.manager.load(f.scene(), 'music/chapter 2/new.ogg');
  assert.equal(f.loaded.length, 1);
});

test('saving applies independent linear volumes to every sound across scenes, including paused and future sounds', () => {
  const f = fixture();
  const music = f.manager.play(f.scene(), 'music/one.mp3');
  const quietMusic = f.manager.play(f.scene(), 'music/two.mp3', { volume: 0.4, loop: true });
  const ui = f.manager.play(f.scene(), 'ui/click.mp3');
  const voice = f.manager.play(f.scene(), 'voice_and_sound/line.mp3');
  assert.equal(music.volume, 0.5);
  assert.equal(quietMusic.volume, 0.2);
  voice.pause();

  assert.equal(f.manager.saveSettings({ music: 0, ui: 25, voice: 100 }), true);
  assert.deepEqual([music.volume, quietMusic.volume, ui.volume, voice.volume], [0, 0, 0.25, 1]);
  assert.equal(f.manager.play(f.scene(), 'ui/next.mp3').volume, 0.25);
  voice.play();
  assert.equal(voice.volume, 1);

  f.manager.saveSettings({ music: 50, ui: 50, voice: 50 });
  f.manager.saveSettings({ music: 50, ui: 50, voice: 50 });
  assert.equal(quietMusic.volume, 0.2, 'Saving twice must not multiply the already-scaled volume');
  f.manager.saveSettings({ music: 100, ui: 0, voice: 0 });
  assert.deepEqual([music.volume, quietMusic.volume, ui.volume, voice.volume], [1, 0.4, 0, 0]);
  f.manager.setVolume(quietMusic, 0.6);
  assert.equal(quietMusic.volume, 0.6);
});

test('saved values survive reload, preserve zero, and remain separate from story progress', () => {
  const f = fixture();
  f.stored.set('vn_save_v1', '{"storySceneIndex":3}');
  f.manager.saveSettings({ music: 0, ui: 73, voice: 100 });
  const next = fixture(f.stored.get(storageKey));
  assert.deepEqual(settings(next.manager), { music: 0, ui: 73, voice: 100 });
  assert.equal(next.manager.add(next.scene(), 'music/new.mp3').volume, 0);
  assert.equal(f.stored.get('vn_save_v1'), '{"storySceneIndex":3}');
});

test('invalid stored values are repaired per category and out-of-range numbers are clamped', () => {
  for (const raw of ['{broken', 'null', '[]', '17']) {
    assert.deepEqual(settings(fixture(raw).manager), { music: 50, ui: 50, voice: 50 });
  }
  const f = fixture('{"music":-20,"ui":140,"voice":"0"}');
  assert.deepEqual(settings(f.manager), { music: 0, ui: 100, voice: 50 });
  f.manager.saveSettings({ music: 33.6, ui: NaN, voice: Infinity });
  assert.deepEqual(settings(f.manager), { music: 34, ui: 50, voice: 50 });
});

test('unavailable storage does not prevent changing volume in the current game', () => {
  const f = fixture(undefined, { blockRead: true, blockWrite: true });
  const music = f.manager.play(f.scene(), 'music/one.mp3');
  assert.equal(f.manager.saveSettings({ music: 0, ui: 25, voice: 100 }), false);
  assert.equal(music.volume, 0);
  assert.deepEqual(settings(f.manager), { music: 0, ui: 25, voice: 100 });
});

test('finished one-shot and explicitly destroyed looping sounds are released', () => {
  const f = fixture();
  const click = f.manager.play(f.scene(), 'ui/click.mp3');
  click.emit('complete');
  assert.equal(click.destroyed, true);
  const loop = f.manager.play(f.scene(), 'music/loop.mp3', { loop: true });
  loop.destroy();
  f.manager.saveSettings({ music: 0, ui: 0, voice: 0 });
  assert.throws(() => f.manager.setVolume(loop, 0.5));
});
