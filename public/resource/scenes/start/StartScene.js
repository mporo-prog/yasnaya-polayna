(function () {
  /** Главное меню: вывеска и кнопки «Начать», «Настройки», «Авторы». */
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
      // Раскладка — общая с меню паузы (Layout.menuLayout): на компьютере по
      // startStyle, на телефоне — крупные кнопки слева и вывеска справа.
      this.layout.onLayout(this, (visible, ui) => this.applyLayout(ui));
      window.VN.systems.SceneAssets.enterMenu(this);
    }

    buildBackground() {
      // Фон растягивается на весь экран (поля по краям тоже закрыты фоном).
      this.layout.addBackground(this, 'menuBackground');
    }

    buildTitle() {
      this.logo = this.add.image(0, 0, 'gameLogo').setOrigin(0, 0);
    }

    buildButtons() {
      this.buttons = this.menuData.buttons.map((buttonData) => {
        const bg = this.add.image(0, 0, 'mainButtonBg')
          .setOrigin(0, 0)
          .setInteractive({ useHandCursor: true });
        const label = this.add
          .text(0, 0, buttonData.label, { fontFamily: 'Philosopher', fontSize: this.style.buttonFontSize, color: this.style.textColor })
          .setOrigin(0.5);
        bg.on('pointerup', () => {
          window.VN?.systems.AudioManager?.click?.(this);
          this.onButtonClick(buttonData.action);
        });
        return { bg, label };
      });
    }

    applyLayout(ui) {
      const { slots, logo, fontSize } = this.layout.menuLayout(this, ui);
      this.logo.setPosition(logo.x, logo.y).setDisplaySize(logo.width, logo.height);
      this.buttons.forEach(({ bg, label }, i) => {
        const slot = slots[i];
        // Если кнопок в данных больше, чем мест в макете, лишние скрыты.
        bg.setVisible(Boolean(slot));
        label.setVisible(Boolean(slot));
        if (!slot) return;
        bg.setPosition(slot.x, slot.y).setDisplaySize(slot.width, slot.height);
        label.setPosition(slot.x + slot.width / 2, slot.y + slot.height / 2).setFontSize(fontSize);
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
