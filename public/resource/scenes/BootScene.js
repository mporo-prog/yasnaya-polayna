(function () {
  class BootScene extends Phaser.Scene {
    constructor() {
      super('BootScene');
    }

    create() {
      // Ресурсы загружает целевая сцена: Boot не задерживает первый экран.
      this.scene.launch('AssetLoaderScene');
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

      const GameState = window.VN.systems.GameState;
      GameState.checkExpiration();
      if (GameState.state.status === 'story' || GameState.state.status === 'minigame') {
        GameState.resume(this);
      } else {
        this.scene.start('MainMenuScene');
      }
    }
  }

  window.VN.scenes.BootScene = BootScene;
})();
