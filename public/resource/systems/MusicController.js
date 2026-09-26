/**
 * Переходы на Web Audio API. Все длительности и задержки — в секундах.
 * Один контроллер живёт всё время работы игры, независимо от сцен.
 */
(function () {
  const instances = new WeakMap();

  function seconds(value, fallback) {
    const result = value ?? fallback;
    if (!Number.isFinite(result) || result < 0) {
      throw new RangeError('Время аудиоперехода должно быть конечным числом >= 0.');
    }
    return result;
  }

  function descriptor(value) {
    return typeof value === 'string' ? { path: value } : value;
  }

  class MusicController {
    constructor({ context, destination = context.destination, getBuffer, audioManager = window.VN.systems.AudioManager }) {
      this.context = context;
      this.destination = destination;
      this.getBuffer = getBuffer;
      this.audio = audioManager;
      this.tracks = new Set();
      this.effects = new Set();
      this.current = null;
      this.transitionSound = null;
      this.destroyed = false;
    }

    // Phaser используется только как владелец контекста и кэша загрузчика.
    static forScene(scene) {
      let controller = instances.get(scene.game);
      if (!controller || controller.destroyed) {
        if (!scene.sound.context) throw new Error('Для музыкальных переходов требуется Web Audio API.');
        const audio = window.VN.systems.AudioManager;
        const cache = scene.cache.audio;
        controller = new MusicController({
          context: scene.sound.context,
          // Сохраняем также глобальные mute/volume Phaser.
          destination: scene.sound.destination,
          getBuffer: (path) => cache.get(audio.getUrl(path)),
          audioManager: audio,
        });
        instances.set(scene.game, controller);
        scene.game.events.once('destroy', () => controller.destroy());
      }
      return controller;
    }

    _create(value, collection, initialGain, startAt) {
      if (this.destroyed) throw new Error('MusicController уже уничтожен.');
      const config = descriptor(value);
      const buffer = this.getBuffer(config.path);
      if (!buffer) throw new Error('Аудиофайл не загружен: ' + config.path);
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.loop = config.loop ?? collection === this.tracks;
      const level = this.context.createGain();
      const fade = this.context.createGain();
      const volume = this.audio.registerGain(config.path, level, config.volume);
      fade.gain.setValueAtTime(initialGain, this.context.currentTime);
      source.connect(level);
      level.connect(fade);
      fade.connect(this.destination);
      const track = {
        path: config.path, source, level, fade, startAt, stopAt: Infinity, ended: false,
        envelope: { from: initialGain, to: initialGain, start: startAt, end: startAt },
        setVolume: (value) => volume.setVolume(value),
        stop: () => {
          if (track.ended) return;
          source.stop();
          release();
        },
      };
      const release = () => {
        if (track.ended) return;
        track.ended = true;
        collection.delete(track);
        if (this.current === track) this.current = null;
        if (this.transitionSound === track) this.transitionSound = null;
        source.onended = null;
        source.disconnect();
        level.disconnect();
        fade.disconnect();
        volume.destroy();
      };
      source.onended = release;
      collection.add(track);
      try {
        source.start(startAt);
      } catch (error) {
        release();
        throw error;
      }
      return track;
    }

    _valueAt(track, time) {
      const { from, to, start, end } = track.envelope;
      if (time < start) return from;
      if (time >= end) return to;
      return from + (to - from) * (time - start) / (end - start);
    }

    _ramp(track, target, start, end, now) {
      const param = track.fade.gain;
      const current = this._valueAt(track, now);
      // Вычисляем точное значение сами: работает и без cancelAndHoldAtTime.
      if (typeof param.cancelAndHoldAtTime === 'function') param.cancelAndHoldAtTime(now);
      else param.cancelScheduledValues(now);
      param.setValueAtTime(current, now);
      param.setValueAtTime(current, start);
      if (end > start) param.linearRampToValueAtTime(target, end);
      else param.setValueAtTime(target, end);
      track.envelope = { from: current, to: target, start, end };
    }

    _fadeOldTracks(except, duration, delay, now) {
      for (const track of this.tracks) {
        if (track === except) continue;
        // Отменённая сцена не должна запустить отложенный трек позднее.
        if (track.startAt > now || track.stopAt <= now) {
          track.stop();
          continue;
        }
        // Частые переходы не продлевают жизнь уже затухающих треков.
        const end = Math.min(now + delay + duration, track.stopAt);
        const start = Math.min(now + delay, end);
        this._ramp(track, 0, start, end, now);
        track.stopAt = end;
        track.source.stop(end);
      }
    }

    fadeOut({ duration = 1, delay = 0 } = {}) {
      duration = seconds(duration, 1);
      delay = seconds(delay, 0);
      this._fadeOldTracks(null, duration, delay, this.context.currentTime);
      this.current = null;
    }

    // Старый трек останавливается сразу; новый плавно появляется.
    fadeIn(path, { duration = 1, delay = 0, ...config } = {}) {
      return this.crossfade(path, {
        ...config, fadeOutDuration: 0, fadeOutDelay: 0,
        fadeInDuration: duration, fadeInDelay: delay,
      });
    }

    crossfade(value, options = {}) {
      const outDuration = seconds(options.fadeOutDuration, 1);
      const inDuration = seconds(options.fadeInDuration, 1);
      const outDelay = seconds(options.fadeOutDelay, 0);
      const inDelay = seconds(options.fadeInDelay, 0);
      const config = { ...descriptor(value), ...options };
      const now = this.context.currentTime;
      if (this.current && !this.current.ended && this.current.stopAt === Infinity
        && this.current.path === config.path && !config.restart
        && this.current.source.loop === (config.loop ?? true)) {
        this.current.setVolume(config.volume);
        return this.current;
      }
      // Проверка/создание нового источника прежде, чем трогать старую музыку.
      const next = this._create(config, this.tracks, 0, now + inDelay);
      this._ramp(next, 1, now + inDelay, now + inDelay + inDuration, now);
      this._fadeOldTracks(next, outDuration, outDelay, now);
      this.current = next;
      return next;
    }

    // Единая точка для декларативных параметров сцены.
    transitionTo(music, transition = {}) {
      const { type = 'crossfade', ...options } = transition;
      if (!['fadeout', 'fadein', 'crossfade'].includes(type)) {
        throw new Error('Неизвестный аудиопереход: ' + type);
      }
      if (music == null) {
        this.fadeOut({ duration: options.fadeOutDuration ?? options.duration ?? 1,
          delay: options.fadeOutDelay ?? options.delay ?? 0 });
        return null;
      }
      if (type === 'fadein') return this.fadeIn(music, options);
      if (type === 'fadeout') {
        const duration = seconds(options.duration, 1);
        const delay = seconds(options.delay, 0);
        // Затухание старого, затем запуск нового без плавного входа.
        return this.crossfade(music, { ...options, fadeOutDuration: duration,
          fadeOutDelay: delay, fadeInDuration: 0, fadeInDelay: delay + duration });
      }
      return this.crossfade(music, options);
    }

    playSound(value, options = {}) {
      const config = { ...descriptor(value), ...options };
      const delay = seconds(config.delay, 0);
      return this._create(config, this.effects, 1, this.context.currentTime + delay);
    }

    playTransition(value, options = {}) {
      // Короткий эффект перехода может пережить shutdown предыдущей сцены.
      const next = value == null ? null : this.playSound(value, { ...options, loop: false });
      this.transitionSound?.stop();
      this.transitionSound = next;
      return next;
    }

    stop() {
      for (const track of [...this.tracks, ...this.effects]) track.stop();
      this.current = null;
    }

    destroy() {
      if (this.destroyed) return;
      this.stop();
      this.destroyed = true;
      // Контекст принадлежит игре, закрывать его здесь нельзя.
    }
  }

  window.VN.systems.MusicController = MusicController;
})();
