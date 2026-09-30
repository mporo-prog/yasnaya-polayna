(function () {
  const WIDTH = 1920;
  const HEIGHT = 1080;
  const TEXT_COLOR = '#6E6056';

  /**
   * Пауза — по макету: фон главного меню, слева три кнопки, справа вывеска
   * «Один день Льва Толстого». На телефоне (Layout.isCompact) кнопки и
   * вывеска крупнее, как в мобильном макете.
   */
  class PauseScene extends Phaser.Scene {
    constructor() {
      super('PauseScene');
    }

    getAssetManifest() {
      return {
        images: [
          { key: 'menuBackground', url: 'images/backgrounds/menu_screen.png' },
          { key: 'gameLogo', url: 'images/icon_UI/game_logo.png' },
          { key: 'mainButtonBg', url: 'images/icon_UI/main_button.png' },
        ],
      };
    }

    init(data) {
      this.returnSceneKey = (data && data.returnSceneKey) || 'StoryScene';
    }

    preload() {
      window.VN.systems.SceneAssets.preload(this, { visualsOnly: true });
    }

    create() {
      this.layout = window.VN.systems.Layout;
      const menuData = window.VN.data.pauseMenuData;

      // Фон меню на весь экран; он же перехватывает клики — сцена под
      // паузой (например, StoryScene) их не получает.
      this.layout.addBackground(this, 'menuBackground');
      this.layout.fill(this, this.add.zone(0, 0, WIDTH, HEIGHT).setInteractive());

      this.logo = this.add.image(0, 0, 'gameLogo').setOrigin(0, 0);
      this.buttons = menuData.buttons.map((buttonData) => {
        const bg = this.add.image(0, 0, 'mainButtonBg')
          .setOrigin(0, 0)
          .setInteractive({ useHandCursor: true });
        const label = this.add.text(0, 0, buttonData.label, {
          fontFamily: 'Philosopher',
          fontSize: '48px',
          color: TEXT_COLOR,
        }).setOrigin(0.5);
        bg.on('pointerup', () => this.onButtonClick(buttonData.action));
        return { bg, label };
      });

      this.layout.onLayout(this, (visible, ui) => this.applyLayout(ui));
    }

    applyLayout(ui) {
      const style = window.VN.data.startStyle;
      let slots, logo, fontSize;
      if (this.layout.isCompact(this)) {
        // Мобильный макет: доли ширины экрана, высоты — в пикселях макета.
        const x = ui.x + ui.width * 0.1036;
        const width = ui.width * 0.2726;
        slots = [118, 393, 655].map((y) => ({ x, y, width, height: 223 }));
        logo = { x: ui.x + ui.width * 0.529, y: 183, width: 825, height: 432 };
        fontSize = 79;
      } else {
        // Как на главном экране (startStyle).
        slots = style.buttons.map((slot) => ({
          x: WIDTH * slot.xFrac, y: HEIGHT * slot.yFrac, width: slot.width, height: slot.height,
        }));
        const t = style.title;
        logo = { x: WIDTH * t.xFrac, y: HEIGHT * t.yFrac, width: t.width, height: t.height };
        fontSize = parseInt(style.buttonFontSize, 10);
      }

      this.logo.setPosition(logo.x, logo.y).setDisplaySize(logo.width, logo.height);
      this.buttons.forEach(({ bg, label }, i) => {
        const slot = slots[i];
        if (!slot) return;
        bg.setPosition(slot.x, slot.y).setDisplaySize(slot.width, slot.height);
        label.setPosition(slot.x + slot.width / 2, slot.y + slot.height / 2).setFontSize(fontSize);
      });
    }

    onButtonClick(action) {
      if (action === 'resume') this.resumeGame();
      else if (action === 'settings') this.openSettings();
      else if (action === 'menu') this.goToMainMenu();
    }

    resumeGame() {

        const scene = this.scene.get(this.returnSceneKey);

        this.scene.stop();
        this.scene.resume(this.returnSceneKey);

        if (scene) {
            scene.input.enabled = true;
            // Если пауза открывалась во время озвучки реплики (StoryScene) —
            // проиграть её заново с начала. Другие сцены этот метод не реализуют.
            if (typeof scene.resumeVoiceIfNeeded === 'function') scene.resumeVoiceIfNeeded();
        }
    }

    openSettings() {
      this.scene.sleep();
      this.scene.launch('SettingsScene', { returnSceneKey: 'PauseScene' });
    }

    goToMainMenu() {
      this.scene.stop();
      this.scene.stop(this.returnSceneKey);
      this.scene.start('MainMenuScene');
    }
  }

  window.VN.scenes.PauseScene = PauseScene;
})();
