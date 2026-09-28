(function () {
  const WIDTH = 1920;
  const HEIGHT = 1080;
  // const WIDTH = window.innerWidth;
  // const HEIGHT = window.innerHeight;

  /**
   * QuoteMinigameScene — мини-игра "определи правильное начало/продолжение
   * цитаты". Три раунда. Контент — в data/minigames/quote/quoteData.js,
   * стиль — в data/minigames/quote/quoteStyle.js, здесь только логика/отрисовка.
   */
  class QuoteMinigameScene extends Phaser.Scene {
    constructor() {
      super('QuoteMinigameScene');
    }

    getAssetManifest() {
      return {
        images: [
          { key: 'quotePlug', url: 'images/backgrounds/plug.png' },
          { key: 'quoteHero', url: 'images/hero/Толстой_1.png' },
          { key: 'quotePlazka', url: 'images/ui/plazka_game_5.png' },
          { key: 'quoteNextBtn', url: 'images/icon_UI/next_button.png' },
        ],
      };
    }

    init(data) {
      this.storySceneIndex = data.storySceneIndex;
      this.minigameId = data.minigameId;

      this.quoteData = window.VN.data.quoteData;
      this.style = window.VN.data.quoteStyle;
      this.rounds = this.quoteData.rounds;

      this.currentRoundIndex = 0;
      this.roundSolved = false;
      this.gameFinished = false;
    }

    preload() {
      window.VN.systems.SceneAssets.preload(this);
    }

    create() {
      window.VN.systems.SceneAudio.enter(this);
      this.layout = window.VN.systems.Layout;
      this.buildBackground();
      this.buildHero();
      this.buildTopButtons();
      this.buildRoundCounter();
      this.buildReplyPanel();
      this.startRound(this.currentRoundIndex);
      window.VN.systems.SceneAssets.prefetchNext(this);
    }

    // ---- статичные части экрана ------------------------------------------

    buildBackground() {
      // Фон — на весь экран, включая поля (Layout.addBackground сам
      // растягивает картинку 1920×1080 под любые пропорции экрана).
      this.layout.addBackground(this, 'quotePlug');
    }

    buildHero() {
      // Портрет героя — прижат к левому краю, снизу; масштабируется, чтобы
      // не перекрывать весь фон (тот же приём, что и в StoryScene.setCharacter()).
      const tex = this.textures.get('quoteHero').getSourceImage();
      const maxHeight = HEIGHT * 0.83;
      const scale = Math.min(1, maxHeight / tex.height);
      this.add.image(WIDTH * 0.045, HEIGHT * 0.91, 'quoteHero').setOrigin(0, 1).setScale(scale);
    }

    buildTopButtons() {
      const menu = this.makeButton(WIDTH - 95, 45, 'кнопка\nменю', () => this.openPauseMenu(), 150, 80);
      // Кнопка меню — в правом верхнем углу экрана (с учётом выреза телефона).
      window.VN.systems.Layout.pin(this, menu.bg, { right: 95, top: 45 });
      window.VN.systems.Layout.pin(this, menu.text, { right: 95, top: 45 });
    }

    buildRoundCounter() {
      this.roundCounterText = this.add
        .text(WIDTH * 0.465, HEIGHT * 0.10, '', {
          fontSize: '32px',
          color: '#333333',
        })
        .setOrigin(0, 0.5);
      this.updateRoundCounter();
    }

    updateRoundCounter() {
      this.roundCounterText.setText(
        'Раунд ' + (this.currentRoundIndex + 1) + ' из ' + this.rounds.length
      );
    }

    // ---- логика раунда ------------------------------------------------------

    startRound(index) {
      this.roundSolved = false;
      this.currentRound = this.rounds[index];

      this.buildQuoteRow();
      this.buildAnswerButtons();
      this.updateRoundCounter();
    }

    clearRound() {
      if (this.promptText) this.promptText.destroy();
      if (this.blankRect) this.blankRect.destroy();
      if (this.answerText) this.answerText.destroy();

      if (this.answerButtons) {
        this.answerButtons.forEach(function (b) {
          b.bg.destroy();
          b.overlay.destroy();
          b.text.destroy();
        });
        this.answerButtons = null;
      }

      this.hideReplyPanel();

      this.promptText = null;
      this.blankRect = null;
      this.answerText = null;
    }

    buildQuoteRow() {
        const mode = this.currentRound.mode;
        const prompt = this.currentRound.prompt;

        const startX = WIDTH * 0.465;
        const y = HEIGHT * 0.22;

        const rightMargin = 60;
        const maxBlankWidth = 480;
        const minBlankWidth = 220;

        if (mode === 'prefix') {

            this.blankRect = this.add.rectangle(
                startX,
                y,
                maxBlankWidth,
                60,
                this.style.colorBlank
            ).setOrigin(0, 0.5);

            this.promptText = this.add.text(
                startX + maxBlankWidth + 20,
                y,
                prompt,
                {
                    fontSize: '40px',
                    color: '#000000',
                    wordWrap: {
                        width: WIDTH - (startX + maxBlankWidth + 20) - rightMargin
                    }
                }
            ).setOrigin(0, 0.5);

        } else {

            this.promptText = this.add.text(
                startX,
                y,
                prompt,
                {
                    fontSize: '40px',
                    color: '#000000',
                    wordWrap: {
                        width: WIDTH - startX - maxBlankWidth - rightMargin
                    }
                }
            ).setOrigin(0, 0.5);

            const blankX = startX + this.promptText.width + 20;

            const availableWidth =
                WIDTH - blankX - rightMargin;

            const blankWidth = Math.min(
                maxBlankWidth,
                Math.max(minBlankWidth, availableWidth)
            );

            this.blankRect = this.add.rectangle(
                blankX,
                y,
                blankWidth,
                60,
                this.style.colorBlank
            ).setOrigin(0, 0.5);
        }
    }

    revealAnswerInQuote() {
      const mode = this.currentRound.mode;
      const prompt = this.currentRound.prompt;
      const answer = this.currentRound.answer;
      const startX = WIDTH * 0.465;
      const rightMargin = 60;

      if (this.blankRect) {
          this.blankRect.destroy();
          this.blankRect = null;
      }

      if (mode === 'prefix') {
          // В этом режиме плашка стояла СЛЕВА (это было начало фразы),
          // а известный текст (prompt) — справа от неё. После ответа
          // собираем фразу целиком и ставим её с самого начала строки.
          this.promptText.setText(answer + ' ' + prompt);
          this.promptText.setPosition(startX, this.promptText.y);
          this.promptText.setWordWrapWidth(WIDTH - startX - rightMargin);
      } else {
          // mode === 'suffix': prompt слева, ответ — продолжение справа.
          this.promptText.setText(prompt + ' ' + answer);
          this.promptText.setWordWrapWidth(WIDTH - startX - rightMargin);
      }
  }

    // ---- варианты ответа ----------------------------------------------------

    buildAnswerButtons() {
      const options = this.shuffle(
        [{ text: this.currentRound.answer, correct: true }].concat(
          this.currentRound.distractors.map(function (text) {
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

      // Плашка варианта ответа — картинка, а не однотонный прямоугольник,
      // поэтому цвет ошибки/правильного ответа накладывается СВЕРХУ
      // полупрозрачной накладкой (overlay), см. onAnswerClicked().
      const bg = this.add.image(x, y, 'quotePlazka').setDisplaySize(w, h).setInteractive({ useHandCursor: true });
      const overlay = this.add.rectangle(x, y, w, h, this.style.colorWrong, this.style.overlayAlpha).setVisible(false);
      const text = this.add
        .text(x, y, option.text, {
          fontSize: '28px',
          color: '#000000',
          align: 'center',
          wordWrap: { width: w - 20 },
        })
        .setOrigin(0.5);

      const button = { bg: bg, overlay: overlay, text: text, correct: option.correct, wasWrong: false };
      bg.on('pointerup', () => this.onAnswerClicked(button));
      return button;
    }

    onAnswerClicked(button) {
      if (this.roundSolved || this.gameFinished) return;

      if (button.correct) {
        this.roundSolved = true;
        button.overlay.setFillStyle(this.style.colorCorrect, this.style.overlayAlpha).setVisible(true);
        this.revealAnswerInQuote();
        this.disableAllAnswerButtons();
        if (this.isLastRound()) this.gameFinished = true;
        this.showReplyPanel(this.currentRound);
      } else {
        // Ничего не сбрасывается: помечаем красной накладкой один раз,
        // игрок может пробовать остальные варианты сколько угодно.
        button.wasWrong = true;
        button.overlay.setFillStyle(this.style.colorWrong, this.style.overlayAlpha).setVisible(true);
      }
    }

    disableAllAnswerButtons() {
      if (!this.answerButtons) return;
      this.answerButtons.forEach(function (b) { b.bg.disableInteractive(); });
    }

    // ---- диалоговая плашка после правильного ответа ------------------------

    /**
     * Плашка с именем персонажа и репликой — появляется после правильного
     * ответа, как диалоговая плашка в сюжетной сцене (StoryScene.buildBottomBar()).
     * Строится один раз в create() и переиспользуется между раундами —
     * только текст меняется (см. showReplyPanel()/hideReplyPanel()).
     */
    buildReplyPanel() {
      const tex = this.textures.get('quotePlazka').getSourceImage();
      const panelWidth = WIDTH * 0.75;
      const panelHeight = panelWidth * (tex.height / tex.width);
      const panelY = HEIGHT - panelHeight - 40;
      const panelLeft = WIDTH / 2 - panelWidth / 2;
      const panelCenterY = panelY + panelHeight / 2;

      const panelBg = this.add.image(WIDTH / 2, panelY, 'quotePlazka').setOrigin(0.5, 0).setDisplaySize(panelWidth, panelHeight);

      // Имя героя слева, реплика справа — тот же макет, что в StoryScene.
      const nameAreaWidth = panelWidth * 0.32;
      const nameX = panelLeft + 65;
      const textX = panelLeft + nameAreaWidth + 20;

      const nameText = this.add
        .text(nameX, panelCenterY, '', {
          fontFamily: 'Philosopher',
          fontSize: '36px',
          color: '#6E6056',
          align: 'left',
          lineSpacing: 6,
        })
        .setOrigin(0, 0.5);

      const bodyText = this.add
        .text(textX, panelCenterY, '', {
          fontFamily: 'Ysabeau',
          fontSize: '30px',
          color: '#1B1A19',
          align: 'left',
          wordWrap: { width: panelLeft + panelWidth - textX - 90 },
        })
        .setOrigin(0, 0.5);

      const nextBtn = this.makeIconButton(
        panelLeft + panelWidth - 10,
        panelCenterY,
        'quoteNextBtn',
        () => this.onContinueClicked(),
        90
      );

      this.replyPanelParts = [panelBg, nameText, bodyText, nextBtn.bg];
      this.replyNameText = nameText;
      this.replyBodyText = bodyText;
      this.hideReplyPanel();
    }

    showReplyPanel(round) {
      this.replyNameText.setText(this.quoteData.characterName || '');
      this.replyBodyText.setText(round.replyText || '');
      this.replyPanelParts.forEach((part) => part.setVisible(true));
    }

    hideReplyPanel() {
      this.replyPanelParts.forEach((part) => part.setVisible(false));
    }

    /** Кнопка-иконка (картинка вместо прямоугольника с текстом) — как в StoryScene. */
    makeIconButton(x, y, texture, onClick, displaySize) {
      const img = this.add.image(x, y, texture).setInteractive({ useHandCursor: true });
      if (displaySize) img.setDisplaySize(displaySize, displaySize);
      img.on('pointerup', onClick);
      return { bg: img, text: null };
    }

    isLastRound() {
      return this.currentRoundIndex === this.rounds.length - 1;
    }

    // ---- завершение раунда / мини-игры --------------------------------------

    onContinueClicked() {
      // Кнопка "Далее" живёт внутри диалоговой плашки (buildReplyPanel())
      // и видна только когда раунд решён (showReplyPanel()/hideReplyPanel()).
      if (!this.roundSolved) return;

      if (this.gameFinished) {
        this.finishMinigame();
        return;
      }

      this.clearRound();
      this.currentRoundIndex++;
      this.startRound(this.currentRoundIndex);
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