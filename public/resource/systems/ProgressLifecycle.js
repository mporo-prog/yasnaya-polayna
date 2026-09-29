/** Срок хранения отсчитывается от ухода игрока, а не от фоновых событий браузера. */
(function () {
  window.VN.systems.ProgressLifecycle = {
    install: function (game) {
      const GameState = window.VN.systems.GameState;
      let away = document.hidden;

      const leave = () => {
        if (away) return;
        GameState.save();
        away = true;
      };
      const beforeUnload = () => {
        // Закрытие давно скрытой вкладки не должно продлевать просроченный прогресс.
        if (!away) GameState.save();
      };
      const returnToGame = () => {
        if (document.hidden) return;
        if (GameState.checkExpiration()) {
          // Сюжет под паузой и спящие настройки тоже нужно остановить.
          game.scene.getScenes(false).forEach((scene) => {
            if (!scene.isAssetLoader) game.scene.stop(scene.sys.settings.key);
          });
          game.scene.start('MainMenuScene');
        } else {
          GameState.save();
        }
        away = false;
      };
      const visibilityChange = () => {
        if (document.hidden) leave();
        else if (away) returnToGame();
      };
      const pageShow = (event) => {
        if (event.persisted) returnToGame();
      };

      window.addEventListener('beforeunload', beforeUnload);
      window.addEventListener('pagehide', leave);
      window.addEventListener('pageshow', pageShow);
      document.addEventListener('visibilitychange', visibilityChange);
      game.events.once('destroy', () => {
        window.removeEventListener('beforeunload', beforeUnload);
        window.removeEventListener('pagehide', leave);
        window.removeEventListener('pageshow', pageShow);
        document.removeEventListener('visibilitychange', visibilityChange);
      });
    },
  };
})();
