import Phaser from 'phaser';
import { finishMinigameAndAdvance } from '../../../systems/minigameFlow.js';

export class PlaceholderMinigameScene extends Phaser.Scene {
  constructor() {
    super('PlaceholderMinigameScene');
  }

  init(data) {
    this.storySceneIndex = data.storySceneIndex;
    this.minigameId = data.minigameId;
  }

  create() {
    const { width, height } = this.scale;

    this.add.rectangle(0, 0, width, height, 0x222222).setOrigin(0, 0);
    this.add.text(width / 2, height / 2 - 60, `Мини-игра: ${this.minigameId}`, {
      fontSize: '40px', color: '#ffffff',
    }).setOrigin(0.5);

    const btn = this.add.rectangle(width / 2, height / 2 + 60, 300, 80, 0xd9d9d9).setInteractive({ useHandCursor: true });
    this.add.text(width / 2, height / 2 + 60, 'Завершить', { fontSize: '28px', color: '#000000' }).setOrigin(0.5);
    btn.on('pointerup', () => finishMinigameAndAdvance(this, this.storySceneIndex, this.minigameId));
  }
}
