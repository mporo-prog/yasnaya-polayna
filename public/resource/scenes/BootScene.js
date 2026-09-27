(function () {
  class BootScene extends Phaser.Scene {
    constructor() {
      super('BootScene');
    }

    preload() {
      window.VN.systems.SceneAudio.preload(this, [
        ...window.VN.data.storyAudio,
        ...Object.values(window.VN.data.sceneAudio),
      ]);
      const storyBackgrounds = window.VN.data.storyBackgrounds;
      storyBackgrounds.forEach(function (screens) {
        screens.forEach(function (path) {
          this.load.image(path, path);
        }, this);
      }, this);

      // Портреты персонажей сюжетных сцен.
      const portraits = window.VN.data.storyCharacterPortraits || {};
      Object.keys(portraits).forEach(function (name) {
        const path = portraits[name];
        this.load.image(path, path);
      }, this);

      // Иконки интерфейса (пауза, история/инфо, назад/вперёд).
      const uiIcons = [
        'resource/images/ui/pause_button.png',
        'resource/images/ui/history_button.png',
        'resource/images/ui/back_button.png',
        'resource/images/ui/next_button.png',
      ];
      uiIcons.forEach(function (path) {
        this.load.image(path, path);
      }, this);
    }

    create() {
      const params = new URLSearchParams(window.location.search);
      const game = params.get('game');

      const games = {
          '1': 'GameScene1',
          '2': 'GameScene2',
          '3': 'GameScene3',
          '4': 'GameScene4',
          '5': 'QuoteMinigameScene'
      };

      const gameKey = games[game];

      if (gameKey) {
          this.scene.start(gameKey, {
              storySceneIndex: 0,
              minigameId: 'test_' + gameKey,
              direct: true
          });

          return;
      }

      this.scene.start('MainMenuScene');
    }
  }

  window.VN.scenes.BootScene = BootScene;
})();
