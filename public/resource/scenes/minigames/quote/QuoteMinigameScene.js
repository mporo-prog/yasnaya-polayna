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
    instruction: 'images/icon_UI/text_bg.png',
    finish: 'images/icon_UI/finish_stats_panel.png',
  };

  // Плашка с правилами в начале — как в остальных мини-играх (игра 1).
  const INTRO_TEXT = 'Отгадай пропущенные слова';
  // Экран победы: небольшой заголовок и интересный факт.
  const WIN_TITLE = 'Игра пройдена!';
  const WIN_FACT = '';
  const INSTRUCTION_PANEL = { x: 310, y: 251, width: 1300, height: 577.04 };
  const INTRO_NEXT_ARROW = { x: 1600, y: 825, size: 150 };
    // Плашка экрана правил и финального экрана — тот же файл и тот же
    // размер, что в GameScene1-3 (public/images/icon_UI/text_bg.png).
    // instructionPanel: 'images/icon_UI/text_bg.png',

  // Короткие звуки-реакции на ответ. Фоновая музыка и озвучка правил
  // заданы в data/sceneAudio.js (QuoteMinigameScene).
  const SND = {
    correct: 'voice_and_sound/scene5_gameplay5/gameplay/gameplay5_vernyi_vybor.wav',
    wrong: 'voice_and_sound/scene5_gameplay5/gameplay/gameplay5_nevernyi_vybor.wav',
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
   * Раунд: цитата с подчёркиваниями и три плашки-варианта. Неправильный
   * вариант закрывается красной накладкой. После правильного цитата
   * собирается целиком, варианты исчезают, снизу появляется диалоговая
   * плашка героя (как в сюжетной сцене) со своей репликой; стрелка на
   * плашке ведёт к следующему раунду, после последнего — дальше по сюжету.
   *
   * У раунда есть mode:
   *   'prefix' — пропуск перед известным текстом (prompt);
   *   'suffix' — пропуск после известного текста (prompt);
   *   'middle' — пропуск между prefix и suffix внутри общего текста.
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
          { key: IMG.background, url: 'images/backgrounds/withoutTolstoy.png' },
          // ВАЖНО: путь без "public/" (как и у остальных ассетов — Vite
          // сам отдаёт содержимое public/ с корня сайта, "public/" в самом
          // пути даёт 404). А "й" здесь — специально через ̆
          // (Unicode-комбинирующий значок), а не обычная буква: имя файла
          // на диске сохранено в NFD-форме (и + ̆ отдельно, так сохраняет
          // git/файловая система), и просто набранная "й" (NFC, слитная)
          // с этим именем побайтово не совпадает — картинка не находится.
          { key: IMG.hero, url: 'images/hero/Толсто_1.png'},
          // Варианты ответа — на той же плашке, что кнопки меню.
          { key: IMG.plazka, url: 'images/icon_UI/main_button.png' },
          { key: IMG.dialog, url: 'images/icon_UI/dialog_text_bg.png' },
          { key: IMG.next, url: IMG.next },
          { key: IMG.pause, url: IMG.pause },
          { key: IMG.instruction, url: IMG.instruction },
          { key: IMG.finish, url: IMG.finish },
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
      this.winShown = false;
      this.quoteImage = null;
      this.quoteTexture = null;
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
      // Музыку и озвучку правил из data/sceneAudio.js уже загружает SceneAssets,
      // а звуки правильного/неправильного ответа — событийные, грузим их отдельно.
      window.VN.systems.AudioManager.load(this, SND.correct);
      window.VN.systems.AudioManager.load(this, SND.wrong);
    }

    create() {
      this.sceneAudio = window.VN.systems.SceneAudio.enter(this);
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
      this.startRound(this.currentRoundIndex);
      // Canvas-текстуру нужно пересчитать, если веб-шрифт пришёл позже сцены.
      const refreshQuote = () => {
        this.buildQuote();
        this.positionAnswerButtons();
      };
      document.fonts?.addEventListener('loadingdone', refreshQuote);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
        document.fonts?.removeEventListener('loadingdone', refreshQuote);
        this.clearQuote();
      });
      // Правила игры поверх первого раунда; «далее» обрывает озвучку рассказчика.
      this.showPanelOverlay(null, INTRO_TEXT, () => {
        this.phase = 'game';
        this.sceneAudio?.stopSounds?.();
      });
      window.VN.systems.SceneAssets.prefetchNext(this);
    }

      // Сначала создаём оба overlay (правила/финал) — как в GameScene2 —
      // и только потом показываем правила; сам первый раунд соберётся
//       // в startGameAfterRules(), когда игрок дослушает/дождётся правила.
//       this.createRulesOverlay();
//       this.createWinOverlay();

//       this.events.on(Phaser.Scenes.Events.RESUME, this.handleResume, this);
//       this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.stopRulesVoice());

    //   window.VN.systems.SceneAssets.prefetchNext(this);
    //   this.showRulesScreen();
    // }

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
          lineSpacing: 4,
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
    // createRulesOverlay() {
    //   const parts = this.buildResultPanel(
    //     'Правила игры',
    //     'Прочитайте цитату и выберите слово, которое в ней пропущено.\n' +
    //       'Неправильный вариант закроется красным — пробуйте другой.'
    //   );

    //   const nextIcon = this.add.image(
    //     WIDTH / 2 + RESULT_PANEL_WIDTH / 2 - 110,
    //     HEIGHT / 2 + RESULT_PANEL_HEIGHT / 2 - 110,
    //     IMG.next
    //   ).setDisplaySize(150, 150);

    //   this.rulesOverlay = this.add
    //     .container(0, 0, [parts.dim, parts.panel, parts.title, parts.body, nextIcon])
    //     .setDepth(50)
    //     .setVisible(false);
    // }

    /**
     * Финальный экран: показывается после того, как игрок закрыл реплику
     * героя в последнем раунде. Кнопка «Далее» здесь настоящая — по клику
     * мини-игра завершается и сюжет продолжается (finishMinigame).
     */
    // createWinOverlay() {
    //   const parts = this.buildResultPanel('Ура, победа!', 'Вы успешно продолжили все цитаты.');

    //   const nextBtn = this.makeIconButton(
    //     WIDTH / 2 + RESULT_PANEL_WIDTH / 2 - 110,
    //     HEIGHT / 2 + RESULT_PANEL_HEIGHT / 2 - 110,
    //     IMG.next,
    //     () => this.finishMinigame(),
    //     150
    //   );

    //   this.winOverlay = this.add
    //     .container(0, 0, [parts.dim, parts.panel, parts.title, parts.body, nextBtn])
    //     .setDepth(50)
    //     .setVisible(false);
    // }

    // showRulesScreen() {
    //   this.phase = 'rules';
    //   this.rulesOverlay.setVisible(true);
    //   this.stopRulesVoice();

    //   // Если аудио недоступно ИЛИ файла ещё нет (см. SND.rules выше) —
    //   // не блокируем игрока навсегда: сразу переходим к игре по таймеру.
    //   this.rulesVoice = window.VN.systems.AudioManager
    //     ? safeSound(() => window.VN.systems.AudioManager.add(this, SND.rules))
    //     : null;

    //   const finishRules = () => this.startGameAfterRules();

    //   if (this.rulesVoice) {
    //     this.rulesVoice.once('complete', finishRules);
    //     safeSound(() => this.rulesVoice.play());
    //   }

    //   // Запасной таймер — на случай, если браузер не пришлёт 'complete'
    //   // (или звукового файла ещё нет, как сейчас).
    //   const duration = Math.max(4000, (this.rulesVoice?.totalDuration || 0) * 1000 + 500);
    //   this.rulesTimer = this.time.delayedCall(duration, finishRules);
    // }

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

    /**
     * Затемнение, плашка с текстом (и небольшим заголовком, если он есть)
     * и стрелка «далее» — как в остальных мини-играх. Закрывается нажатием
     * в любом месте экрана, после чего вызывается onClose.
     */
    showPanelOverlay(title, text, onClose, texture = IMG.instruction) {
      const dim = this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x000000, 0.6)
        .setOrigin(0)
        .setInteractive({ useHandCursor: true });
      this.layout.fill(this, dim);

      const isFinish = texture === IMG.finish;
      // Сохраняем пропорции новой плашки (855 × 328), заголовок — по центру.
      const height = isFinish ? INSTRUCTION_PANEL.width * 328 / 855 : INSTRUCTION_PANEL.height;
      const p = { ...INSTRUCTION_PANEL, y: (HEIGHT - height) / 2, height };
      const centerX = p.x + p.width / 2;
      const panel = this.add.image(p.x, p.y, texture).setOrigin(0).setDisplaySize(p.width, p.height);
      const parts = [dim, panel];
      if (title) {
        parts.push(this.add.text(centerX, p.y + (text ? 120 : p.height / 2), title, {
          fontFamily: 'Philosopher',
          fontSize: '48px',
          color: '#6E6056',
          align: 'center',
        }).setOrigin(0.5));
        // Факт — под заголовком, шрифтом помельче.
        parts.push(this.add.text(centerX, p.y + p.height / 2 + 45, text, {
          fontFamily: 'Ysabeau',
          fontSize: '40px',
          color: '#1B1A19',
          align: 'center',
          lineSpacing: 2,
          wordWrap: { width: p.width - 200 },
        }).setOrigin(0.5));
      } else {
        parts.push(this.add.text(centerX, p.y + p.height / 2, text, {
          fontFamily: 'Philosopher',
          fontSize: '64px',
          color: '#6E6056',
          align: 'center',
          wordWrap: { width: p.width - 160 },
        }).setOrigin(0.5));
      }
      // Нажатие принимает вся подложка и сама стрелка «далее».
      const a = INTRO_NEXT_ARROW;
      const arrow = this.add.image(a.x, a.y, IMG.next).setOrigin(0).setInteractive({ useHandCursor: true });
      parts.push(arrow);
      this.layout.onLayout(this, (visible) => this.layout.placeNextArrow(this, arrow, visible));

      // Под паузой (depth 20), но над раундом и диалоговой плашкой.
      const overlay = this.add.container(0, 0, parts).setDepth(15);
      let closed = false;
      const close = () => {
        if (closed) return;
        closed = true;
        window.VN?.systems.AudioManager?.click?.(this);
        overlay.destroy();
        if (onClose) onClose();
      };
      dim.on('pointerup', close);
      arrow.on('pointerup', close);
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
      // Размер и левый верхний угол (с учётом выреза) — общие для всех сцен.
      this.layout.pinPauseButton(this, button);
    }

    /**
     * Диалоговая плашка после правильного ответа — та же картинка, те же
     * размеры, шрифты и места имени, реплики и стрелки «далее», что в
     * сюжетной сцене (общая раскладка Layout.dialogueLayout).
     * Строится один раз, между раундами меняется только текст.
     */
    buildReplyPanel() {
      const panelBg = this.add.image(0, 0, IMG.dialog).setOrigin(0, 0);
      this.replyNameText = this.add.text(0, 0, '', {
        fontFamily: 'Philosopher',
        fontSize: '40px',
        color: this.style.textColor,
        align: 'center',
      }).setOrigin(0.5, 0);
      this.replyBodyText = this.add.text(0, 0, '', {
        fontFamily: 'Ysabeau',
        fontSize: '32px',
        color: '#1B1A19',
        align: 'left',
      }).setOrigin(0, 0);
      const nextBtn = this.makeIconButton(0, 0, IMG.next, () => this.onContinueClicked());

      this.replyPanelParts = [panelBg, this.replyNameText, this.replyBodyText, nextBtn];
      this.bottomGroup.add(this.replyPanelParts);
      this.layout.onLayout(this, (visible, ui) => {
        const L = this.layout.dialogueLayout(this, ui);
        this.replyLayout = L;
        panelBg.setPosition(L.panel.x, L.panel.y).setDisplaySize(L.panel.width, L.panel.height);
        this.replyNameText.setPosition(L.name.x, L.name.y).setWordWrapWidth(L.name.wrap);
        this.replyBodyText
          .setPosition(L.text.x, L.text.y)
          .setLineSpacing(L.text.lineSpacing)
          .setWordWrapWidth(L.text.wrap);
        nextBtn.setPosition(L.next.x, L.next.y).setDisplaySize(L.next.size, L.next.size);
        this.fitReplyText();
      });
      this.hideReplyPanel();
    }

    showReplyPanel(round) {
      this.replyNameText.setText(this.quoteData.characterName || '');
      this.replyBodyText.setText(round.replyText || '');
      this.fitReplyText();
      this.replyPanelParts.forEach((part) => part.setVisible(true));
    }

    /** Как в сюжетной сцене: имя и реплика уменьшаются, если не влезают в плашку. */
    fitReplyText() {
      const L = this.replyLayout;
      if (!L) return;
      const fit = this.layout.fitFontSize;
      fit(this.replyNameText, L.name.size, L.name.minSize, () => this.replyNameText.width > L.name.wrap);
      fit(this.replyBodyText, L.text.size, L.text.minSize, () => this.replyBodyText.height > L.text.maxHeight);
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
      this.clearQuote();
      if (this.answerButtons) {
        this.answerButtons.forEach((b) => { b.bg.destroy(); b.overlay.destroy(); b.text.destroy(); });
        this.answerButtons = null;
      }
      this.hideReplyPanel();
    }

    clearQuote() {
      this.quoteImage?.destroy();
      this.quoteImage = null;
      if (this.quoteTexture) this.textures.remove(this.quoteTexture.key);
      this.quoteTexture = null;
    }

    /** Части одного абзаца: курсив относится только к угаданной фразе. */
    quoteSegments() {
      const round = this.currentRound;
      const before = (round.mode === 'middle' ? round.prefix : round.mode === 'prefix' ? '' : round.prompt).trim();
      const after = (round.mode === 'middle' ? round.suffix : round.mode === 'prefix' ? round.prompt : '').trim();
      return [
        { text: '«' + (before ? before + ' ' : ''), italic: false },
        { text: this.roundSolved ? round.answer : '___', italic: this.roundSolved },
        { text: (after && !/^[,.;:!?…]/u.test(after) ? ' ' : '') + after + '»', italic: false },
      ];
    }

    /** Одна текстура абзаца: общий перенос слов с учётом ширины курсива. */
    buildQuote() {
      const style = this.style;
      const padding = 8; // Запас для выступающих краёв курсивных букв.
      const lineHeight = Math.ceil(style.quoteFontSize * 1.25);
      const width = style.quoteWrapWidth + padding * 2;
      if (!this.quoteTexture) {
        this.quoteTexture = this.textures.createCanvas('quoteParagraph', width, 1);
      }
      const texture = this.quoteTexture;
      const context = texture.context;
      const font = (italic) => `${italic ? 'italic ' : ''}bold ${style.quoteFontSize}px "${style.quoteFontFamily}"`;
      let offset = 0;
      const segments = this.quoteSegments().map((segment) => {
        const start = offset;
        offset += segment.text.length;
        return { ...segment, start, end: offset };
      });
      const text = segments.map((segment) => segment.text).join('');
      context.font = font(false);
      const spaceWidth = context.measureText(' ').width;
      const runs = [];
      let x = 0;
      let line = 0;
      // Пунктуация остаётся с соседним словом, даже на границе курсива.
      for (const match of text.matchAll(/\S+/gu)) {
        const start = match.index;
        const end = start + match[0].length;
        const word = segments.filter((segment) => segment.end > start && segment.start < end).map((segment) => {
          const part = segment.text.slice(Math.max(start - segment.start, 0), Math.min(end, segment.end) - segment.start);
          context.font = font(segment.italic);
          return { text: part, italic: segment.italic, width: context.measureText(part).width };
        });
        const wordWidth = word.reduce((sum, run) => sum + run.width, 0);
        if (x && x + spaceWidth + wordWidth > style.quoteWrapWidth) {
          x = 0;
          line++;
        }
        if (x) x += spaceWidth;
        for (const run of word) {
          runs.push({ ...run, x, y: line * lineHeight });
          x += run.width;
        }
      }
      const height = (line + 1) * lineHeight;
      texture.setSize(width, height + padding * 2);
      context.clearRect(0, 0, texture.width, texture.height);
      context.fillStyle = style.textColor;
      context.textBaseline = 'alphabetic';
      for (const run of runs) {
        context.font = font(run.italic);
        context.fillText(run.text, padding + run.x, padding + style.quoteFontSize + run.y);
      }
      texture.refresh();
      if (!this.quoteImage) {
        this.quoteImage = this.add.image(style.quoteX - padding, style.quoteY - padding, texture.key).setOrigin(0);
      } else {
        this.quoteImage.setTexture(texture.key);
      }
      this.quoteBottomY = style.quoteY + height + 20;
    }

    // ---- варианты ответа ---------------------------------------------------

    buildAnswerButtons() {
      const options = this.shuffle(
        [{ text: this.currentRound.answer, correct: true }].concat(
          this.currentRound.distractors.map((text) => ({ text: text, correct: false }))
        )
      );

      this.answerButtons = options.map((option, i) => this.buildOneAnswerButton(option, this.style.slots[i]));
      this.positionAnswerButtons();
    }

    positionAnswerButtons() {
      // Длинная цитата сдвигает варианты вниз, сохраняя промежуток до текста.
      const shift = Math.max(0, this.quoteBottomY - this.style.answerAreaDesignedTopY);
      this.answerButtons?.forEach((button, index) => {
        const slot = this.style.slots[index];
        [button.bg, button.overlay, button.text].forEach((part) => part.setPosition(slot.x, slot.y + shift));
      });
    }

    buildOneAnswerButton(option, slot) {
      const style = this.style;
      const text = this.add
        .text(slot.x, slot.y, option.text, {
          fontFamily: style.quoteFontFamily,
          fontStyle: 'bold',
          fontSize: style.answerFontSize + 'px',
          color: style.textColor,
          align: 'center',
        })
        .setOrigin(0.5);
      // Плашка кнопки меню, растянутая до размера варианта (answerWidth ×
      // answerHeight); под длинный текст ширина растёт.
      const height = style.answerHeight;
      const width = Math.max(style.answerWidth, text.width + style.answerPaddingX * 2);

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
      this.buildQuote();
      this.showReplyPanel(this.currentRound);
    }

    isLastRound() {
      return this.currentRoundIndex === this.rounds.length - 1;
    }

    // ---- переходы ----------------------------------------------------------

    onContinueClicked() {
      if (!this.roundSolved) return;
      if (this.gameFinished) {
        // Перед переходом дальше по сюжету — интересный факт.
        if (this.winShown) return;
        this.winShown = true;
        this.phase = 'win';
        this.hideReplyPanel();
        this.showPanelOverlay(WIN_TITLE, WIN_FACT, () => this.finishMinigame(), IMG.finish);
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
      img.on('pointerup', () => {
        window.VN?.systems.AudioManager?.click?.(this);
        onClick();
      });
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
