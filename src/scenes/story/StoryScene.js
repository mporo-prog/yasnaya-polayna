import Phaser from 'phaser';
import { storyLines } from '../../data/story/storyLines.js';
import { storyHistoryTexts } from '../../data/story/storyHistoryTexts.js';
import { storyBackgrounds } from '../../data/story/storyBackgrounds.js';
import { storyMinigameLinks } from '../../data/story/storyMinigameLinks.js';
import { GameState } from '../../systems/GameState.js';

const W = 1920, H = 1080;
const BAR_Y = H * 0.75;

export class StoryScene extends Phaser.Scene {
  constructor() {
    super('StoryScene');
  }

  init(data = {}) {
    this.storySceneIndex = data.storySceneIndex ?? GameState.state.storySceneIndex;
    this.screenIndex = data.screenIndex ?? GameState.state.screenIndex;
    this.historyVisible = false;
  }

  create() {
    this.buildBackground();
    this.buildBottomBar();
    this.buildNav();
    this.buildTopButtons();
    this.buildHistoryOverlay();
    this.render();
  }

  get lines() { return storyLines[this.storySceneIndex]; }
  get historyTexts() { return storyHistoryTexts[this.storySceneIndex]; }
  get backgrounds() { return storyBackgrounds[this.storySceneIndex]; }
  get minigameKey() { return storyMinigameLinks[this.storySceneIndex]; }

  buildBackground() {
    this.bgImage = this.add.image(0, 0, '__MISSING').setOrigin(0, 0).setVisible(false);
    this.bgRect = this.add.rectangle(0, 0, W, BAR_Y, 0xd9d9d9).setOrigin(0, 0);
    this.bgLabel = this.add.text(W / 2, BAR_Y / 2, 'Фон', { fontSize: '40px', color: '#000000' }).setOrigin(0.5);
    this.debugLabel = this.add.text(W / 2, 40, '', { fontSize: '48px', color: '#000000' }).setOrigin(0.5);
  }

  setBackground(path) {
    if (this.textures.exists(path)) {
      this.bgImage.setTexture(path).setDisplaySize(W, BAR_Y).setVisible(true);
      this.bgRect.setVisible(false);
      this.bgLabel.setVisible(false);
    } else {
      this.bgImage.setVisible(false);
      this.bgRect.setVisible(true);
      this.bgLabel.setVisible(true).setText('Фон не найден:\n' + path);
    }
  }

  buildBottomBar() {
    this.add.rectangle(0, BAR_Y, W, H - BAR_Y, 0x3f3f3f).setOrigin(0, 0);
    this.add.rectangle(W / 2, BAR_Y + 130, W * 0.55, 190, 0xd9d9d9).setOrigin(0.5, 0);
    this.dialogueText = this.add.text(W / 2, BAR_Y + 150, '', {
      fontSize: '34px', color: '#000000', align: 'center', wordWrap: { width: W * 0.5 },
    }).setOrigin(0.5, 0);
  }

  buildNav() {
    this.backBtn = this.makeButton(W * 0.16, BAR_Y + 220, 'Back', () => this.goBack());
    this.nextBtn = this.makeButton(W * 0.84, BAR_Y + 220, 'Next', () => this.goNext());
  }

  buildTopButtons() {
    this.makeButton(W - 95, 45, 'кнопка\nменю', () => this.openPause(), 150, 80);
    this.historyBtn = this.makeButton(W - 95, BAR_Y + 50, 'История', () => this.toggleHistory(), 150, 60);
  }

  makeButton(x, y, label, onClick, w = 120, h = 40, fontSize = '20px') {
    const bg = this.add.rectangle(x, y, w, h, 0xd9d9d9).setInteractive({ useHandCursor: true });
    const text = this.add.text(x, y, label, { fontSize, color: '#000000', align: 'center' }).setOrigin(0.5);
    bg.on('pointerup', onClick);
    return { bg, text };
  }

  buildHistoryOverlay() {
    this.historyContainer = this.add.container(0, 0).setDepth(10).setVisible(false);
    const bg = this.add.rectangle(0, 0, W, H, 0x3f3f3f, 0.98).setOrigin(0, 0).setInteractive();
    const title = this.add.text(W / 2, 70, 'История', { fontSize: '56px', color: '#ffffff' }).setOrigin(0.5);
    this.historyText = this.add.text(W * 0.32, 170, '', {
      fontSize: '30px', color: '#ffffff', wordWrap: { width: W * 0.55 }, lineSpacing: 26,
    });
    const closeBtn = this.makeButton(W - 70, 60, '✕', () => this.toggleHistory(), 60, 60, '36px');
    this.historyContainer.add([bg, title, this.historyText, closeBtn.bg, closeBtn.text]);
  }

  render() {
    const text = this.lines[this.screenIndex];
    const bgPath = this.backgrounds[this.screenIndex];
    const override = this.historyTexts[this.screenIndex];

    this.debugLabel.setText(`Сюжетная сцена ${this.storySceneIndex + 1}, экран ${this.screenIndex + 1}`);
    this.setBackground(bgPath);
    this.dialogueText.setText(text);

    GameState.goToScreen(this.storySceneIndex, this.screenIndex);
    GameState.addHistoryEntry(this.storySceneIndex, this.screenIndex, override ?? text);

    const first = this.screenIndex === 0;
    this.backBtn.bg.setAlpha(first ? 0.4 : 1);
    first ? this.backBtn.bg.disableInteractive() : this.backBtn.bg.setInteractive({ useHandCursor: true });
  }

  goNext() {
    if (this.screenIndex < this.lines.length - 1) {
      this.screenIndex += 1;
      this.render();
    } else {
      this.startMinigame();
    }
  }

  goBack() {
    if (this.screenIndex > 0) {
      this.screenIndex -= 1;
      this.render();
    }
  }

  startMinigame() {
    const sceneKey = this.minigameKey || 'PlaceholderMinigameScene';
    const minigameId = `story_${this.storySceneIndex + 1}_minigame`;
    this.scene.start(sceneKey, { storySceneIndex: this.storySceneIndex, minigameId });
  }

  toggleHistory() {
    this.historyVisible = !this.historyVisible;
    this.historyContainer.setVisible(this.historyVisible);
    if (this.historyVisible) {
      const entries = GameState.getHistoryForScene(this.storySceneIndex);
      this.historyText.setText(entries.map((e) => e.text).join('\n\n'));
    }
  }

  openPause() {
    this.scene.pause();
    this.scene.launch('PauseScene', { returnSceneKey: 'StoryScene' });
  }
}
