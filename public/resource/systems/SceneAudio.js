/** Аудиопараметры сцен и экранов. Музыка общая, обычные звуки принадлежат сцене. */
(function () {
  const sessions = new WeakMap();
  const owns = (value, key) => Object.hasOwn(value, key);
  const asSound = (value) => typeof value === 'string' ? { path: value } : value;

  const SceneAudio = {
    getConfig(scene) {
      const passed = scene.sys.settings.data?.audio;
      if (passed !== undefined) return passed ?? {};
      if (scene.sys.settings.key === 'StoryScene') {
        return window.VN.data.storyAudio?.[scene.storySceneIndex] ?? {};
      }
      return window.VN.data.sceneAudio?.[scene.sys.settings.key] ?? {};
    },

    // Вызывать в preload. Один и тот же путь ставится в очередь только один раз.
    preload(scene, config = this.getConfig(scene)) {
      const paths = new Set();
      const visit = (cue) => {
        if (!cue) return;
        for (const value of [cue.music, cue.transitionSound, ...(cue.sounds ?? [])]) {
          if (value) paths.add(asSound(value).path);
        }
        for (const screen of cue.screens ?? []) visit(screen);
      };
      for (const item of Array.isArray(config) ? config : [config]) visit(item);
      for (const path of paths) window.VN.systems.AudioManager.load(scene, path);
    },

    // Вызывать в create. Для сюжетных экранов затем вызывать showScreen(index).
    enter(scene, config = this.getConfig(scene)) {
      config = config ?? {};
      sessions.get(scene)?.destroy();
      let controller;
      const run = (action) => {
        try {
          return action();
        } catch (error) {
          // Ошибка одного файла не мешает сюжету, остальным звукам и старой музыке.
          console.warn('[SceneAudio]', error.message);
          return null;
        }
      };
      controller = run(() => window.VN.systems.MusicController.forScene(scene));
      const sceneSounds = [];
      const screenSounds = [];
      let lastScreen = null;
      let destroyed = false;
      const stop = (sounds) => { for (const sound of sounds.splice(0)) sound.stop(); };
      const play = (values, sounds) => {
        if (!controller) return;
        for (const value of values ?? []) {
          const sound = run(() => controller.playSound(value));
          if (sound) sounds.push(sound);
        }
      };
      const apply = (cue) => {
        if (!controller) return;
        if (owns(cue, 'music')) run(() => controller.transitionTo(cue.music, cue.transition));
        run(() => controller.playTransition(cue.transitionSound ?? null));
      };
      const session = {
        showScreen(index) {
          if (destroyed || lastScreen === index) return;
          const first = lastScreen === null;
          const screen = config.screens?.[index] ?? {};
          const cue = { ...config, ...screen };
          // Вход из сохранения и Back восстанавливают музыку нужного экрана,
          // не проигрывая эффекты всех пропущенных экранов.
          for (let i = 0; i <= index; i++) {
            const previous = config.screens?.[i];
            if (previous && owns(previous, 'music')) cue.music = previous.music;
          }
          cue.transitionSound = owns(screen, 'transitionSound')
            ? screen.transitionSound : (first ? config.transitionSound : null);
          stop(screenSounds);
          apply(cue);
          if (first) play(config.sounds, sceneSounds);
          play(screen.sounds, screenSounds);
          lastScreen = index;
        },
        destroy() {
          if (destroyed) return;
          destroyed = true;
          stop(sceneSounds);
          stop(screenSounds);
          scene.events.off('shutdown', session.destroy);
          scene.events.off('destroy', session.destroy);
          sessions.delete(scene);
        },
      };
      sessions.set(scene, session);
      scene.events.once('shutdown', session.destroy);
      scene.events.once('destroy', session.destroy);
      session.showScreen(scene.screenIndex ?? 0);
      return session;
    },
  };

  window.VN.systems.SceneAudio = SceneAudio;
})();
