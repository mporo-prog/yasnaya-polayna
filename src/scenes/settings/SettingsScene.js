import Phaser from 'phaser';
import { settingsData } from '../../data/settings/settingsData.js';

export class SettingsScene extends Phaser.Scene {
  constructor() {
    super('SettingsScene');
  }

  create() {
    const { width, height } = this.scale;

    this.add.rectangle(0, 0, width, height, 0x3f3f3f, 0.98).setOrigin(0, 0).setInteractive();
    this.add.text(width / 2, height * 0.15, settingsData.title, { fontSize: '48px', color: '#ffffff' }).setOrigin(0.5);
    this.add.text(width * 0.2, height * 0.35, settingsData.placeholderText, {
      fontSize: '32px', color: '#ffffff', wordWrap: { width: width * 0.6 }, lineSpacing: 16,
    });

    const closeBg = this.add.rectangle(width - 70, 60, 60, 60, 0xd9d9d9).setInteractive({ useHandCursor: true });
    this.add.text(width - 70, 60, '✕', { fontSize: '36px', color: '#000000' }).setOrigin(0.5);
    closeBg.on('pointerup', () => this.scene.stop());
  }
}
