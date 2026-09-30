(function () {
  const WIDTH = 1920;
  const HEIGHT = 1080;
  // const WIDTH = window.innerWidth;
  // const HEIGHT = window.innerHeight;

  
  class StartScene extends Phaser.Scene {
    constructor() {
      super('MainMenuScene');
    }

    getAssetManifest() {
      return {
        images: [
          { key: 'gameLogo', url: 'images/icon_UI/game_logo.png' },
          { key: 'mainButtonBg', url: 'images/icon_UI/main_button.png' },
        ],
      };
    }

    preload() {
      window.VN.systems.SceneAssets.preload(this, { visualsOnly: true });
    }

    create() {
      this.layout = window.VN.systems.Layout;
      this.menuData = window.VN.data.startMenuData;
      this.style = window.VN.data.startStyle;

      window.VN.systems.GameState.markAtMenu();

      this.buildBackground();
      this.buildTitle();
      this.buildButtons();
      window.VN.systems.SceneAssets.enterMenu(this);
    }

    buildBackground() {
      // Фон растягивается на весь экран (поля по краям тоже закрыты фоном).
      this.layout.addBackground(this, 'menuBackground');
    }

    buildTitle() {
      const t = this.style.title;
      const x = WIDTH * t.xFrac;
      const y = HEIGHT * t.yFrac;
      this.add.image(x, y, 'gameLogo')
        .setOrigin(0, 0)
        .setDisplaySize(t.width, t.height);
    }

    buildButtons() {
      this.menuData.buttons.forEach((buttonData, i) => {
        const slot = this.style.buttons[i];
        if (!slot) return; // если кнопок в данных больше, чем слотов в стиле

        const x = WIDTH * slot.xFrac;
        const y = HEIGHT * slot.yFrac;
        const w = slot.width;
        const h = slot.height;

        const texture = 'mainButtonBg';
        const bg = this.add.image(x, y, texture)
          .setOrigin(0, 0)
          .setDisplaySize(w, h)
          .setInteractive({ useHandCursor: true });
        this.add
          .text(x + w / 2, y + h / 2, buttonData.label, { fontFamily: 'Philosopher', fontSize: this.style.buttonFontSize, color: this.style.textColor })
          .setOrigin(0.5);

        bg.on('pointerup', () => this.onButtonClick(buttonData.action));
      });
    }

    onButtonClick(action) {
      if (action === 'start') {
        this.startGame();
      } else if (action === 'settings') {
        this.scene.sleep();
        this.scene.launch('SettingsScene', { returnSceneKey: 'MainMenuScene' });
      } else if (action === 'credits') {
        this.scene.sleep();
        this.scene.launch('AuthorsScene', { returnSceneKey: 'MainMenuScene' });
      }
    }

    /** "Начать" сбрасывает прошлое прохождение и запускает новую игру. */
    startGame() {
      const GameState = window.VN.systems.GameState;
      GameState.reset();
      GameState.resume(this);
    }
  }

  window.VN.scenes.StartScene = StartScene;
})();
