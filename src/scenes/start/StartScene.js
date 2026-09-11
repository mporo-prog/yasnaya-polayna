import Phaser from 'phaser';
import { startMenuData } from '../../data/start/startMenuData.js';
import { startStyle } from '../../data/start/startStyle.js';
import { GameState } from '../../systems/GameState.js';

const W = 1920, H = 1080;

export class StartScene extends Phaser.Scene {
  constructor() {
    super('MainMenuScene');
  }

  create() {
    this.add.rectangle(0, 0, W, H, startStyle.backgroundColor).setOrigin(0, 0);
    this.buildTitle();
    this.buildButtons();
    this.buildCreditsOverlay();
  }

  buildTitle() {
    const t = startStyle.title;
    const x = W * t.xFrac, y = H * t.yFrac, w = W * t.wFrac, h = H * t.hFrac;
    this.add.rectangle(x, y, w, h, startStyle.panelColor);
    this.add.text(x, y, startMenuData.title, {
      fontSize: startStyle.titleFontSize, color: startStyle.textColor, align: 'center', wordWrap: { width: w - 40 },
    }).setOrigin(0.5);
  }

  buildButtons() {
    startMenuData.buttons.forEach((btn, i) => {
      const slot = startStyle.buttons[i];
      if (!slot) return;
      const x = W * slot.xFrac, y = H * slot.yFrac, w = W * slot.wFrac, h = H * slot.hFrac;
      const bg = this.add.rectangle(x, y, w, h, startStyle.panelColor).setInteractive({ useHandCursor: true });
      this.add.text(x, y, btn.label, { fontSize: startStyle.buttonFontSize, color: startStyle.textColor }).setOrigin(0.5);
      bg.on('pointerup', () => this.onClick(btn.action));
    });
  }

  onClick(action) {
    if (action === 'start') {
      const s = GameState.state;
      this.scene.start('StoryScene', { storySceneIndex: s.storySceneIndex, screenIndex: s.screenIndex });
    } else if (action === 'settings') {
      this.scene.launch('SettingsScene');
    } else if (action === 'credits') {
      this.creditsContainer.setVisible(true);
    }
  }

  buildCreditsOverlay() {
    this.creditsContainer = this.add.container(0, 0).setDepth(10).setVisible(false);
    const bg = this.add.rectangle(0, 0, W, H, 0x3f3f3f, 0.98).setOrigin(0, 0).setInteractive();
    const text = this.add.text(W * 0.2, H * 0.25, startMenuData.creditsText, {
      fontSize: '32px', color: '#ffffff', wordWrap: { width: W * 0.6 }, lineSpacing: 16,
    });
    const closeBg = this.add.rectangle(W - 70, 60, 60, 60, 0xd9d9d9).setInteractive({ useHandCursor: true });
    const closeText = this.add.text(W - 70, 60, '✕', { fontSize: '36px', color: '#000000' }).setOrigin(0.5);
    closeBg.on('pointerup', () => this.creditsContainer.setVisible(false));
    this.creditsContainer.add([bg, text, closeBg, closeText]);
  }
}
