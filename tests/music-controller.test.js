import assert from 'node:assert/strict';
import test from 'node:test';
import { fixture } from './helpers/audio-fixture.js';

const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);

test('fade in/out use audio-clock seconds, delay and current envelope; release all nodes', () => {
  const f = fixture();
  const track = f.controller.fadeIn('music/a.mp3', { duration: 4, delay: 1, volume: 0.8 });
  assert.equal(track.source.startAt, 1);
  near(track.fade.gain.at(0.5), 0);
  near(track.fade.gain.at(3), 0.5);
  near(track.level.gain.at(3), 0.4);
  f.advance(3);
  f.controller.fadeOut({ duration: 2, delay: 1 });
  near(track.fade.gain.at(3), 0.5);
  near(track.fade.gain.at(4), 0.5);
  near(track.fade.gain.at(5), 0.25);
  assert.equal(track.source.stopAt, 6);
  f.advance(6);
  assert.equal(f.controller.tracks.size, 0);
  assert.ok(f.nodes.every((node) => node.disconnected));
  assert.ok(track.source.disconnected);
});

test('crossfade has independent fade times and offsets; the new recording starts at its fade in', () => {
  const f = fixture();
  const a = f.controller.fadeIn('music/a.mp3', { duration: 0 });
  f.advance(5);
  const b = f.controller.crossfade('music/b.mp3', {
    fadeOutDuration: 2, fadeOutDelay: 1, fadeInDuration: 4, fadeInDelay: 0.5,
  });
  assert.equal(b.source.startAt, 5.5);
  assert.equal(a.source.stopAt, 8);
  near(a.fade.gain.at(5.5), 1);
  near(a.fade.gain.at(7), 0.5);
  near(b.fade.gain.at(7.5), 0.5);
  near(b.fade.gain.at(9.5), 1);
  assert.equal(b.fade.destination, f.destination, 'Global game mute/volume remain in the audio graph');
});

test('saving category volumes during a crossfade never resets the fade or unmutes zero', () => {
  const f = fixture();
  const a = f.controller.fadeIn('music/a.mp3', { duration: 0, volume: 0.8 });
  const effect = f.controller.playTransition({ path: 'ui/transition.mp3', volume: 0.6 });
  const voice = f.controller.playSound('voice_and_sound/line.mp3');
  const b = f.controller.crossfade('music/b.mp3', { fadeInDuration: 4, fadeOutDuration: 4 });
  f.advance(2);
  f.audio.saveSettings({ music: 0, ui: 25, voice: 100 });
  assert.equal(a.level.gain.at(2), 0);
  assert.equal(b.level.gain.at(2), 0);
  near(a.fade.gain.at(2), 0.5);
  near(b.fade.gain.at(2), 0.5);
  near(effect.level.gain.at(2), 0.15);
  near(voice.level.gain.at(2), 1);
  f.audio.saveSettings({ music: 50, ui: 25, voice: 100 });
  f.audio.saveSettings({ music: 50, ui: 25, voice: 100 });
  near(a.level.gain.at(2), 0.4);
  near(b.fade.gain.at(3), 0.75);
  assert.equal(a.source.stopAt, 4);
});

test('rapid scene changes cancel delayed music and do not extend existing fade tails', () => {
  const f = fixture();
  const a = f.controller.fadeIn('music/a.mp3', { duration: 0 });
  const b = f.controller.crossfade('music/b.mp3', { fadeOutDuration: 4, fadeInDelay: 3 });
  f.advance(1);
  const c = f.controller.crossfade('music/c.mp3', { fadeOutDuration: 10 });
  assert.equal(b.ended, true);
  assert.equal(b.source.stopAt, 1);
  near(a.fade.gain.at(1), 0.75);
  assert.equal(a.source.stopAt, 4);
  near(a.fade.gain.at(2.5), 0.375);
  f.advance(4);
  assert.equal(f.controller.tracks.size, 1);
  assert.equal(f.controller.current, c);
});

test('interrupting an active fade in continues from its current volume', () => {
  const f = fixture();
  const a = f.controller.fadeIn('music/a.mp3', { duration: 4 });
  f.advance(1);
  f.controller.crossfade('music/b.mp3', { fadeOutDuration: 2 });
  near(a.fade.gain.at(1), 0.25);
  near(a.fade.gain.at(2), 0.125);
  near(a.fade.gain.at(3), 0);
});

test('reusing the current track preserves playback; restart explicitly creates a source', () => {
  const f = fixture();
  const a = f.controller.fadeIn('music/a.mp3');
  f.advance(0.5);
  const again = f.controller.crossfade({ path: 'music/a.mp3', volume: 0.4 });
  assert.equal(again, a);
  near(a.level.gain.at(0.5), 0.2);
  near(a.fade.gain.at(1), 1);
  const restarted = f.controller.crossfade('music/a.mp3', { restart: true });
  assert.notEqual(restarted, a);
});

test('all declarative transition types, silence and zero duration work without timers', () => {
  const f = fixture();
  const a = f.controller.transitionTo('music/a.mp3', { type: 'fadein', duration: 0 });
  near(a.fade.gain.at(0), 1);
  f.advance(1);
  const b = f.controller.transitionTo('music/b.mp3', { type: 'fadeout', duration: 2, delay: 0.5 });
  assert.equal(a.source.stopAt, 3.5);
  assert.equal(b.source.startAt, 3.5);
  near(b.fade.gain.at(3.5), 1);
  f.advance(4);
  f.controller.transitionTo(null, { type: 'crossfade', fadeOutDuration: 0 });
  assert.equal(b.source.stopAt, 4);
  f.advance(4);
  assert.equal(f.controller.tracks.size, 0);
});

test('missing recordings or invalid durations do not stop the current music', () => {
  const f = fixture();
  const a = f.controller.fadeIn('music/a.mp3');
  for (const value of [-1, NaN, Infinity, '2']) {
    assert.throws(() => f.controller.crossfade('music/b.mp3', { fadeOutDuration: value }));
  }
  assert.throws(() => f.controller.crossfade('music/missing.mp3'));
  assert.throws(() => f.controller.transitionTo('music/b.mp3', { type: 'typo' }));
  assert.equal(f.controller.current, a);
  assert.equal(a.source.stopAt, undefined);
});

test('transition effect delay, category, replacement, natural end and game teardown', () => {
  const f = fixture();
  const first = f.controller.playTransition('ui/transition.mp3', { delay: 5 });
  const next = f.controller.playTransition('ui/transition.mp3', { delay: 1 });
  assert.equal(first.ended, true);
  assert.equal(next.source.startAt, 1);
  assert.equal(next.source.loop, false);
  f.advance(11);
  assert.equal(f.controller.effects.size, 0);
  const track = f.controller.fadeIn('music/a.mp3');
  f.controller.playSound('voice_and_sound/line.mp3', { loop: true });
  f.game.events.emit('destroy');
  assert.equal(track.ended, true);
  assert.equal(f.controller.effects.size, 0);
  assert.ok(f.nodes.every((node) => node.disconnected));
  const events = track.level.gain.events.length;
  f.audio.saveSettings({ music: 0, ui: 0, voice: 0 });
  assert.equal(track.level.gain.events.length, events, 'Ended nodes are unregistered from settings');
  assert.throws(() => f.controller.playSound('ui/transition.mp3'));
});
