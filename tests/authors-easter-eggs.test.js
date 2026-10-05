import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { fixture } from './helpers/audio-fixture.js';

const composer = 'Екатерина Воронцова';
const curator = 'Евгений Скуковский';
const song = 'music/OTHERWORLDLY_SHADE.mp3';
const artistUrl = 'https://music.yandex.ru/artist/24975276?utm_source=web&utm_medium=copy_link';
const tick = () => new Promise((resolve) => setImmediate(resolve));

function authorsFixture({ cached = true, load, menuReady = Promise.resolve() } = {}) {
  const f = fixture();
  const links = [];
  const objects = [];
  const loads = [];
  const prefetches = [];
  const addBuffer = () => f.buffers.set(f.audio.getUrl(song), { path: song, duration: 10 });
  if (cached) addBuffer();
  f.window.open = (...args) => links.push(args);
  f.window.VN.scenes = {};
  f.window.VN.systems.Layout = { addBackground() {}, fill() {}, onLayout() {} };
  f.window.VN.systems.SceneAssets = {
    prefetch(scene, key) {
      prefetches.push(key);
      return key === 'MainMenuScene' ? menuReady : Promise.resolve();
    },
    queueFor: () => ({ ensure: (assets, options) => {
      loads.push({ assets, options });
      return load ? load() : Promise.resolve();
    } }),
  };
  const scope = vm.createContext({
    window: f.window,
    console: { warn: (...args) => f.warnings.push(args) },
    Phaser: { Scene: class {}, Scenes: { Events: { SHUTDOWN: 'shutdown' } } },
  });
  for (const file of ['data/start/startMenuData.js', 'scenes/authors/AuthorsScene.js']) {
    vm.runInContext(readFileSync(new URL('../public/resource/' + file, import.meta.url), 'utf8'), scope);
  }
  const authors = Object.assign(new f.window.VN.scenes.AuthorsScene(), f.scene('AuthorsScene'));
  const display = (x, y, text) => {
    const object = Object.assign(new EventEmitter(), {
      text,
      setOrigin() { return this; }, setDepth() { return this; },
      setDisplaySize() { return this; },
      setInteractive() { this.interactive = true; return this; },
      add() {},
    });
    objects.push(object);
    return object;
  };
  authors.add = { rectangle: display, image: display, text: display, container: display };
  authors.input = Object.assign(new EventEmitter(), { keyboard: new EventEmitter() });
  authors.scene = {
    bringToTop() {},
    stop: () => authors.events.emit('shutdown'),
    wake: (key) => { authors.wokenScene = key; },
  };
  authors.init();
  authors.create();
  for (const card of f.window.VN.data.startMenuData.credits) authors.buildCard(card, 0, 2);
  const nameText = (name) => objects.find((object) => object.text === name);
  const click = (name, count = 1) => {
    for (let i = 0; i < count; i++) {
      const pointer = { id: 0 };
      nameText(name).emit('pointerdown', pointer);
      nameText(name).emit('pointerup', pointer);
    }
  };
  return { ...f, authors, links, loads, prefetches, addBuffer, nameText, click };
}

test('each author needs five clicks; dragging and releases without a press do not count', async () => {
  const f = authorsFixture();
  assert.equal(f.nameText('Фёдор Чжан').interactive, undefined);
  f.click(composer, 4);
  f.click(curator, 4);
  assert.equal(f.links.length, 0);
  f.authors.dragMoved = true;
  f.click(composer);
  f.authors.dragMoved = false;
  f.nameText(composer).emit('pointerup', { id: 0 });
  f.nameText(composer).emit('pointerdown', { id: 0 });
  f.nameText(composer).emit('pointerout');
  f.nameText(composer).emit('pointerup', { id: 0 });
  assert.equal(f.links.length, 0);
  f.click(composer);
  assert.deepEqual(f.links, [[artistUrl, '_blank', 'noopener']], 'Link opens synchronously with the fifth click');
  f.click(curator);
  assert.deepEqual(f.links[1], ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', '_blank', 'noopener']);
  await tick();
});

test('the song replaces menu music once, respects music volume and restores the menu on completion', async () => {
  const f = authorsFixture();
  const menu = f.controller.fadeIn('music/a.mp3', { duration: 0, volume: 0.875 });
  f.click(composer, 5);
  await tick();
  const track = f.controller.current;
  assert.equal(track.path, song);
  assert.equal(track.source.loop, false);
  assert.equal(menu.source.stopAt, 0);
  f.advance(0);
  assert.equal(f.controller.tracks.size, 1);
  f.audio.saveSettings({ music: 25, ui: 50, voice: 50 });
  assert.equal(track.level.gain.at(0), 0.2);
  f.advance(10);
  assert.equal(track.ended, true);
  assert.equal(f.controller.current.path, 'music/a.mp3');
  assert.equal(f.controller.current.source.loop, true);
  assert.equal(f.controller.current.volume, 0.875);
  assert.equal(f.authors.easterEggPlayback, null);
  f.advance(30);
  assert.equal(f.controller.tracks.size, 1);
  assert.deepEqual(f.warnings, []);
});

for (const exit of ['back', 'escape', 'shutdown', 'destroy']) {
  test(`${exit} stops the song, restores menu music and removes stale callbacks`, async () => {
    const f = authorsFixture();
    f.controller.fadeIn('music/a.mp3', { duration: 0 });
    f.click(composer, 5);
    await tick();
    const track = f.controller.current;
    if (exit === 'back') f.authors.goBack();
    else if (exit === 'escape') f.authors.input.keyboard.emit('keydown', { key: 'Escape' });
    else f.authors.events.emit(exit);
    assert.equal(track.ended, true);
    const restored = f.controller.current;
    assert.equal(restored.path, 'music/a.mp3');
    f.advance(20);
    assert.equal(f.controller.current, restored);
    assert.equal(f.authors.events.listenerCount('destroy'), 0);
    if (exit === 'back' || exit === 'escape') assert.equal(f.authors.wokenScene, 'MainMenuScene');
  });
}

test('repeated activation keeps one song; reopening authors starts fresh click counters', async () => {
  const f = authorsFixture();
  f.controller.fadeIn('music/a.mp3', { duration: 0 });
  f.click(composer, 5);
  await tick();
  const track = f.controller.current;
  f.click(composer, 5);
  await tick();
  assert.equal(f.links.length, 2);
  assert.equal(f.controller.current, track);
  f.click(composer, 4);
  f.authors.goBack();
  f.authors.create();
  f.click(composer);
  await tick();
  assert.equal(f.links.length, 2);
  assert.equal(f.controller.current.path, 'music/a.mp3');
});

test('leaving during loading cancels playback even if authors is reopened before the download ends', async () => {
  let loaded;
  const f = authorsFixture({ cached: false, load: () => new Promise((resolve) => { loaded = resolve; }) });
  const menu = f.controller.fadeIn('music/a.mp3', { duration: 0 });
  f.click(composer, 5);
  assert.equal(f.links.length, 1);
  assert.equal(f.loads[0].options.priority, 1);
  f.authors.goBack();
  f.authors.create();
  f.addBuffer();
  loaded();
  await tick();
  assert.equal(f.controller.current, menu);
  f.click(composer, 5);
  await tick();
  assert.equal(f.controller.current.path, song);
});

test('failed audio loading preserves the menu and still opens the artist link', async () => {
  const f = authorsFixture({ cached: false });
  const menu = f.controller.fadeIn('music/a.mp3', { duration: 0 });
  f.click(composer, 5);
  await tick();
  assert.equal(f.links[0][0], artistUrl);
  assert.equal(f.controller.current, menu);
  assert.equal(menu.stopAt, Infinity);
  assert.equal(f.authors.easterEggPlayback, null);
  assert.equal(f.warnings.length, 1);
});

test('a late menu load finishes before the song and is restored afterwards', async () => {
  let menuLoaded;
  const menuReady = new Promise((resolve) => { menuLoaded = resolve; });
  const f = authorsFixture({ menuReady });
  menuReady.then(() => f.controller.fadeIn('music/a.mp3', { duration: 0 }));
  f.click(composer, 5);
  await tick();
  assert.equal(f.controller.current, null);
  menuLoaded();
  await tick();
  assert.equal(f.controller.current.path, song);
  f.advance(10);
  assert.equal(f.controller.current.path, 'music/a.mp3');
});

test('leaving authors never replaces music already started by another scene', async () => {
  const f = authorsFixture();
  f.controller.fadeIn('music/a.mp3', { duration: 0 });
  f.click(composer, 5);
  await tick();
  const other = f.controller.fadeIn('music/b.mp3', { duration: 0 });
  f.authors.goBack();
  f.advance(20);
  assert.equal(f.controller.current, other);
});
