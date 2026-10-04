/**
 * Общая громкость Phaser-звуков и нативных Web Audio узлов.
 * Пути для load/add/play задаются относительно resource/sound, например music/theme.mp3.
 */
(function () {
  const STORAGE_KEY = 'vn_audio_settings_v1';
  const DEFAULTS = Object.freeze({ music: 50, ui: 50, voice: 50 });
  const FOLDERS = Object.freeze({ music: 'music', ui: 'ui', voice_and_sound: 'voice' });
  const CATEGORY_GAIN = Object.freeze({ music: 0.8, ui: 1, voice: 1 });
  const soundRoot = new URL('../sound/', document.currentScript.src);
  const sounds = new Map();
  const gains = new Map();

  function normalize(values) {
    return Object.fromEntries(Object.entries(DEFAULTS).map(([category, fallback]) => {
      const value = values && values[category];
      return [category, typeof value === 'number' && Number.isFinite(value)
        ? Math.round(Math.max(0, Math.min(100, value))) : fallback];
    }));
  }

  function loadSettings() {
    try {
      return normalize(JSON.parse(localStorage.getItem(STORAGE_KEY)));
    } catch (error) {
      return { ...DEFAULTS };
    }
  }

  function resolve(path) {
    const url = new URL(path, soundRoot);
    const relative = url.href.startsWith(soundRoot.href) ? url.href.slice(soundRoot.href.length) : '';
    const folder = relative.split('/')[0];
    if (!Object.hasOwn(FOLDERS, folder) || !relative.slice(folder.length + 1).split(/[?#]/)[0]) {
      throw new Error('Аудиофайл должен находиться в music, ui или voice_and_sound внутри resource/sound.');
    }
    return { key: url.href, category: FOLDERS[folder] };
  }

  function normalizeBaseVolume(value = 1) {
    return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 1;
  }

  // Общие звуки интерфейса. SceneAssets загружает их вместе с аудио любой сцены.
  const UI_SOUNDS = Object.freeze({
    click: 'ui/interface_click.mp3',
    win: 'ui/ura_pobeda.mp3',
  });

  let settings = loadSettings();

  function volumeFor(entry) {
    return entry.baseVolume * CATEGORY_GAIN[entry.category] * settings[entry.category] / 100;
  }

  function applyVolume(sound, entry) {
    sound.setVolume(volumeFor(entry));
  }

  const AudioManager = {
    // Возвращаем копию: движение ползунков не меняет применённую громкость.
    getSettings() {
      return { ...settings };
    },

    saveSettings(values) {
      settings = normalize(values);
      sounds.forEach((entry, sound) => applyVolume(sound, entry));
      gains.forEach((entry, node) => {
        node.gain.setValueAtTime(volumeFor(entry), node.context.currentTime);
      });
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        return true;
      } catch (error) {
        // Даже при запрете localStorage настройки действуют до закрытия игры.
        return false;
      }
    },

    getCategory(path) {
      return resolve(path).category;
    },

    getUrl(path) {
      return resolve(path).key;
    },

    // Узел громкости категории отделён от узла фейда в MusicController.
    // Возвращает подписку, которую владелец освобождает после окончания звука.
    registerGain(path, node, volume = 1) {
      const entry = { category: resolve(path).category, baseVolume: normalizeBaseVolume(volume) };
      const apply = () => node.gain.setValueAtTime(
        volumeFor(entry), node.context.currentTime,
      );
      gains.set(node, entry);
      apply();
      return {
        setVolume(value) {
          if (!gains.has(node)) return;
          entry.baseVolume = normalizeBaseVolume(value);
          apply();
        },
        destroy() { gains.delete(node); },
      };
    },

    // Вызывать в preload(). Ключом служит полный URL, общий для всех сцен.
    load(scene, path) {
      const { key } = resolve(path);
      if (!scene.cache.audio.exists(key)) scene.load.audio(key, key);
      return key;
    },

    // Создаёт повторно используемый звук; воспроизведение начинается через sound.play().
    add(scene, path, config = {}) {
      const { key, category } = resolve(path);
      const entry = { category, baseVolume: normalizeBaseVolume(config.volume) };
      const sound = scene.sound.add(key, {
        ...config,
        volume: volumeFor(entry),
      });
      sounds.set(sound, entry);
      sound.once('destroy', () => sounds.delete(sound));
      return sound;
    },

    // Одноразовый звук удаляется после окончания; loop-звук удаляет его владелец.
    play(scene, path, config = {}) {
      const sound = this.add(scene, path, config);
      sound.once('complete', () => sound.destroy());
      sound.play();
      return sound;
    },

    UI_SOUNDS,

    // Звук интерфейса не должен ломать кнопку: если файл ещё не загружен
    // (например, на отдельной странице мини-игры), звук пропускается.
    playUi(scene, path, config = {}) {
      try {
        if (!scene?.cache?.audio?.exists(resolve(path).key)) return null;
        return this.play(scene, path, config);
      } catch (error) {
        console.warn('[AudioManager]', error.message);
        return null;
      }
    },

    // Нажатие любой кнопки интерфейса.
    click(scene) {
      return this.playUi(scene, UI_SOUNDS.click);
    },

    // Появление экрана «Игра пройдена!».
    win(scene) {
      return this.playUi(scene, UI_SOUNDS.win);
    },

    // Индивидуальная громкость 0–1 умножается на коэффициент и процент категории.
    setVolume(sound, volume) {
      const entry = sounds.get(sound);
      if (!entry) throw new Error('Звук не зарегистрирован в AudioManager.');
      entry.baseVolume = normalizeBaseVolume(volume);
      applyVolume(sound, entry);
    },
  };

  window.VN.systems.AudioManager = AudioManager;
})();
