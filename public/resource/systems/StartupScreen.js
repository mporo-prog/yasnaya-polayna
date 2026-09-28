/** HTML-экран закрывает запуск движка и исчезает после первого кадра игры. */
(function () {
  const watchedGames = new WeakSet();
  function watchFonts(game) {
    const stylesheet = document.getElementById('game-fonts');
    if (!document.fonts || !stylesheet || watchedGames.has(game)) return;
    watchedGames.add(game);
    // Phaser хранит текст как текстуру: подмена веб-шрифта сама её не обновит.
    const redraw = (objects) => {
      for (const object of objects) {
        if (object.type === 'Text') object.style.update(true);
        if (Array.isArray(object.list)) redraw(object.list);
      }
    };
    const refresh = () => {
      for (const scene of game.scene.scenes) redraw(scene.children?.list ?? []);
    };
    stylesheet.addEventListener('load', refresh);
    document.fonts.addEventListener('loadingdone', refresh);
    game.events.once('destroy', () => {
      stylesheet.removeEventListener('load', refresh);
      document.fonts.removeEventListener('loadingdone', refresh);
    });
  }

  window.VN.systems.StartupScreen = {
    track(scene) {
      const screen = document.getElementById('startup-loading');
      if (!screen) return null;
      watchFonts(scene.game);
      const label = document.getElementById('startup-label');
      const bar = document.getElementById('startup-progress');
      let active = true;
      const cleanup = () => {
        active = false;
        scene.events.off('create', onCreate);
        scene.events.off('shutdown', cleanup);
        scene.events.off('destroy', cleanup);
        scene.game.events.off('postrender', hide);
      };
      const hide = () => { screen.remove(); cleanup(); };
      const onCreate = () => scene.game.events.once('postrender', hide);
      scene.events.once('create', onCreate);
      scene.events.once('shutdown', cleanup);
      scene.events.once('destroy', cleanup);
      return (progress) => {
        if (!active) return;
        const percent = Math.round(progress * 100);
        label.textContent = 'Загрузка… ' + percent + '%';
        bar.value = percent;
      };
    },
  };
})();
