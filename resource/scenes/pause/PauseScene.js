(function () {
  class PauseScene extends Phaser.Scene {
    constructor() {
      super('PauseScene');
    }

    init(data) {
      this.returnSceneKey = (data && data.returnSceneKey) || 'StoryScene';
    }

    create() {
      const width = this.scale.width;
      const height = this.scale.height;
      const menuData = window.VN.data.pauseMenuData;
      const title = window.VN.data.startMenuData.title; // используем то же название игры, что и на стартовом экране

      this.add.rectangle(0, 0, width, height, 0xffffff, 1).setOrigin(0, 0);
      this.add.rectangle(width / 2, height * 0.2, width * 0.55, height * 0.18, 0xd9d9d9);
      this.add.text(width / 2, height * 0.2, title, { fontSize: '38px', color: '#000000' }).setOrigin(0.5);

      const yPositions = [0.45, 0.6, 0.75];
      menuData.buttons.forEach((buttonData, i) => {
        this.makeMenuButton(width / 2, height * yPositions[i], buttonData.label, () => this.onButtonClick(buttonData.action));
      });
    }

    makeMenuButton(x, y, label, onClick) {
      const buttonWidth = this.scale.width * 0.28;
      const bg = this.add.rectangle(x, y, buttonWidth, 100, 0xd9d9d9).setInteractive({ useHandCursor: true });
      this.add.text(x, y, label, { fontSize: '30px', color: '#000000' }).setOrigin(0.5);
      bg.on('pointerup', onClick);
    }

    onButtonClick(action) {
      if (action === 'resume') this.resumeGame();
      else if (action === 'settings') this.openSettings();
      else if (action === 'menu') this.goToMainMenu();
    }

    resumeGame() {
      this.scene.stop();
      this.scene.resume(this.returnSceneKey);
    }

    openSettings() {
      // Заглушка — см. VN.data.startMenuData.settingsPlaceholderText,
      // тот же текст используется на стартовом экране.
      console.log('Открыть настройки — TODO');
    }

    goToMainMenu() {
      this.scene.stop();
      this.scene.stop(this.returnSceneKey);
      this.scene.start('MainMenuScene');
    }
  }

  window.VN.scenes.PauseScene = PauseScene;
})();
