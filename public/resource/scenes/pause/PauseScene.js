(function () {
  const WIDTH = 1920;
  const HEIGHT = 1080;
  const TEXT_COLOR = '#6E6056';

  /**
   * Пауза — по макету: фон главного меню, слева три кнопки, справа вывеска
   * «Один день Льва Толстого». Раскладка общая с главным меню
   * (Layout.menuLayout); на телефоне кнопки и вывеска крупнее.
   */
  class PauseScene extends Phaser.Scene {
    constructor() {
      super('PauseScene');
    }

    getAssetManifest() {
      return {
        images: [
          { key: 'menuBackground', url: 'images/backgrounds/menu_screen.webp' },
          { key: 'gameLogo', url: 'images/icon_UI/game_logo.webp' },
          { key: 'mainButtonBg', url: 'images/icon_UI/main_button.webp' },
        ],
      };
    }

    init(data) {
      this.returnSceneKey = (data && data.returnSceneKey) || 'StoryScene';
    }

    preload() {
      // Вместе с картинками грузится и музыка паузы (sceneAudio.PauseScene).
      window.VN.systems.SceneAssets.preload(this);
    }

    create() {
      // Своя музыка паузы; после «Продолжить» возвращается трек игры.
      this.musicController = this.sound.context
        ? window.VN.systems.MusicController.forScene(this) : null;
      this.previousMusic = this.musicController?.getCurrentMusic() ?? null;
      this.sceneAudio = window.VN.systems.SceneAudio.enter(this);
      const pauseMusic = this.musicController?.current;
      this.events.once('shutdown', () => {
        // При выходе в главное меню его трек может ещё загружаться.
        if (pauseMusic && this.musicController.current === pauseMusic) this.musicController.fadeOut();
      });

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
        bg.on('pointerup', () => {
          window.VN?.systems.AudioManager?.click?.(this);
          this.onButtonClick(buttonData.action);
        });
        return { bg, label };
      });

      this.layout.onLayout(this, (visible, ui) => this.applyLayout(ui));
    }

    applyLayout(ui) {
      // Раскладка — общая с главным меню (Layout.menuLayout).
      const { slots, logo, fontSize } = this.layout.menuLayout(this, ui);

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

        this.musicController?.transitionTo(this.previousMusic);
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
