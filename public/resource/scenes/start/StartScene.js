(function () {
  const WIDTH = 1920;
  const HEIGHT = 1080;

  
  class StartScene extends Phaser.Scene {
    constructor() {
      super('MainMenuScene');
    }

    create() {
      this.menuData = window.VN.data.startMenuData;
      this.style = window.VN.data.startStyle;

      window.VN.systems.GameState.markAtMenu();

      this.buildBackground();
      this.buildTitle();
      this.buildButtons();
      this.buildOverlay(); // общий оверлей для "Настройки" и "Авторы"
    }

    buildBackground() {
      this.add.rectangle(0, 0, WIDTH, HEIGHT, this.style.backgroundColor).setOrigin(0, 0);
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

        const bg = this.add.rectangle(x, y, w, h, this.style.panelColor).setInteractive({ useHandCursor: true });
        this.add
          .text(x, y, buttonData.label, { fontSize: this.style.buttonFontSize, color: this.style.textColor })
          .setOrigin(0.5);

        bg.on('pointerup', () => this.onButtonClick(buttonData.action));
      });
    }

    onButtonClick(action) {
      if (action === 'start') {
        this.startGame();
      } else if (action === 'settings') {
        this.showOverlay(this.menuData.settingsPlaceholderText);
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
      this.scene.start('StoryScene', { storySceneIndex: s.storySceneIndex, screenIndex: s.screenIndex });
    }

    // ---- простой оверлей для "Настройки" / "Авторы" ------------------------
    // Пока это просто текстовая панель-заглушка. Когда появится реальный
    // экран настроек — замените showOverlay(settingsPlaceholderText) на
    // отдельную сцену SettingsScene по такому же принципу, как QuoteMinigameScene.

    buildOverlay() {
      this.overlayContainer = this.add.container(0, 0).setDepth(10).setVisible(false);

      const panelBg = this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x3f3f3f, 0.98).setOrigin(0, 0).setInteractive();
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
