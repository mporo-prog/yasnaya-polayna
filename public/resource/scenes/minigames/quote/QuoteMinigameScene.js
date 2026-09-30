(function () {
  const WIDTH = 1920;
  const HEIGHT = 1080;

  const IMG = {
    background: 'quoteBackground',
    hero: 'quoteHero',
    plazka: 'quotePlazka',
    dialog: 'dialogTextBg', // тот же ключ и файл, что в StoryScene
    next: 'images/icon_UI/next_button.png',
    pause: 'images/icon_UI/pause_button.png',
    // Плашка экрана правил и финального экрана — тот же файл и тот же
    // размер, что в GameScene1-3 (public/images/icon_UI/instruction_panel.png).
    instructionPanel: 'images/icon_UI/instruction_panel.png',
  };

  // Короткие звуки-реакции на ответ (папка ui/ — как остальные интерфейсные
  // звуки, громкость общая с настройками «Громкость звуков»). Файлов пока
  // нет — фоновая музыка сцены задана в data/sceneAudio.js, а эти два нужно
  // положить в public/resource/sound/ui/ под именами ниже (или поменять
  // пути тут), когда они появятся — код уже готов их проиграть.
  const SND = {
    correct: 'ui/quote_answer_correct.mp3',
    wrong: 'ui/quote_answer_wrong.mp3',
    // Озвучка экрана правил — как gameplay_scene_2_rasskazchik_all.wav
    // в GameScene2: пока рассказчик озвучивает правила, экран не даёт
    // играть и закрывается сам (см. showRulesScreen). Файла тоже пока нет.
    rules: 'voice_and_sound/quote_game_rules.mp3',
  };

  // Панель правил/финала — тот же размер, что в GameScene1-3.
  const RESULT_PANEL_WIDTH = 1200;
  const RESULT_PANEL_HEIGHT = 577;

  /**
   * Пока звуковых файлов нет (см. SND выше), Phaser не просто промолчит —
   * AudioManager.add/play бросают исключение ("Audio key ... missing from
   * cache"), которое прерывает всю сцену. SceneAudio.js на такой случай
   * оборачивает каждый вызов в try/catch и пишет предупреждение в консоль
   * (см. её функцию run()) — делаем то же самое здесь.
   */
  function safeSound(action) {
    try {
      return action();
    } catch (error) {
      console.warn('[QuoteMinigameScene]', error.message);
      return null;
    }
  }

  /**
   * QuoteMinigameScene — мини-игра «Продолжите цитату». Раунды —
   * data/minigames/quote/quoteData.js, внешний вид —
   * data/minigames/quote/quoteStyle.js.
   *
   * Раунд: цитата с пустой рамкой и три плашки-варианта. Неправильный
   * вариант закрывается красной накладкой. После правильного цитата
   * собирается целиком, варианты исчезают, снизу появляется диалоговая
   * плашка героя (как в сюжетной сцене) со своей репликой; стрелка на
   * плашке ведёт к следующему раунду, после последнего — дальше по сюжету.
   *
   * У раунда есть mode:
   *   'prefix' — рамка-пропуск сверху, известный текст (prompt) под ней;
   *   'suffix' — известный текст (prompt) сверху, рамка-пропуск под ним;
   *   'middle' — рамка-пропуск ПОСЕРЕДИНЕ: текст до неё (prefix) сверху,
   *              текст после (suffix) снизу — три строки друг под другом.
   */
  class QuoteMinigameScene extends Phaser.Scene {
    constructor() {
      super('QuoteMinigameScene');
    }

    // Картинки грузятся общей очередью SceneAssets (с экраном загрузки и
    // предзагрузкой во время предыдущей сюжетной сцены).
    getAssetManifest() {
      return {
        images: [
          { key: IMG.background, url: 'images/backgrounds/plug.png' },
          // ВАЖНО: путь без "public/" (как и у остальных ассетов — Vite
          // сам отдаёт содержимое public/ с корня сайта, "public/" в самом
          // пути даёт 404). А "й" здесь — специально через ̆
          // (Unicode-комбинирующий значок), а не обычная буква: имя файла
          // на диске сохранено в NFD-форме (и + ̆ отдельно, так сохраняет
          // git/файловая система), и просто набранная "й" (NFC, слитная)
          // с этим именем побайтово не совпадает — картинка не находится.
          { key: IMG.hero, url: 'images/hero/Толсто_1'},
          { key: IMG.plazka, url: 'images/icon_UI/rectangle_game5.png' },
          { key: IMG.dialog, url: 'images/icon_UI/dialog_text_bg.png' },
          { key: IMG.next, url: IMG.next },
          { key: IMG.pause, url: IMG.pause },
          { key: IMG.instructionPanel, url: IMG.instructionPanel },
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
      this.quoteParts = [];
      this.answerButtons = null;

      // Три состояния, как в GameScene2: rules → game → win.
      this.phase = 'rules';
      this.rulesVoice = null;
      this.rulesTimer = null;
      this.rulesOverlay = null;
      this.winOverlay = null;
    }

    preload() {
      window.VN.systems.SceneAssets.preload(this);
      // Фоновую музыку из data/sceneAudio.js уже загружает SceneAssets, а
      // звуки правильного/неправильного ответа и озвучка правил —
      // событийные, не «фоновые» (не привязаны к входу в сцену/экран),
      // поэтому грузим их отдельно.
      window.VN.systems.AudioManager.load(this, SND.correct);
      window.VN.systems.AudioManager.load(this, SND.wrong);
      window.VN.systems.AudioManager.load(this, SND.rules);
    }

    create() {
      window.VN.systems.SceneAudio.enter(this);
      this.layout = window.VN.systems.Layout;

      // Под фоном — сплошная подложка на весь экран, включая поля (холст
      // игры чёрный, а фон полупрозрачный). Сам фон растягивается на весь
      // экран через Layout; прозрачность ставится на весь «сценический»
      // контейнер, вместе с зеркальными копиями для широких экранов.
      this.layout.fill(this, this.add.rectangle(0, 0, WIDTH, HEIGHT, this.style.backgroundColor));
      this.layout.addBackground(this, IMG.background).stage.setAlpha(this.style.backgroundAlpha);

      // Герой и диалоговая плашка — в одной группе, прижатой к нижнему краю
      // экрана (как в StoryScene): на планшете 4:3 они не «висят» в середине.
      this.bottomGroup = this.add.container(0, 0).setDepth(5);
      this.buildHero();
      this.buildReplyPanel();
      this.layout.onLayout(this, (visible, ui) => {
        this.bottomGroup.y = ui.bottom - HEIGHT;
      });

      this.buildPauseButton();

      // Сначала создаём оба overlay (правила/финал) — как в GameScene2 —
      // и только потом показываем правила; сам первый раунд соберётся
      // в startGameAfterRules(), когда игрок дослушает/дождётся правила.
      this.createRulesOverlay();
      this.createWinOverlay();

      this.events.on(Phaser.Scenes.Events.RESUME, this.handleResume, this);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.stopRulesVoice());

      window.VN.systems.SceneAssets.prefetchNext(this);
      this.showRulesScreen();
    }

    // ---- экран правил и финальный экран -----------------------------------

    /** Общая заготовка плашки: картинка + заголовок + текст, по центру экрана. */
    buildResultPanel(title, body) {
      const panelX = WIDTH / 2;
      const panelY = HEIGHT / 2;

      const panel = this.add
        .image(panelX, panelY, IMG.instructionPanel)
        .setOrigin(0.5)
        .setDisplaySize(RESULT_PANEL_WIDTH, RESULT_PANEL_HEIGHT);

      const titleText = this.add
        .text(panelX, panelY - 135, title, {
          fontFamily: 'Philosopher',
          fontSize: '48px',
          color: '#3F2F22',
          align: 'center',
        })
        .setOrigin(0.5);

      const bodyText = this.add
        .text(panelX, panelY + 15, body, {
          fontFamily: 'Ysabeau',
          fontSize: '36px',
          color: '#1B1A19',
          align: 'center',
          lineSpacing: 12,
          wordWrap: { width: 1100 },
        })
        .setOrigin(0.5);

      // Общая тёмная подложка на весь экран — гасит игру под плашкой.
      const dim = this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x000000, 0.45).setOrigin(0);
      this.layout.fill(this, dim);

      return { dim: dim, panel: panel, title: titleText, body: bodyText };
    }

    /**
     * Экран правил: показывается один раз при входе в игру и закрывается
     * сам — либо когда рассказчик дочитает озвучку правил, либо по
     * таймеру (на случай, если браузер не даёт звук или файла ещё нет).
     * Кнопка «Далее» на этом экране декоративная — нажать её нельзя.
     */
    createRulesOverlay() {
      const parts = this.buildResultPanel(
        'Правила игры',
        'Прочитайте цитату и выберите слово, которое в ней пропущено.\n' +
          'Неправильный вариант закроется красным — пробуйте другой.'
      );

      const nextIcon = this.add.image(
        WIDTH / 2 + RESULT_PANEL_WIDTH / 2 - 110,
        HEIGHT / 2 + RESULT_PANEL_HEIGHT / 2 - 110,
        IMG.next
      ).setDisplaySize(150, 150);

      this.rulesOverlay = this.add
        .container(0, 0, [parts.dim, parts.panel, parts.title, parts.body, nextIcon])
        .setDepth(50)
        .setVisible(false);
    }

    /**
     * Финальный экран: показывается после того, как игрок закрыл реплику
     * героя в последнем раунде. Кнопка «Далее» здесь настоящая — по клику
     * мини-игра завершается и сюжет продолжается (finishMinigame).
     */
    createWinOverlay() {
      const parts = this.buildResultPanel('Ура, победа!', 'Вы успешно продолжили все цитаты.');

      const nextBtn = this.makeIconButton(
        WIDTH / 2 + RESULT_PANEL_WIDTH / 2 - 110,
        HEIGHT / 2 + RESULT_PANEL_HEIGHT / 2 - 110,
        IMG.next,
        () => this.finishMinigame(),
        150
      );

      this.winOverlay = this.add
        .container(0, 0, [parts.dim, parts.panel, parts.title, parts.body, nextBtn])
        .setDepth(50)
        .setVisible(false);
    }

    showRulesScreen() {
      this.phase = 'rules';
      this.rulesOverlay.setVisible(true);
      this.stopRulesVoice();

      // Если аудио недоступно ИЛИ файла ещё нет (см. SND.rules выше) —
      // не блокируем игрока навсегда: сразу переходим к игре по таймеру.
      this.rulesVoice = window.VN.systems.AudioManager
        ? safeSound(() => window.VN.systems.AudioManager.add(this, SND.rules))
        : null;

      const finishRules = () => this.startGameAfterRules();

      if (this.rulesVoice) {
        this.rulesVoice.once('complete', finishRules);
        safeSound(() => this.rulesVoice.play());
      }

      // Запасной таймер — на случай, если браузер не пришлёт 'complete'
      // (или звукового файла ещё нет, как сейчас).
      const duration = Math.max(4000, (this.rulesVoice?.totalDuration || 0) * 1000 + 500);
      this.rulesTimer = this.time.delayedCall(duration, finishRules);
    }

    stopRulesVoice() {
      if (this.rulesTimer) {
        this.rulesTimer.remove();
        this.rulesTimer = null;
      }
      if (this.rulesVoice) {
        safeSound(() => this.rulesVoice.stop());
        safeSound(() => this.rulesVoice.destroy());
        this.rulesVoice = null;
      }
    }

    startGameAfterRules() {
      this.stopRulesVoice();
      this.rulesOverlay.setVisible(false);
      this.phase = 'game';
      this.startRound(this.currentRoundIndex);
    }

    /** Пауза во время правил останавливает озвучку; после Resume — правила начинаются заново. */
    handleResume() {
      if (this.phase === 'rules') this.showRulesScreen();
    }

    showFinishScreen() {
      this.phase = 'win';
      this.winOverlay.setVisible(true);
    }

    // ---- статичные части экрана ------------------------------------------

    buildHero() {
      const hero = this.style.hero;
      const image = this.add.image(hero.x, hero.bottom, IMG.hero).setOrigin(0.5, 1).setScale(hero.scale);
      this.bottomGroup.add(image);
    }

    buildPauseButton() {
      const button = this.makeIconButton(105, 100, IMG.pause, () => this.openPauseMenu(), 150);
      button.setDepth(20);
      // Левый верхний угол экрана с учётом выреза телефона — как в StoryScene.
      this.layout.pin(this, button, { left: 105, top: 100 });
    }

    /**
     * Диалоговая плашка после правильного ответа — та же картинка и тот же
     * макет, что в сюжетной сцене: имя слева, вертикальная черта (часть
     * картинки), реплика справа, стрелка «далее» на правом краю.
     * Строится один раз, между раундами меняется только текст.
     */
    buildReplyPanel() {
      const style = this.style;
      const tex = this.textures.get(IMG.dialog).getSourceImage();
      const panelWidth = tex.width;
      const panelHeight = tex.height;
      const panelLeft = WIDTH / 2 - panelWidth / 2;
      const panelY = HEIGHT - panelHeight - style.panelBottomMargin;
      const panelCenterY = panelY + panelHeight / 2;
      // Вертикальная черта нарисована в картинке на x≈437 из 1589.
      const dividerX = panelLeft + panelWidth * (437 / 1589);

      const panelBg = this.add.image(WIDTH / 2, panelY, IMG.dialog).setOrigin(0.5, 0);

      this.replyNameText = this.add
        .text(panelLeft + 95, panelCenterY, '', {
          fontFamily: 'Philosopher',
          fontStyle: 'bold',
          fontSize: style.nameFontSize + 'px',
          color: style.textColor,
          lineSpacing: 4,
          wordWrap: { width: dividerX - panelLeft - 130 },
        })
        .setOrigin(0, 0.5);

      const textX = dividerX + 68;
      this.replyBodyText = this.add
        .text(textX, panelCenterY, '', {
          fontFamily: 'Ysabeau',
          fontSize: style.replyFontSize + 'px',
          color: '#1B1A19',
          lineSpacing: 12,
          wordWrap: { width: panelLeft + panelWidth - textX - 150 },
        })
        .setOrigin(0, 0.5);

      const nextBtn = this.makeIconButton(panelLeft + panelWidth - 28, panelCenterY, IMG.next, () => this.onContinueClicked());

      this.replyPanelParts = [panelBg, this.replyNameText, this.replyBodyText, nextBtn];
      this.bottomGroup.add(this.replyPanelParts);
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

    // ---- раунд -------------------------------------------------------------

    startRound(index) {
      this.roundSolved = false;
      this.currentRound = this.rounds[index];
      this.buildQuote();
      this.buildAnswerButtons();
    }

    clearRound() {
      this.quoteParts.forEach((part) => part.destroy());
      this.quoteParts = [];
      if (this.answerButtons) {
        this.answerButtons.forEach((b) => { b.bg.destroy(); b.overlay.destroy(); b.text.destroy(); });
        this.answerButtons = null;
      }
      this.hideReplyPanel();
    }

    quoteTextStyle() {
      const style = this.style;
      return {
        fontFamily: style.quoteFontFamily,
        fontStyle: 'bold',
        fontSize: style.quoteFontSize + 'px',
        color: style.textColor,
        wordWrap: { width: style.quoteWrapWidth },
      };
    }

    /** Кавычка, «висящая» слева от первой строки цитаты. */
    addOpeningMark(y) {
      const mark = this.add.text(this.style.quoteX - 12, y, '“', this.quoteTextStyle()).setOrigin(1, 0);
      this.quoteParts.push(mark);
    }

    /**
     * Цитата с пустой рамкой:
     *   'suffix' — текст (prompt), под ним рамка;
     *   'prefix' — рамка, под ней текст (prompt);
     *   'middle' — текст (prefix), под ним рамка, под ней текст (suffix).
     * Закрывающая кавычка — после последней части.
     */
    buildQuote() {
      const style = this.style;
      const x = style.quoteX;
      let y = style.quoteY;
      this.addOpeningMark(y);

      const addLine = (str) => {
        const text = this.add.text(x, y, str, this.quoteTextStyle());
        this.quoteParts.push(text);
        y += text.height + 20;
        return text;
      };
      const addBlank = () => {
        const blank = this.add
          .rectangle(x, y, style.blankWidth, style.blankHeight)
          .setOrigin(0, 0)
          .setStrokeStyle(style.blankStrokeWidth, style.blankStrokeColor);
        this.quoteParts.push(blank);
        y += style.blankHeight + 20;
        return blank;
      };

      const mode = this.currentRound.mode;
      let last;
      if (mode === 'prefix') {
        addBlank();
        last = addLine(this.currentRound.prompt);
      } else if (mode === 'middle') {
        addLine(this.currentRound.prefix);
        addBlank();
        last = addLine(this.currentRound.suffix);
      } else {
        addLine(this.currentRound.prompt);
        last = addBlank();
      }
      const closeX = last.x + (last.displayWidth || last.width) + 18;
      this.quoteParts.push(this.add.text(closeX, last.y, '”', this.quoteTextStyle()));

      // Запоминаем, где на самом деле закончилась цитата в ЭТОМ раунде —
      // addLine()/addBlank() уже учли перенос строк (wordWrap) и число строк
      // (у 'middle' их на одну больше). buildAnswerButtons() использует это,
      // чтобы не дать плашкам-вариантам наехать на длинную цитату.
      this.quoteBottomY = y;
    }

    /** После правильного ответа: цитата целиком, в две строки, ниже. */
    buildSolvedQuote() {
      const style = this.style;
      this.quoteParts.forEach((part) => part.destroy());
      this.quoteParts = [];

      const round = this.currentRound;
      let lines;
      if (round.mode === 'prefix') {
        lines = [round.answer, round.prompt];
      } else if (round.mode === 'middle') {
        // "Надо жить, надо" / "        любить, надо верить." — вторая
        // строка начинается с ответа и продолжается известным суффиксом.
        lines = [round.prefix, round.answer + round.suffix];
      } else {
        lines = [round.prompt, round.answer];
      }

      let y = style.solvedQuoteY;
      this.addOpeningMark(y);
      const first = this.add.text(style.quoteX, y, lines[0], this.quoteTextStyle());
      y += first.height + 4;
      const second = this.add.text(style.quoteX + style.solvedSecondLineIndent, y, lines[1] + ' ”', {
        ...this.quoteTextStyle(),
        wordWrap: { width: style.quoteWrapWidth - style.solvedSecondLineIndent },
      });
      this.quoteParts.push(first, second);
    }

    // ---- варианты ответа ---------------------------------------------------

    buildAnswerButtons() {
      const options = this.shuffle(
        [{ text: this.currentRound.answer, correct: true }].concat(
          this.currentRound.distractors.map((text) => ({ text: text, correct: false }))
        )
      );

      // style.slots подобраны под "обычную" короткую цитату
      // (answerAreaDesignedTopY). Если в ЭТОМ раунде цитата длиннее —
      // из-за переноса строк или режима 'middle' (три строки вместо
      // двух) — сдвигаем все три плашки вниз на одну и ту же величину,
      // чтобы они не наезжали на текст, но остались друг относительно
      // друга в том же треугольном расположении.
      const overflow = this.quoteBottomY - this.style.answerAreaDesignedTopY;
      this.answerAreaShiftY = Math.max(0, overflow);

      this.answerButtons = options.map((option, i) => this.buildOneAnswerButton(option, this.style.slots[i]));
    }

    buildOneAnswerButton(option, slotDef) {
      const style = this.style;
      const slot = { x: slotDef.x, y: slotDef.y + this.answerAreaShiftY };
      const text = this.add
        .text(slot.x, slot.y, option.text, {
          fontFamily: style.quoteFontFamily,
          fontStyle: 'bold',
          fontSize: style.answerFontSize + 'px',
          color: style.textColor,
          align: 'center',
        })
        .setOrigin(0.5);
      // Высота плашки — родная высота картинки; ширина — не меньше родной
      // и растягивается под длинный текст.
      const tex = this.textures.get(IMG.plazka).getSourceImage();
      const height = tex.height;
      const width = Math.max(tex.width, text.width + style.answerPaddingX * 2);

      const bg = this.add
        .image(slot.x, slot.y, IMG.plazka)
        .setDisplaySize(width, height)
        .setInteractive({ useHandCursor: true });
      // Накладка — та же картинка, залитая красным: повторяет форму плашки.
      const overlay = this.add
        .image(slot.x, slot.y, IMG.plazka)
        .setDisplaySize(width, height)
        .setTintFill(style.colorWrong)
        .setAlpha(style.overlayAlpha)
        .setVisible(false);
      text.setDepth(1); // текст поверх плашки и накладки

      const button = { bg: bg, overlay: overlay, text: text, correct: option.correct };
      bg.on('pointerup', () => this.onAnswerClicked(button));
      return button;
    }

    onAnswerClicked(button) {
      if (this.roundSolved || this.gameFinished) return;

      if (!button.correct) {
        // Ничего не сбрасывается: можно пробовать остальные варианты.
        safeSound(() => window.VN.systems.AudioManager.play(this, SND.wrong));
        button.overlay.setVisible(true);
        button.bg.disableInteractive();
        return;
      }

      safeSound(() => window.VN.systems.AudioManager.play(this, SND.correct));
      this.roundSolved = true;
      if (this.isLastRound()) this.gameFinished = true;
      this.answerButtons.forEach((b) => { b.bg.destroy(); b.overlay.destroy(); b.text.destroy(); });
      this.answerButtons = null;
      this.buildSolvedQuote();
      this.showReplyPanel(this.currentRound);
    }

    isLastRound() {
      return this.currentRoundIndex === this.rounds.length - 1;
    }

    // ---- переходы ----------------------------------------------------------

    onContinueClicked() {
      if (!this.roundSolved) return;
      if (this.gameFinished) {
        this.showFinishScreen();
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
      // Пока идут правила — полностью останавливаем их озвучку, чтобы она
      // не звучала поверх меню паузы. После Resume правила покажутся и
      // озвучатся заново (см. handleResume).
      if (this.phase === 'rules') this.stopRulesVoice();
      // ВАЖНО: PauseScene зарегистрирована в main.js РАНЬШЕ QuoteMinigameScene,
      // а Phaser рисует сцены в порядке их регистрации, а не в порядке
      // scene.launch() — если не поднять PauseScene наверх явно, она
      // окажется отрисована ПОД текущей сценой и будет невидима, хотя
      // формально активна и кликабельна. Поэтому launch делаем ДО pause
      // (чтобы сцена уже существовала) и сразу после — bringToTop.
      this.scene.launch('PauseScene', { returnSceneKey: 'QuoteMinigameScene' });
      this.scene.pause();
      this.scene.bringToTop('PauseScene');
    }

    // ---- утилиты -----------------------------------------------------------

    /** Кнопка-картинка, как в StoryScene. */
    makeIconButton(x, y, texture, onClick, displaySize) {
      const img = this.add.image(x, y, texture).setInteractive({ useHandCursor: true });
      if (displaySize) img.setDisplaySize(displaySize, displaySize);
      img.on('pointerup', onClick);
      return img;
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