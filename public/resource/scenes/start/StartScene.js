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
          { key: 'mainButtonBg', url: 'images/icon_UI/main_button.png' },
          { key: 'saveButtonBg', url: 'images/icon_UI/save_button.png' },
        ],
      };
    }

    preload() {
      window.VN.systems.SceneAssets.preload(this, { visualsOnly: true });
    }

    create() {
      window.VN.systems.SceneAudio.enter(this);
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
      const w = WIDTH * t.wFrac;
      const h = HEIGHT * t.hFrac;

      this.add.rectangle(x, y, w, h, this.style.panelColor);
      this.add
        .text(x, y, this.menuData.title, {
          fontSize: this.style.titleFontSize,
          color: this.style.textColor,
          align: 'center',
          wordWrap: { width: w - 40 },
        })
        .setOrigin(0.5);
    }

    buildButtons() {
      this.menuData.buttons.forEach((buttonData, i) => {
        const slot = this.style.buttons[i];
        if (!slot) return; // если кнопок в данных больше, чем слотов в стиле

        const x = WIDTH * slot.xFrac;
        const y = HEIGHT * slot.yFrac;
        const w = WIDTH * slot.wFrac;
        const h = HEIGHT * slot.hFrac;

        const texture = buttonData.action === 'start' ? 'mainButtonBg' : 'saveButtonBg';
        const bg = this.add.image(x, y, texture).setInteractive({ useHandCursor: true });
        const scale = w / bg.width;
        bg.setScale(scale);
        this.add
          .text(x, y, buttonData.label, { fontFamily: 'Philosopher', fontSize: this.style.buttonFontSize, color: this.style.textColor })
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

    /**
     * "Начать" — это одновременно и "Новая игра" (если сохранения ещё
     * нет — GameState.state тогда 0/0), и "Продолжить" (если игрок уже
     * где-то был раньше). Отдельной кнопки "Продолжить" в макете нет,
     * поэтому одной кнопки достаточно.
     */
    startGame() {
      const s = window.VN.systems.GameState.state;
      this.scene.start('StoryScene', { storySceneIndex: 0, screenIndex: 0 });
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
