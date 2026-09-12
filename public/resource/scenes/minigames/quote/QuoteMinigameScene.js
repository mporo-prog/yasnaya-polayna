(function () {
  const WIDTH = 1920;
  const HEIGHT = 1080;

  /**
   * QuoteMinigameScene — мини-игра "определи правильное начало/продолжение
   * цитаты". Контент — в data/minigames/quote/quoteData.js, стиль — в
   * data/minigames/quote/quoteStyle.js, здесь только логика/отрисовка.
   */
  class QuoteMinigameScene extends Phaser.Scene {
    constructor() {
      super('QuoteMinigameScene');
    }

    init(data) {
      this.storySceneIndex = data.storySceneIndex;
      this.minigameId = data.minigameId;
      this.solved = false;

      this.quoteData = window.VN.data.quoteData;
      this.style = window.VN.data.quoteStyle;
    }

    create() {
      this.buildPortraitPlaceholder();
      this.buildTopButtons();
      this.buildQuoteRow();
      this.buildAnswerButtons();
      this.buildContinueButton();
    }

    // ---- статичные части экрана ------------------------------------------

    buildPortraitPlaceholder() {
      this.add.rectangle(0, 0, WIDTH, HEIGHT, this.style.backgroundColor).setOrigin(0, 0);

      this.add.rectangle(WIDTH * 0.04, HEIGHT * 0.08, WIDTH * 0.35, HEIGHT * 0.83, this.style.portraitColor).setOrigin(0, 0);
      this.add
        .text(WIDTH * 0.12, HEIGHT * 0.28, 'здесь будет\nизображение\n' + this.quoteData.characterLabel, {
          fontSize: '46px',
          color: '#ffffff',
          lineSpacing: 10,
        })
        .setOrigin(0, 0);
    }

    buildTopButtons() {
      this.makeButton(WIDTH - 95, 45, 'кнопка\nменю', () => this.openPauseMenu(), 150, 80);
    }

    buildQuoteRow() {
      const mode = this.quoteData.mode;
      const prompt = this.quoteData.prompt;
      const startX = WIDTH * 0.465;
      const y = HEIGHT * 0.22;

      if (mode === 'prefix') {
        this.blankRect = this.add.rectangle(startX, y, 480, 60, this.style.colorWrong).setOrigin(0, 0.5);
        this.promptText = this.add
          .text(startX + 500, y, ' ' + prompt, { fontSize: '40px', color: '#000000' })
          .setOrigin(0, 0.5);
      } else {
        this.promptText = this.add
          .text(startX, y, prompt + ' ', { fontSize: '40px', color: '#000000' })
          .setOrigin(0, 0.5);
        const blankX = startX + this.promptText.width;
        this.blankRect = this.add.rectangle(blankX, y, 480, 60, this.style.colorWrong).setOrigin(0, 0.5);
      }
    }

    revealAnswerInQuote() {
      const answer = this.quoteData.answer;
      const x = this.blankRect.x;
      const y = this.blankRect.y;
      this.blankRect.destroy();
      this.answerText = this.add.text(x, y, answer, { fontSize: '40px', color: '#000000' }).setOrigin(0, 0.5);
    }

    // ---- варианты ответа ----------------------------------------------------

    buildAnswerButtons() {
      const options = this.shuffle(
        [{ text: this.quoteData.answer, correct: true }].concat(
          this.quoteData.distractors.map(function (text) {
            return { text: text, correct: false };
          })
        )
      );

      this.answerButtons = options.map((option, i) => this.buildOneAnswerButton(option, this.style.slots[i]));
    }

    buildOneAnswerButton(option, slotDef) {
      const x = WIDTH * slotDef.xFrac;
      const y = HEIGHT * slotDef.yFrac;
      const w = slotDef.w;
      const h = slotDef.h;

      const bg = this.add.rectangle(x, y, w, h, this.style.colorDefault).setInteractive({ useHandCursor: true });
      const text = this.add
        .text(x, y, option.text, {
          fontSize: '28px',
          color: '#000000',
          align: 'center',
          wordWrap: { width: w - 20 },
        })
        .setOrigin(0.5);

      const button = { bg: bg, text: text, correct: option.correct, wasWrong: false };
      bg.on('pointerup', () => this.onAnswerClicked(button));
      return button;
    }

    onAnswerClicked(button) {
      if (this.solved) return;

      if (button.correct) {
        this.solved = true;
        button.bg.setFillStyle(this.style.colorCorrect);
        this.revealAnswerInQuote();
        this.disableAllAnswerButtons();
        this.continueButton.bg.setVisible(true);
        this.continueButton.text.setVisible(true);
      } else {
        // Ничего не сбрасывается: помечаем красным один раз, игрок
        // может пробовать остальные варианты сколько угодно.
        button.wasWrong = true;
        button.bg.setFillStyle(this.style.colorWrong);
      }
    }

    disableAllAnswerButtons() {
      this.answerButtons.forEach(function (b) { b.bg.disableInteractive(); });
    }

    // ---- завершение мини-игры -----------------------------------------------

    buildContinueButton() {
      this.continueButton = this.makeButton(WIDTH / 2, HEIGHT * 0.92, 'Далее', () => this.finishMinigame(), 240, 70, '28px');
      this.continueButton.bg.setVisible(false);
      this.continueButton.text.setVisible(false);
    }

    finishMinigame() {
      window.VN.systems.finishMinigameAndAdvance(this, this.storySceneIndex, this.minigameId);
    }

    openPauseMenu() {
      this.scene.pause();
      this.scene.launch('PauseScene', { returnSceneKey: 'QuoteMinigameScene' });
    }

    // ---- утилиты ---------------------------------------------------------------

    makeButton(x, y, label, onClick, w, h, fontSize) {
      w = w || 120; h = h || 40; fontSize = fontSize || '20px';
      const bg = this.add.rectangle(x, y, w, h, 0xd9d9d9).setInteractive({ useHandCursor: true });
      const text = this.add.text(x, y, label, { fontSize: fontSize, color: '#000000', align: 'center' }).setOrigin(0.5);
      bg.on('pointerup', onClick);
      return { bg: bg, text: text };
    }

    shuffle(array) {
      const copy = array.slice();
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = copy[i];
        copy[i] = copy[j];
        copy[j] = tmp;
      }
      return copy;
    }
  }

  window.VN.scenes.QuoteMinigameScene = QuoteMinigameScene;
})();
