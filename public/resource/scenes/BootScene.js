(function () {
  class BootScene extends Phaser.Scene {
    constructor() {
      super('BootScene');
    }

    preload() {
      
      const storyBackgrounds = window.VN.data.storyBackgrounds;
      storyBackgrounds.forEach(function (screens) {
        screens.forEach(function (path) {
          this.load.image(path, path);
        }, this);
      }, this);
    }

    create() {
      this.scene.start('MainMenuScene');
    }
  }

  window.VN.scenes.BootScene = BootScene;
})();
