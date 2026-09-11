import Phaser from 'phaser';
import { pauseMenuData } from '../../data/pause/pauseMenuData.js';
import { startMenuData } from '../../data/start/startMenuData.js';

export class PauseScene extends Phaser.Scene {
  constructor() {
    super('PauseScene');
  }

  init(data = {}) {
    this.returnSceneKey = data.returnSceneKey ?? 'StoryScene';
  }

  create() {
    const { width, height } = this.scale;

    this.add.rectangle(0, 0, width, height, 0xffffff, 1).setOrigin(0, 0);
    this.add.rectangle(width / 2, height * 0.2, width * 0.55, height * 0.18, 0xd9d9d9);
    this.add.text(width / 2, height * 0.2, startMenuData.title, { fontSize: '38px', color: '#000000' }).setOrigin(0.5);

    const yPositions = [0.45, 0.6, 0.75];
    pauseMenuData.buttons.forEach((btn, i) => {
      this.makeMenuButton(width / 2, height * yPositions[i], btn.label, () => this.onClick(btn.action));
    });
  }

  makeMenuButton(x, y, label, onClick) {
    const w = this.scale.width * 0.28;
    const bg = this.add.rectangle(x, y, w, 100, 0xd9d9d9).setInteractive({ useHandCursor: true });
    this.add.text(x, y, label, { fontSize: '30px', color: '#000000' }).setOrigin(0.5);
    bg.on('pointerup', onClick);
  }

  onClick(action) {
    if (action === 'resume') this.resumeGame();
    else if (action === 'settings') this.scene.launch('SettingsScene');
    else if (action === 'menu') this.goToMainMenu();
  }

  resumeGame() {
    this.scene.stop();
    this.scene.resume(this.returnSceneKey);
  }

  goToMainMenu() {
    this.scene.stop();
    this.scene.stop(this.returnSceneKey);
    this.scene.start('MainMenuScene');
  }
}
