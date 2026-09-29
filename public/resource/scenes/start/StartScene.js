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
          { key: 'saveButtonBg', url: 'images/icon_UI/main_button.png' },
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
      this.buildOverlay(); // оверлей для "Авторы"
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

        const texture = buttonData.action === 'start' ? 'mainButtonBg' : 'saveButtonBg';
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
        this.showOverlay(this.menuData.creditsText);
      }
    }

    /** "Начать" сбрасывает прошлое прохождение и запускает новую игру. */
    startGame() {
      const GameState = window.VN.systems.GameState;
      GameState.reset();
      GameState.resume(this);
    }

    // ---- оверлей для "Авторы" ---------------------------------------------

    buildOverlay() {
      this.overlayContainer = this.add.container(0, 0).setDepth(10).setVisible(false);

      // Подложка закрывает весь экран, включая поля.
      const panelBg = this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x3f3f3f, 0.98).setOrigin(0, 0).setInteractive();
      this.layout.fill(this, panelBg);
      this.overlayText = this.add.text(WIDTH * 0.2, HEIGHT * 0.25, '', {
        fontSize: '32px',
        color: '#ffffff',
        align: 'left',
        wordWrap: { width: WIDTH * 0.6 },
        lineSpacing: 16,
      });

      const closeBtn = this.add
        .rectangle(WIDTH - 70, 60, 60, 60, 0xd9d9d9)
        .setInteractive({ useHandCursor: true });
      const closeText = this.add.text(WIDTH - 70, 60, '✕', { fontSize: '36px', color: '#000000' }).setOrigin(0.5);
      closeBtn.on('pointerup', () => this.hideOverlay());
      // Крестик — в правом верхнем углу экрана, а не макета.
      this.layout.pin(this, closeBtn, { right: 70, top: 60 });
      this.layout.pin(this, closeText, { right: 70, top: 60 });

      this.overlayContainer.add([panelBg, this.overlayText, closeBtn, closeText]);
    }

    showOverlay(text) {
      this.overlayText.setText(text);
      this.overlayContainer.setVisible(true);
    }

    hideOverlay() {
      this.overlayContainer.setVisible(false);
    }
  }

  window.VN.scenes.StartScene = StartScene;
})();
