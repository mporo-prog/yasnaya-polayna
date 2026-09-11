import Phaser from 'phaser';
import { quoteData } from '../../../data/minigames/quote/quoteData.js';
import { quoteStyle } from '../../../data/minigames/quote/quoteStyle.js';
import { finishMinigameAndAdvance } from '../../../systems/minigameFlow.js';

const W = 1920, H = 1080;

export class QuoteMinigameScene extends Phaser.Scene {
  constructor() {
    super('QuoteMinigameScene');
  }

  init(data) {
    this.storySceneIndex = data.storySceneIndex;
    this.minigameId = data.minigameId;
    this.solved = false;
  }

  create() {
    this.buildPortrait();
    this.buildTopButtons();
    this.buildQuoteRow();
    this.buildAnswers();
    this.buildContinueButton();
  }

  buildPortrait() {
    this.add.rectangle(0, 0, W, H, quoteStyle.backgroundColor).setOrigin(0, 0);
    this.add.rectangle(W * 0.04, H * 0.08, W * 0.35, H * 0.83, quoteStyle.portraitColor).setOrigin(0, 0);
    this.add.text(W * 0.12, H * 0.28, `здесь будет\nизображение\n${quoteData.characterLabel}`, {
      fontSize: '46px', color: '#ffffff', lineSpacing: 10,
    }).setOrigin(0, 0);
  }

  buildTopButtons() {
    this.makeButton(W - 95, 45, 'кнопка\nменю', () => this.openPause(), 150, 80);
  }

  buildQuoteRow() {
    const startX = W * 0.465, y = H * 0.22;
    if (quoteData.mode === 'prefix') {
      this.blankRect = this.add.rectangle(startX, y, 480, 60, quoteStyle.colorWrong).setOrigin(0, 0.5);
      this.add.text(startX + 500, y, ' ' + quoteData.prompt, { fontSize: '40px', color: '#000000' }).setOrigin(0, 0.5);
    } else {
      const promptText = this.add.text(startX, y, quoteData.prompt + ' ', { fontSize: '40px', color: '#000000' }).setOrigin(0, 0.5);
      this.blankRect = this.add.rectangle(startX + promptText.width, y, 480, 60, quoteStyle.colorWrong).setOrigin(0, 0.5);
    }
  }

  revealAnswer() {
    const x = this.blankRect.x, y = this.blankRect.y;
    this.blankRect.destroy();
    this.add.text(x, y, quoteData.answer, { fontSize: '40px', color: '#000000' }).setOrigin(0, 0.5);
  }

  buildAnswers() {
    const options = this.shuffle(
      [{ text: quoteData.answer, correct: true }].concat(
        quoteData.distractors.map((text) => ({ text, correct: false }))
      )
    );
    this.answerButtons = options.map((o, i) => this.buildOneAnswer(o, quoteStyle.slots[i]));
  }

  buildOneAnswer(option, slot) {
    const x = W * slot.xFrac, y = H * slot.yFrac;
    const bg = this.add.rectangle(x, y, slot.w, slot.h, quoteStyle.colorDefault).setInteractive({ useHandCursor: true });
    this.add.text(x, y, option.text, {
      fontSize: '28px', color: '#000000', align: 'center', wordWrap: { width: slot.w - 20 },
    }).setOrigin(0.5);
    const button = { bg, correct: option.correct };
    bg.on('pointerup', () => this.onAnswerClick(button));
    return button;
  }

  onAnswerClick(button) {
    if (this.solved) return;
    if (button.correct) {
      this.solved = true;
      button.bg.setFillStyle(quoteStyle.colorCorrect);
      this.revealAnswer();
      this.answerButtons.forEach((b) => b.bg.disableInteractive());
      this.continueButton.bg.setVisible(true);
      this.continueButton.text.setVisible(true);
    } else {
      button.bg.setFillStyle(quoteStyle.colorWrong);
    }
  }

  buildContinueButton() {
    this.continueButton = this.makeButton(W / 2, H * 0.92, 'Далее', () => {
      finishMinigameAndAdvance(this, this.storySceneIndex, this.minigameId);
    }, 240, 70, '28px');
    this.continueButton.bg.setVisible(false);
    this.continueButton.text.setVisible(false);
  }

  openPause() {
    this.scene.pause();
    this.scene.launch('PauseScene', { returnSceneKey: 'QuoteMinigameScene' });
  }

  makeButton(x, y, label, onClick, w = 120, h = 40, fontSize = '20px') {
    const bg = this.add.rectangle(x, y, w, h, 0xd9d9d9).setInteractive({ useHandCursor: true });
    const text = this.add.text(x, y, label, { fontSize, color: '#000000', align: 'center' }).setOrigin(0.5);
    bg.on('pointerup', onClick);
    return { bg, text };
  }

  shuffle(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
}
