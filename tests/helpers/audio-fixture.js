import { EventEmitter } from 'node:events';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Минимальная модель аудиочасов: проверки не зависят от таймеров Node/Phaser.
class Parameter {
  constructor() { this.events = []; }
  setValueAtTime(value, time) { this.events.push({ type: 'set', value, time }); }
  linearRampToValueAtTime(value, time) { this.events.push({ type: 'ramp', value, time }); }
  cancelScheduledValues(time) { this.events = this.events.filter((event) => event.time < time); }
  at(time) {
    let previous = { time: 0, value: 1 };
    for (const event of [...this.events].sort((a, b) => a.time - b.time)) {
      if (event.time > time) {
        if (event.type === 'ramp') {
          return previous.value + (event.value - previous.value)
            * (time - previous.time) / (event.time - previous.time);
        }
        break;
      }
      previous = event;
    }
    return previous.value;
  }
}

export function fixture() {
  const warnings = [];
  const window = { VN: { systems: {}, data: {} } };
  const scope = vm.createContext({
    window, URL, console: { warn: (...message) => warnings.push(message) },
    document: { currentScript: { src: 'https://example.test/yasnaya-polayna/resource/systems/AudioManager.js' } },
    localStorage: { getItem: () => null, setItem() {} },
  });
  for (const file of ['AudioManager', 'MusicController', 'SceneAudio']) {
    vm.runInContext(readFileSync(new URL(`../../public/resource/systems/${file}.js`, import.meta.url), 'utf8'), scope);
  }
  const nodes = [];
  const sources = [];
  const context = {
    currentTime: 0,
    state: 'running',
    destination: {},
    createGain() {
      const node = { context, gain: new Parameter(), disconnected: false,
        connect(destination) { this.destination = destination; },
        disconnect() { this.disconnected = true; } };
      nodes.push(node);
      return node;
    },
    createBufferSource() {
      const source = {
        disconnected: false,
        connect(destination) { this.destination = destination; },
        disconnect() { this.disconnected = true; },
        start(time) { this.startAt = time; },
        stop(time = context.currentTime) { this.stopAt = time; },
      };
      sources.push(source);
      return source;
    },
  };
  const buffers = new Map();
  const paths = ['music/a.mp3', 'music/b.mp3', 'music/c.mp3', 'ui/transition.mp3',
    'ui/screen.mp3', 'voice_and_sound/line.mp3'];
  const audio = window.VN.systems.AudioManager;
  for (const path of paths) buffers.set(audio.getUrl(path), { duration: 10, path });
  const game = { events: new EventEmitter() };
  const destination = {};
  const loads = [];
  const scene = (key = 'StoryScene', data = {}) => ({
    game, events: new EventEmitter(), storySceneIndex: 0, screenIndex: 0,
    sys: { settings: { key, data } },
    sound: { context, destination },
    cache: { audio: { get: (key) => buffers.get(key), exists: (key) => buffers.has(key) } },
    load: { audio: (key, url) => loads.push({ key, url }) },
  });
  const controller = window.VN.systems.MusicController.forScene(scene());
  function advance(time) {
    context.currentTime = time;
    for (const source of sources) {
      if (source.stopAt <= time || (!source.loop && source.startAt + source.buffer.duration <= time)) {
        source.onended?.();
      }
    }
  }
  return { window, audio, controller, context, nodes, sources, buffers, game,
    destination, scene, loads, warnings, advance, sceneAudio: window.VN.systems.SceneAudio };
}
