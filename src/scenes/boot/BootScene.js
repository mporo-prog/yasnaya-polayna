import Phaser from 'phaser';
import { storyBackgrounds } from '../../data/story/storyBackgrounds.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    storyBackgrounds.forEach((screens) => {
      screens.forEach((path) => this.load.image(path, path));
    });
  }

  create() {
    this.scene.start('MainMenuScene');
  }
}
