(function () {
  /**
   * Заглушка вместо ещё не готовой мини-игры. Когда мини-игра будет
   * готова — пропишите её ключ сцены в data/story/storyMinigameLinks.js,
   * и StoryScene начнёт запускать её вместо этой заглушки.
   */
  class PlaceholderMinigameScene extends Phaser.Scene {
    constructor() {
      super('PlaceholderMinigameScene');
    }

    init(data) {
      this.storySceneIndex = data.storySceneIndex;
      this.minigameId = data.minigameId;
    }

    create() {
      const width = this.scale.width;
      const height = this.scale.height;

      this.add.rectangle(0, 0, width, height, 0x222222).setOrigin(0, 0);
      this.add
        .text(width / 2, height / 2 - 60, 'Мини-игра ещё не готова\n(' + this.minigameId + ')', {
          fontSize: '36px',
          color: '#ffffff',
          align: 'center',
        })
        .setOrigin(0.5);

      const btn = this.add
        .rectangle(width / 2, height / 2 + 80, 300, 80, 0xd9d9d9)
        .setInteractive({ useHandCursor: true });
      this.add.text(width / 2, height / 2 + 80, 'Завершить', { fontSize: '28px', color: '#000000' }).setOrigin(0.5);
      btn.on('pointerup', () => this.finishMinigame());
    }

    finishMinigame() {
      window.VN.systems.finishMinigameAndAdvance(this, this.storySceneIndex, this.minigameId);
    }
  }

  window.VN.scenes.PlaceholderMinigameScene = PlaceholderMinigameScene;
})();
