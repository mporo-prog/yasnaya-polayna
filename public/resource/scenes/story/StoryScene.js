(function () {
  const WIDTH = 1920;
  const HEIGHT = 1080;
  // const WIDTH = window.innerWidth;
  // const HEIGHT = window.innerHeight;
  const BAR_Y = HEIGHT;

  /**
   * StoryScene — одна универсальная сцена на все сюжетные сцены игры.

   *   VN.data.storyLines           — реплики
   *   VN.data.storyHistoryTexts    — текст для окна "История"
   *   VN.data.storyBackgrounds     — пути к фонам
   *   VN.data.storyAudio           — музыка и звуки сцен/экранов
   *   VN.data.storyMinigameLinks   — какая мини-игра идёт после сцены
   */
  class StoryScene extends Phaser.Scene {
    constructor() {
      super('StoryScene');
    }
    /**
     * 
     * для цитат
     */
    getAssetManifest() {
      return {
        images: [
          { key: 'dialogTextBg', url: 'images/icon_UI/dialog_text_bg.png' },
          { key: 'historyModalBg', url: 'images/icon_UI/history_modal_bg.png' },
          { key: 'closeButton', url: 'images/icon_UI/close_button.png' },
          { key: 'glossaryPopupBg', url: 'images/icon_UI/text_bg.png' },
        ],
      };
    }

    init(data) {
      data = data || {};
      const GameState = window.VN.systems.GameState;
      this.storySceneIndex = data.storySceneIndex != null ? data.storySceneIndex : GameState.state.storySceneIndex;
      this.screenIndex = data.screenIndex != null ? data.screenIndex : GameState.state.screenIndex;
      this.historyVisible = false;
      this.portraitPhase = null;
      this.portraitAnimationComplete = false;
      this.portraitPlaybackReady = false;
      this.portraitVoiceComplete = false;
      this._pendingVoiceResume = false;
      this.voiceInterruptedByOverlay = false;
      this.minigameFadeInMs = data.minigameFadeInMs || 0;
      // Даже при повторной загрузке отсутствующего ресурса сохраняем чёрный экран.
      if (this.minigameFadeInMs > 0) this.cameras.main.setAlpha(0);
    }

    preload() {
      window.VN.systems.SceneAssets.preload(this);
    }

    create() {
      // Музыка финального портрета играет при входе в сцену,
      // а реплика запускается отдельно вместе с первым кадром видео.
      if (this.currentLines[this.screenIndex].portraitReveal) {
        const audioConfig = window.VN.systems.SceneAudio.getConfig(this);
        this.sceneAudio = window.VN.systems.SceneAudio.enter(this, {
          music: audioConfig.music ?? null,
          transition: audioConfig.transition,
          transitionSound: null,
          sounds: [],
          screens: [],
        });
      } else {
        this.sceneAudio = window.VN.systems.SceneAudio.enter(this);
      }
      this.layout = window.VN.systems.Layout;
      this.buildBackgroundLayer();
      // Персонаж, плашка реплики и кнопки «далее/назад» живут в одной
      // группе, прижатой к нижнему краю экрана (на планшете 4:3 экран выше
      // макета — без этого плашка «висела» бы посреди экрана).
      this.bottomGroup = this.add.container(0, 0);
      this.buildCharacterLayer();
      this.buildBottomBar();
      this.buildNavButtons();
      this.buildTopButtons();
      this.buildHistoryOverlay();
      this.buildGlossaryOverlay();

      this.layout.onLayout(this, (visible, ui) => this.applyLayout(visible, ui));

      // Пробел — то же, что кнопка «далее» (кроме открытой истории и сноски).
      const onSpace = (event) => {
        event.preventDefault?.();
        // Phaser может повторно обходить очередь клавиш до следующего кадра
        // (как в SettingsScene): одно нажатие — один переход.
        if (event.vnHandled) return;
        event.vnHandled = true;
        event.stopPropagation?.();
        if (event.repeat || this.historyVisible || this.glossaryContainer.visible) return;
        if (!this.bottomGroup.visible || !this.nextBtn.bg.visible) return;
        this.goNext();
      };
      this.input.keyboard?.on('keydown-SPACE', onSpace);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input.keyboard?.off('keydown-SPACE', onSpace));

      this.renderCurrentScreen();
      this.fadeInAfterMinigame();
      window.VN.systems.SceneAssets.prefetchNext(this);

      // Дополнительная страховка: если вкладку скрыли — сохраняемся
      // немедленно, не дожидаясь следующего клика.
      this.onVisibilityChange = () => {
        if (document.hidden) window.VN.systems.GameState.save();
      };
      document.addEventListener('visibilitychange', this.onVisibilityChange);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
        document.removeEventListener('visibilitychange', this.onVisibilityChange);
        // Уходим со сцены (например, в мини-игру) — озвучка не должна звучать вслед.
        this.stopVoice();
        this.clearScreenTimer();
        this.cancelBackgroundTransition?.();
        this.pendingBackgroundPath = null;
        this.clearPortraitSequence?.();
      });
    }

    fadeInAfterMinigame() {
      if (this.minigameFadeInMs <= 0) return;
      const camera = this.cameras.main;
      const inputEnabled = this.input.enabled;
      const keyboardEnabled = this.input.keyboard?.enabled;
      this.input.enabled = false;
      if (this.input.keyboard) this.input.keyboard.enabled = false;
      const restoreInput = () => {
        this.input.enabled = inputEnabled;
        if (this.input.keyboard) this.input.keyboard.enabled = keyboardEnabled;
        camera.off('camerafadeincomplete', restoreInput);
        this.events.off('shutdown', restoreInput);
      };
      this.events.once('shutdown', restoreInput);
      camera.once('camerafadeincomplete', restoreInput);
      camera.setAlpha(1);
      camera.fadeIn(this.minigameFadeInMs, 0, 0, 0);
    }

    update(time) {
      if (this.portraitPhase === 'loading' && this.portraitPlaybackReady) {
        this.portraitPhase = 'dialogue';
        this.setPortraitControlsVisible(true);
        this.renderCurrentScreen();
      }
      // Отложенный перезапуск озвучки после паузы/истории — см. комментарий
      // в resumeVoiceIfNeeded(): его нельзя делать синхронно в обработчике
      // клика "Продолжить", поэтому здесь мы забираем его на первом же
      // кадре после возобновления, когда time уже точно актуально.
      if (this._pendingVoiceResume) {
        this._pendingVoiceResume = false;
        this.startVoiceReveal(this._voiceConfigForCurrentScreen, this._textForCurrentScreen, time);
      }
      this.updateVoiceReveal(time);
      if (this.portraitPhase === 'dialogue' && !this.historyVisible) {
        if (this.voiceTrack?.ended) this.portraitVoiceComplete = true;
        this.showPortraitTitle();
      }
      if (this.pendingBackgroundPath && this.currentLines[this.screenIndex].backgroundChange?.afterVoice
        && !this.historyVisible && (!this.voiceTrack || this.voiceTrack.ended)) {
        this.changeScreenBackground();
      }
    }

    // ---- откуда сейчас брать контент ---------------------------------------

    get currentLines() {
      return window.VN.data.storyLines[this.storySceneIndex];
    }

    get currentHistoryTexts() {
      return window.VN.data.storyHistoryTexts[this.storySceneIndex];
    }

    get currentBackgrounds() {
      return window.VN.data.storyBackgrounds[this.storySceneIndex];
    }

    get currentMinigameKey() {
      return window.VN.data.storyMinigameLinks[this.storySceneIndex];
    }

    get totalScreensInThisScene() {
      return this.currentLines.length;
    }

    // ---- построение интерфейса ----------------------------------------------

    buildBackgroundLayer() {
      // Если для этого экрана реальная картинка не загрузилась (её
      // ещё нет на диске) — просто рисуем серый плейсхолдер с подписью
      // (путь к файлу), чтобы было видно, чего не хватает.
      // Фон растягивается на весь экран (Layout.addBackground).
      // На планшетах сохраняем в кадре раму и место для названия справа.
      const keep = this.currentLines[this.screenIndex].portraitReveal
        ? new Phaser.Geom.Rectangle(780, 40, 1090, 1000) : null;
      this.background = this.layout.addBackground(this, null, { keep });

      this.bgLabel = this.add.text(WIDTH / 2, BAR_Y / 2, 'Фон', { fontSize: '40px', color: '#000000' }).setOrigin(0.5).setVisible(false);
    }

    setBackground(path) {
      if (this.textures.exists(path)) {
        this.background.setTexture(path);
        this.bgLabel.setVisible(false);
        return;
      }
      // Картинка не нашлась (её ещё нет на диске/сервере). Раньше фон в
      // этом случае гасился полностью (setTexture(null)) — пока плашка
      // диалога была всегда непрозрачной, это было незаметно. Теперь, когда
      // плашка сама может становиться прозрачной (см. renderCurrentScreen
      // ниже), погашенный фон превращается в чёрный экран. Поэтому просто
      // оставляем предыдущий фон как есть и только показываем подпись с
      // путём — чтобы было видно, чего не хватает.
      this.bgLabel.setVisible(true).setText('Фон не найден:\n' + path);
    }

    // ---- персонаж на экране (по имени говорящего) ---------------------------

    buildCharacterLayer() {
      this.characterImage = this.add.image(WIDTH * 0.22, BAR_Y, '__MISSING').setOrigin(0.5, 1).setVisible(false);
      this.bottomGroup.add(this.characterImage);
    }

    setCharacter(speakerName) {
      const portraits = window.VN.data.storyCharacterPortraits || {};
      const path = portraits[speakerName];
      if (path && this.textures.exists(path)) {
        this.characterImage.setTexture(path);
        // Ограничиваем высоту портрета, чтобы он не перекрывал весь фон.
        const tex = this.textures.get(path).getSourceImage();
        const maxHeight = BAR_Y * 0.85;
        const scale = Math.min(1, maxHeight / tex.height);
        this.characterImage.setScale(scale).setVisible(true);
      } else {
        this.characterImage.setVisible(false);
      }
    }

    buildBottomBar() {
      // Позиции и размеры плашки, имени и текста выставляет
      // layoutBottomBar() — отдельно для компьютера и для телефона.

      // Плашка реплики — бежевая, однотонная (без градиента/текстуры).
      const panelBg = this.add.image(0, 0, 'dialogTextBg').setOrigin(0, 0);
      this.panelBg = panelBg;

      this.speakerNameText = this.add
        .text(0, 0, '', {
          fontFamily: 'Philosopher',
          fontSize: '40px',
          color: '#6E6056',
          align: 'left',
        })
        .setOrigin(0, 0);

      const dialogueTextStyle = {
        fontFamily: 'Ysabeau',
        fontSize: '32px',
        align: 'left',
      };

      // Реплика рисуется двумя наложенными друг на друга текстами:
      // нижний — "непроговорённый" цвет на всю длину сразу, верхний —
      // "проговорённый" цвет, растущий по мере воспроизведения озвучки.
      // Если у реплики нет озвучки, верхний текст сразу выставляется
      // на всю длину — получается обычное мгновенное появление.
      //
      // Оба текста выровнены по верхнему краю (setOrigin(0, 0)), а не по
      // центру: при побуквенном заполнении "проговорённый" текст короче и
      // оборачивается в меньшее число строк, поэтому при центрировании его
      // верх "плавал" бы ниже верха светлого текста. Единая верхняя точка
      // Y — фиксированная (this.dialogueTextY, по дизайну), применяется к
      // обоим слоям в renderCurrentScreen() — они всегда начинаются с одной строки.
      //
      // Оба слоя живут в bottomGroup вместе с плашкой, поэтому на любых
      // пропорциях экрана (Layout) они двигаются вместе с ней.
      this.dialogueText = this.add
        // Текст до анимации читается, но заметно светлее проговорённого (#1B1A19).
        .text(0, 0, '', { ...dialogueTextStyle, color: '#9A8D82' })
        .setOrigin(0, 0);
    /**
     * для цитат начало
     */
     this.dialogueRevealedText = this.add
      .text(0, 0, '', { ...dialogueTextStyle, color: '#1B1A19' })
      .setOrigin(0, 0);

    this.glossaryMeasureText = this.add
      .text(0, 0, '', { fontFamily: dialogueTextStyle.fontFamily, fontStyle: dialogueTextStyle.fontStyle, fontSize: dialogueTextStyle.fontSize })
      .setVisible(false);
    this.glossaryWordOverlays = [];
    // Порог проявления для каждого слова-ссылки: слово становится жирным
    // и подчёркнутым только когда "проговорённый" тёмный текст дойдёт до
    // конца этого слова (см. buildGlossaryWordOverlays/applyGlossaryReveal).
    this.glossaryWordReveals = [];

    this.bottomGroup.add([panelBg, this.speakerNameText, this.dialogueText, this.dialogueRevealedText]);
    
  }
  /**
     * для цитат конец
     */  

    buildNavButtons() {
      // Позиции и размеры — в layoutBottomBar().
      this.nextBtn = this.makeIconButton(0, 0, 'images/icon_UI/next_button.png', () => this.goNext());
      this.backBtn = this.makeIconButton(0, 0, 'images/icon_UI/back_button.png', () => this.goBack());
      this.bottomGroup.add([this.nextBtn.bg, this.backBtn.bg]);
    }

    buildTopButtons() {
      // depth выше, чем у historyContainer (10) — чтобы кнопки оставались
      // видимыми и кликабельными поверх открытой вкладки "История"
      // (крестика для закрытия больше нет, закрывают тем же тумблером).
      // Позиция по дизайну: левый верхний угол кнопки на 1.5% / 2.3% от
      // краёв макета 1920x1080, размер 150x150. У Phaser.Image origin
      // по умолчанию (0.5, 0.5) — x/y это центр, поэтому смещаем на
      // половину размера, чтобы угол картинки совпал с макетом.
      const menuBtnSize = 150;
      const menuBtnLeft = WIDTH * 0.015 + menuBtnSize / 2; // ≈ 104
      const menuBtnTop = HEIGHT * 0.023 + menuBtnSize / 2; // ≈ 100
      // const menuBtn = this.makeIconButton(menuBtnLeft, menuBtnTop, 'images/icon_UI/pause_button.png', () => this.openPauseMenu(), menuBtnSize);
      // this.pauseBtn = menuBtn;
      // menuBtn.bg.setDepth(20);

      this.historyBtn = this.makeIconButton(100, 220, 'images/icon_UI/history_button.png', () => this.toggleHistory(), 70);
//       // Позиции и размеры — в layoutTopButtons().
      this.menuBtn = this.makeIconButton(0, 0, 'images/icon_UI/pause_button.png', () => this.openPauseMenu());
      this.layout.pinPauseButton(this, this.menuBtn.bg);
//       this.menuBtn.bg.setDepth(20);

//       this.historyBtn = this.makeIconButton(0, 0, 'images/icon_UI/history_button.png', () => this.toggleHistory());
      // this.historyBtn.bg.setDepth(20);
    }

    // ---- раскладка: компьютер / телефон -------------------------------------

    applyLayout(visible, ui) {
      // Телефон — «компактная» раскладка по мобильному макету.
      const compact = this.layout.isCompact(this);
      // Плашка, персонаж и кнопки «далее/назад» прижаты к нижнему краю.
      this.bottomGroup.y = ui.bottom - HEIGHT;
      this.layoutBottomBar(ui);
      this.layoutTopButtons(ui, compact);
      this.layoutHistoryOverlay(ui, compact);
      this.layoutGlossaryOverlay(ui, compact);
      this.compactLayout = compact;
    }

    /**
     * Плашка реплики и кнопки «далее/назад». Координаты — внутри
     * bottomGroup (по вертикали — макет 1080, прижатый к низу экрана).
     */
    layoutBottomBar(ui) {
      // Раскладка — общая с репликами в мини-играх (Layout.dialogueLayout).
      const { panel, name, text, next, back } = this.layout.dialogueLayout(this, ui);

      this.panelBg.setPosition(panel.x, panel.y).setDisplaySize(panel.width, panel.height);
      this.speakerNameLayout = name;
      // x — центр колонки имени; строки имени выровнены по центру.
      this.speakerNameText
        .setOrigin(0.5, 0)
        .setAlign('center')
        .setPosition(name.x, name.y)
        .setWordWrapWidth(name.wrap);
      this.fitSpeakerName();

      this.dialogueTextY = text.y;
      this.dialogueLayout = text;
      [this.dialogueText, this.dialogueRevealedText].forEach((t) => {
        t.setPosition(text.x, text.y).setLineSpacing(text.lineSpacing).setWordWrapWidth(text.wrap);
      });

      this.nextBtn.bg.setPosition(next.x, next.y).setDisplaySize(next.size, next.size);
      this.backBtn.bg.setPosition(back.x, back.y).setDisplaySize(back.size, back.size);

      // Переносы строк зависят от ширины — пересобираем текущую реплику.
      if (this._textForCurrentScreen != null) this.refreshDialogueLayout();
    }

    /** Пауза и «История» — у верхних углов экрана (с учётом выреза). */
    layoutTopButtons(ui, compact) {
      // Размеры — общие для всех сцен (Layout.UI_BUTTONS); пауза ставится
      // через Layout.pinPauseButton — так же, как в мини-играх.
      const historySize = this.layout.buttonSize(this, 'history');
      if (compact) {
        this.historyBtn.bg.setPosition(ui.right - 130, ui.y + 115).setDisplaySize(historySize, historySize);
      } else {
        this.historyBtn.bg.setPosition(ui.x + 100, ui.y + 240).setDisplaySize(historySize, historySize);
      }
    }

    /**
     * Подбирает размер шрифта реплики: если текст не помещается в плашку,
     * шрифт уменьшается (не меньше minSize). Оба слоя — одного размера.
     */
    fitDialogueText() {
      const layout = this.dialogueLayout;
      const layers = [this.dialogueText, this.dialogueRevealedText];
      let size = layout.size;
      layers.forEach((t) => t.setFontSize(size));
      while (size > layout.minSize && this.dialogueText.height > layout.maxHeight) {
        size -= 2;
        layers.forEach((t) => t.setFontSize(size));
      }
      this.dialogueFontSize = size;
    }

    /**
     * Имя героя не переносится посреди слова — длинное имя на узкой
     * плашке уменьшаем, чтобы оно не заходило за черту плашки.
     */
    fitSpeakerName() {
      const name = this.speakerNameLayout;
      if (!name) return;
      let size = name.size;
      this.speakerNameText.setFontSize(size);
      while (size > name.minSize && this.speakerNameText.width > name.wrap) {
        size -= 2;
        this.speakerNameText.setFontSize(size);
      }
    }

    /** После смены раскладки: переносит строки текущей реплики заново. */
    refreshDialogueLayout() {
      const text = this._textForCurrentScreen;
      this.dialogueText.setText(text);
      this.fitDialogueText();
      if (this.voiceActive) {
        this.voiceRevealText = this.dialogueText.getWrappedText(text).join('\n');
      } else if (this.dialogueRevealedText.text !== '') {
        this.dialogueRevealedText.setText(text);
      }
      const glossaryEntries = window.VN.data.getGlossaryLinksFor(this.storySceneIndex, this.screenIndex);
      this.buildGlossaryWordOverlays(text, glossaryEntries);
      // Пересозданные ссылки скрыты — показываем уже «проговорённые»
      // (иначе после поворота экрана сноски пропадали до следующей реплики).
      this.applyGlossaryReveal(this.voiceActive ? this.dialogueRevealedText.text.length : Infinity);
    }

    /** Кнопка-иконка (картинка вместо прямоугольника с текстом). */
    makeIconButton(x, y, texture, onClick, displaySize) {
      // x/y — центр кнопки (origin Phaser.Image по умолчанию 0.5, 0.5).
      const img = this.add.image(x, y, texture).setInteractive({ useHandCursor: true });
      if (displaySize) img.setDisplaySize(displaySize, displaySize);
      // Нажатие должно начаться на этой кнопке: отпускание после выхода
      // из мини-игры не должно пропускать озвучку или первую реплику.
      let pressedPointer = null;
      img.on('pointerdown', (pointer) => { pressedPointer = pointer; });
      img.on('pointerout', () => { pressedPointer = null; });
      img.on('pointerup', (pointer) => {
        if (pressedPointer !== pointer) return;
        pressedPointer = null;
        window.VN?.systems.AudioManager?.click?.(this);
        onClick();
      });
      return { bg: img, text: null };
    }

    buildHistoryOverlay() {
      // Окно по центру экрана — фон сюжетной сцены остаётся виден (просто
      // слегка притемнён) вокруг него. Размеры — в layoutHistoryOverlay().
      // Видимая область под текст (historyViewport) — за её пределами текст
      // обрезается маской, доступ к остальному — прокруткой.
      this.historyViewport = { x: 0, y: 0, width: 1, height: 1 };
      this.historyScrollY = 0;
      this.historyMaxScroll = 0;
      this.historyDragStartY = null;
      this.historyDragStartScroll = 0;

      this.historyContainer = this.add.container(0, 0).setDepth(10).setVisible(false);

      // Затемняющая подложка на весь экран — приглушает фон и перехватывает
      // клики мимо окна, но сам фон сцены под ней остаётся виден.
      const dimBg = this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x000000, 0.35).setOrigin(0, 0).setInteractive();
      this.layout.fill(this, dimBg); // затемнение — на весь экран, включая поля

      // Сама панель "История" — по центру, картинка-рамка.
      const windowBg = this.add
        .image(0, 0, 'historyModalBg')
        .setOrigin(0, 0)
        .setInteractive();
      this.historyWindowBg = windowBg;

      const title = this.add.text(0, 0, 'История', { fontFamily: 'Philosopher', fontSize: '48px', color: '#3f2f22' }).setOrigin(0.5);
      this.historyTitle = title;

      /**
       * Крестик для закрытия вкладки "История" — часть самого окна истории,
       * поэтому создаётся здесь и добавляется в тот же historyContainer,
       * чтобы появляться и исчезать вместе с окном, а не жить отдельно.
       */
      const closeBtn = this.add
        .image(0, 0, 'closeButton')
        .setInteractive({ useHandCursor: true });
      closeBtn.on('pointerup', () => {
        window.VN?.systems.AudioManager?.click?.(this);
        this.toggleHistory();
      });
      this.historyCloseBtn = closeBtn;

      // Сам текст — внутри отдельного контейнера, который двигается вверх/
      // вниз при прокрутке; видна только часть внутри viewport благодаря маске.
      this.historyText = this.add.text(0, 0, '', {
        fontFamily: 'Ysabeau',
        fontSize: '28px',
        color: '#3f2f22',
        lineSpacing: 24,
      });
      this.historyContentContainer = this.add.container(0, 0, [this.historyText]);

      this.historyMaskShape = this.make.graphics({ x: 0, y: 0 }, false);
      this.historyContentContainer.setMask(this.historyMaskShape.createGeometryMask());

      // Полоса прокрутки справа от текста, внутри панели.
      this.historyScrollTrack = this.add.rectangle(0, 0, 6, 1, 0x5a4632, 0.5).setOrigin(0.5, 0);
      this.historyScrollThumb = this.add.rectangle(0, 0, 10, 1, 0x5a4632).setOrigin(0.5, 0);

      this.historyContainer.add([
        dimBg,
        windowBg,
        title,
        closeBtn,
        this.historyContentContainer,
        this.historyScrollTrack,
        this.historyScrollThumb,
      ]);

      // Прокрутка колесом мыши.
      this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
        if (!this.historyVisible) return;
        this.setHistoryScroll(this.historyScrollY + deltaY);
      });

      // Прокрутка перетаскиванием (мышь/тач) — только внутри самого окна,
      // а не по всей затемнённой области экрана.
      windowBg.on('pointerdown', (pointer) => {
        if (!this.historyVisible) return;
        this.historyDragStartY = pointer.y;
        this.historyDragStartScroll = this.historyScrollY;
      });
      windowBg.on('pointermove', (pointer) => {
        if (!this.historyVisible || this.historyDragStartY === null || !pointer.isDown) return;
        const delta = this.historyDragStartY - pointer.y;
        this.setHistoryScroll(this.historyDragStartScroll + delta);
      });
      const stopHistoryDrag = () => { this.historyDragStartY = null; };
      windowBg.on('pointerup', stopHistoryDrag);
      windowBg.on('pointerupoutside', stopHistoryDrag);
    }

    layoutHistoryOverlay(ui, compact) {
      let panel, titleY, titleSize, close, pad, fontSize, lineSpacing;
      if (compact) {
        // Мобильный макет: окно почти на весь экран, крупный текст и крестик.
        const width = Math.min(ui.width * 0.8, 1950);
        const height = Math.min(ui.height - 50, 1010);
        panel = { x: ui.centerX - width / 2, y: ui.centerY - height / 2, width: width, height: height };
        titleY = panel.y + 110;
        titleSize = 68;
        close = { x: panel.x + width - 45, y: panel.y + 75, size: this.layout.buttonSize(this, 'close') };
        pad = { left: 140, top: 210, right: 180, bottom: 90 };
        fontSize = 42;
        lineSpacing = 6;
      } else {
        const width = WIDTH * 0.62;
        const height = HEIGHT * 0.82;
        panel = { x: (WIDTH - width) / 2, y: (HEIGHT - height) / 2, width: width, height: height };
        titleY = panel.y + 90;
        titleSize = 48;
        close = { x: panel.x + width - 50, y: panel.y + 50, size: this.layout.buttonSize(this, 'close') };
        pad = { left: 90, top: 150, right: 110, bottom: 100 };
        fontSize = 28;
        lineSpacing = 14;
      }

      const viewport = this.historyViewport;
      viewport.x = panel.x + pad.left;
      viewport.y = panel.y + pad.top;
      viewport.width = panel.width - pad.left - pad.right;
      viewport.height = panel.height - pad.top - pad.bottom;

      this.historyWindowBg.setPosition(panel.x, panel.y).setDisplaySize(panel.width, panel.height);
      this.historyTitle.setPosition(panel.x + panel.width / 2, titleY).setFontSize(titleSize);
      this.historyCloseBtn.setPosition(close.x, close.y).setDisplaySize(close.size, close.size);
      this.historyText.setFontSize(fontSize).setLineSpacing(lineSpacing).setWordWrapWidth(viewport.width);

      this.historyMaskShape.clear();
      this.historyMaskShape.fillStyle(0xffffff);
      this.historyMaskShape.fillRect(viewport.x, viewport.y, viewport.width, viewport.height);

      const trackX = viewport.x + viewport.width + 30;
      this.historyScrollTrack.setPosition(trackX, viewport.y).setSize(6, viewport.height);
      this.historyScrollThumb.x = trackX;
      this.historyContentContainer.x = viewport.x;
      this.setHistoryScroll(this.historyScrollY);
    }

    /** Двигает содержимое истории на заданную позицию (с ограничением). */
    setHistoryScroll(scrollY) {
      this.historyScrollY = Phaser.Math.Clamp(scrollY, 0, this.historyMaxScroll);
      this.historyContentContainer.y = this.historyViewport.y - this.historyScrollY;
      this.updateHistoryScrollbar();
    }

    /** Пересчитывает размер/позицию ползунка полосы прокрутки. */
    updateHistoryScrollbar() {
      const viewport = this.historyViewport;
      const contentHeight = Math.max(this.historyText.height, 1);
      this.historyMaxScroll = Math.max(0, contentHeight - viewport.height);

      const visibleRatio = Math.min(1, viewport.height / contentHeight);
      const thumbHeight = Math.max(30, viewport.height * visibleRatio);
      this.historyScrollThumb.setSize(10, thumbHeight);

      const maxThumbTravel = viewport.height - thumbHeight;
      const scrollRatio = this.historyMaxScroll > 0 ? this.historyScrollY / this.historyMaxScroll : 0;
      this.historyScrollThumb.y = viewport.y + maxThumbTravel * scrollRatio;
    }
    /**
     * для цитат начало
     */
    buildGlossaryWordOverlays(text, entries) {
      this.destroyGlossaryWordOverlays();
      if (!entries || !entries.length) return;

      const lines = this.dialogueText.getWrappedText(text);
      const lineHeight = this.dialogueText.height / lines.length;

      // Смещение начала каждой строки в тексте, склеенном через \n — так
      // же, как склеен "проговорённый" тёмный слой (voiceRevealText в
      // startVoiceReveal). По этому смещению считаем позицию слова в
      // общем тексте, чтобы сравнивать её с revealCount в applyGlossaryReveal.
      const lineOffsets = [];
      let offset = 0;
      for (const line of lines) {
        lineOffsets.push(offset);
        offset += line.length + 1; // +1 — символ \n между строками
      }

      // Ссылкой может быть и фраза (например, целая цитата): переносы строк
      // могли разорвать её между строками, поэтому ищем её в склеенном
      // тексте, где пробел мог стать переносом, и подчёркиваем по кускам —
      // отдельно на каждой строке.
      const joined = lines.join('\n');
      const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      entries.forEach((entry) => {
        const pattern = new RegExp(entry.word.split(/\s+/).map(escape).join('\\s+'));
        const match = pattern.exec(joined);
        if (!match) return;
        const start = match.index;
        const end = start + match[0].length;

        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
          const line = lines[lineIndex];
          const lineStart = lineOffsets[lineIndex];
          const from = Math.max(start, lineStart);
          const to = Math.min(end, lineStart + line.length);
          if (from >= to) continue;
          const charIndex = from - lineStart;
          const part = line.slice(charIndex, to - lineStart).trimEnd();
          if (!part) continue;

          this.glossaryMeasureText.setFontSize(this.dialogueFontSize).setText(line.slice(0, charIndex));
          const wordX = this.dialogueText.x + this.glossaryMeasureText.width;
          const wordY = this.dialogueText.y + lineIndex * lineHeight;

          // Тот же шрифт и тот же размер, что у самого текста реплики
          // (dialogueTextStyle: Ysabeau 32px) — слово остаётся частью той
          // же строки, а не отдельной подписью другого размера поверх неё.
          // "Жирность" — не другим начертанием шрифта (это сдвинуло бы
          // ширину глифов и увело подчёркивание/клик-зону мимо слова), а
          // обводкой (stroke): она утолщает контур букв, не меняя их
          // ширину и расположение.
          const wordText = this.add
            .text(wordX, wordY, part, {
              // Берём шрифт/размер у glossaryMeasureText — он создан с теми
              // же значениями, что и сам текст реплики (см. buildBottomBar).
              fontFamily: this.glossaryMeasureText.style.fontFamily,
              fontSize: this.glossaryMeasureText.style.fontSize,
              color: '#1B1A19',
              stroke: '#1B1A19',
              strokeThickness: 1.5,
            })
            .setOrigin(0, 0)
            .setInteractive({ useHandCursor: true })
            .setVisible(false);

          const underline = this.add
            .rectangle(wordX, wordY + wordText.height - 4, wordText.width, 3, 0x1b1a19)
            .setOrigin(0, 0)
            .setInteractive({ useHandCursor: true })
            .setVisible(false);

          const openPopup = () => {
            window.VN?.systems.AudioManager?.click?.(this);
            this.openGlossaryPopup(entry.text);
          };
          wordText.on('pointerup', openPopup);
          underline.on('pointerup', openPopup);

          this.bottomGroup.add([wordText, underline]);
          this.glossaryWordOverlays.push(wordText, underline);
          // Кусок ссылки на этой строке должен "проговориться" (стать
          // тёмным), прежде чем поверх него появятся жирное начертание и
          // подчёркивание.
          this.glossaryWordReveals.push({
            endIndex: lineStart + charIndex + part.length,
            objects: [wordText, underline],
          });
        }
      });
    }

    /**
     * Показывает жирное начертание + подчёркивание для тех слов-ссылок,
     * которые уже полностью "проговорены" (revealCount дошёл до их конца).
     * Вызывается из updateVoiceReveal на каждый кадр анимации, а также
     * сразу целиком (revealCount = Infinity), когда текст показывается
     * без озвучки/анимации (skipVoice, "Назад", ошибка загрузки звука).
     */
    applyGlossaryReveal(revealCount) {
      this.glossaryWordReveals.forEach((entry) => {
        const shouldShow = revealCount >= entry.endIndex;
        if (entry.objects[0].visible !== shouldShow) {
          entry.objects.forEach((obj) => obj.setVisible(shouldShow));
        }
      });
    }

      destroyGlossaryWordOverlays() {
        this.glossaryWordOverlays.forEach((obj) => obj.destroy());
        this.glossaryWordOverlays = [];
        this.glossaryWordReveals = [];
      }

      buildGlossaryOverlay() {
        // Размеры — в layoutGlossaryOverlay().
        this.glossaryContainer = this.add.container(0, 0).setDepth(11).setVisible(false);

        const dimBg = this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x000000, 0.4).setOrigin(0, 0).setInteractive();
        this.layout.fill(this, dimBg);

        this.glossaryPanelBg = this.add
          .image(0, 0, 'glossaryPopupBg')
          .setOrigin(0, 0)
          .setInteractive();

        this.glossaryText = this.add.text(0, 0, '', {
          fontFamily: 'Ysabeau',
          fontSize: '28px',
          color: '#3f2f22',
          lineSpacing: 2,
        });

        this.glossaryCloseBtn = this.add
          .image(0, 0, 'closeButton')
          .setInteractive({ useHandCursor: true });
        this.glossaryCloseBtn.on('pointerup', () => {
          window.VN?.systems.AudioManager?.click?.(this);
          this.closeGlossaryPopup();
        });

        this.glossaryContainer.add([dimBg, this.glossaryPanelBg, this.glossaryText, this.glossaryCloseBtn]);
      }

      layoutGlossaryOverlay(ui, compact) {
        const closeSize = this.layout.buttonSize(this, 'close');
        this.glossaryLayout = compact
          ? {
            ui, width: Math.min(ui.width * 0.62, 1500), minHeight: 540,
            padding: 100, fontSize: 48, minFontSize: 34, closeSize, closeInset: 40,
          }
          : {
            ui, width: WIDTH * 0.4, minHeight: HEIGHT * 0.35,
            padding: 70, fontSize: 28, minFontSize: 22, closeSize, closeInset: 50,
          };
        this.fitGlossaryPopup();
      }

      /**
       * Раскладка сноски под её текст: текст не заходит под крестик и не
       * выходит за плашку. Сначала уменьшается шрифт (не меньше minFontSize),
       * потом плашка растёт по высоте (не выше экрана). Текст — по центру.
       */
      fitGlossaryPopup() {
        const L = this.glossaryLayout;
        if (!L) return;
        const { ui, width, padding, closeSize, closeInset } = L;
        // Справа оставляем место под крестик в углу плашки.
        const rightPadding = Math.max(padding, closeInset + closeSize / 2 + 16);
        const maxHeight = ui.height - 40;
        const maxTextHeight = maxHeight - padding * 2;
        let size = L.fontSize;
        this.glossaryText.setWordWrapWidth(width - padding - rightPadding).setFontSize(size);
        while (size > L.minFontSize && this.glossaryText.height > maxTextHeight) {
          size -= 2;
          this.glossaryText.setFontSize(size);
        }
        const height = Math.min(maxHeight, Math.max(L.minHeight, this.glossaryText.height + padding * 2));
        const panel = { x: ui.centerX - width / 2, y: ui.centerY - height / 2, width, height };
        this.glossaryPanelBg.setPosition(panel.x, panel.y).setDisplaySize(panel.width, panel.height);
        this.glossaryText.setPosition(panel.x + padding, panel.y + (height - this.glossaryText.height) / 2);
        this.glossaryCloseBtn
          .setPosition(panel.x + panel.width - closeInset, panel.y + closeInset)
          .setDisplaySize(closeSize, closeSize);
      }

      openGlossaryPopup(text) {
        this.glossaryText.setText(text);
        this.fitGlossaryPopup();
        this.glossaryContainer.setVisible(true);
      }

      closeGlossaryPopup() {
        this.glossaryContainer.setVisible(false);
      }
        /**
     * для цитат конец
     */
    // ---- логика переключения экранов -----------------------------------------

    /**
     * options.skipVoice — не запускать озвучку/анимацию для этого показа
     * экрана, а сразу показать реплику полностью тёмным текстом. Используется
     * для "Назад" (goBack()): переслушивать реплику при возврате не нужно.
     */
    renderCurrentScreen(options = {}) {
      const entry = this.currentLines[this.screenIndex];
      if (entry.portraitReveal && !this.portraitPhase) {
        this.startPortraitSequence(entry.portraitReveal);
        return;
      }
      const skipVoice = options.skipVoice === true;
      this.clearScreenTimer();
      this.cancelBackgroundTransition?.();

      // Реплика предыдущего экрана могла ещё озвучиваться — обрываем её.
      this.stopVoice();

      this.sceneAudio ??= window.VN.systems.SceneAudio.enter(this);
      this.sceneAudio.showScreen(this.screenIndex);
      const GameState = window.VN.systems.GameState;
      const text = entry.text;
      const speakerName = entry.speaker || '';
      const backgroundPath = this.currentBackgrounds[this.screenIndex];
      const historyOverride = this.currentHistoryTexts[this.screenIndex];
      const historyText = historyOverride != null ? historyOverride : text;
      const storyAudio = window.VN.data.storyAudio?.[this.storySceneIndex];
      const voiceConfig = storyAudio?.screens?.[this.screenIndex]?.voice || null;

      this.setBackground(backgroundPath);
      this.setCharacter(entry.character ?? speakerName);
      this.speakerNameText.setText(speakerName || '');
      this.fitSpeakerName();
      this.dialogueText.setText(text);
      this.fitDialogueText();

      // Если у реплики нет ни персонажа, ни текста — плашка диалога не
      // нужна, делаем её полностью прозрачной. Всё остальное (кнопки
      // "Далее"/"Назад", фон, персонаж) не трогаем — это отдельные объекты.
      const hasSpeakerOrText = Boolean(speakerName) || Boolean(text);
      this.panelBg.setAlpha(hasSpeakerOrText ? 1 : 0);

      /**
       * для цитат начало
       */
        const glossaryEntries = window.VN.data.getGlossaryLinksFor(this.storySceneIndex, this.screenIndex);
        this.buildGlossaryWordOverlays(text, glossaryEntries); 
/**
       * для цитат конец
       */

      // Общая верхняя точка для обоих слоёв текста реплики — фиксированная,
      // по дизайну (this.dialogueTextY, см. buildBottomBar), а не по центру
      // панели. Важно лишь, чтобы у обоих слоёв была ОДНА и та же Y —
      // иначе "проговорённый" слой съедет относительно фонового.
      this.dialogueText.setY(this.dialogueTextY);
      this.dialogueRevealedText.setY(this.dialogueTextY);

      // Запоминаем для возможного перезапуска озвучки после паузы/истории
      // (см. resumeVoiceIfNeeded()) — без повторного обращения к storyAudio.
      this._voiceConfigForCurrentScreen = voiceConfig;
      this._textForCurrentScreen = text;

      if (voiceConfig && !skipVoice) {
        // Есть озвучка — реплика "проговаривается" побуквенно синхронно с ней.
        this.startVoiceReveal(voiceConfig, text);
      } else {
        // Озвучки нет, либо это возврат "Назад" — реплика сразу целиком,
        // все слова-ссылки в ней сразу жирные и подчёркнутые.
        this.dialogueRevealedText.setText(text);
        this.applyGlossaryReveal(Infinity);
      }

      GameState.goToScreen(this.storySceneIndex, this.screenIndex);
      GameState.addHistoryEntry(this.storySceneIndex, this.screenIndex, historyText, speakerName);

      const isFirstScreen = this.screenIndex === 0;
      this.backBtn.bg.setAlpha(isFirstScreen ? 0.4 : 1);
      if (isFirstScreen) this.backBtn.bg.disableInteractive();
      else this.backBtn.bg.setInteractive({ useHandCursor: true });

      this.scheduleScreenAction(entry);
    }

    // ---- финальный портрет --------------------------------------------------

    setPortraitControlsVisible(visible) {
      this.bottomGroup.setVisible(visible);
      this.historyBtn.bg.setVisible(visible);
    }

    startPortraitSequence(config) {
      this.portraitPhase = 'loading';
      this.portraitAnimationComplete = false;
      this.portraitPlaybackReady = false;
      this.portraitVoiceComplete = false;
      this.stopVoice();
      this.clearScreenTimer();
      this.setBackground(this.currentBackgrounds[this.screenIndex]);
      this.setPortraitControlsVisible(false);
      window.VN.systems.GameState.goToScreen(this.storySceneIndex, this.screenIndex);

      const { x, y, width, height } = config.frame;
      const small = config.dialogueFrame;
      const camera = this.cameras.main;
      // Четыре кромки PNG рисуем поверх портрета с нахлёстом в 3 px.
      // Центр PNG не используем: в его прозрачной области есть лишние точки.
      const frameTexture = this.textures.get(config.frameImage);
      const overlap = 3;
      const outer = { left: 783, top: 49, right: 1139, bottom: 1021 };
      const inner = { left: x + overlap, top: y + overlap,
        right: x + width - overlap, bottom: y + height - overlap };
      const borders = [
        { name: 'top', crop: [124, 125, 904, 61],
          left: outer.left, top: outer.top, right: outer.right, bottom: inner.top },
        { name: 'bottom', crop: [124, 2554, 904, 63],
          left: outer.left, top: inner.bottom, right: outer.right, bottom: outer.bottom },
        { name: 'left', crop: [124, 186, 60, 2368],
          left: outer.left, top: inner.top, right: inner.left, bottom: inner.bottom },
        { name: 'right', crop: [968, 186, 60, 2368],
          left: inner.right, top: inner.top, right: outer.right, bottom: inner.bottom },
      ];
      this.portraitFrame = this.add.container(0, 0, borders.map(border => {
        const key = 'portrait-frame-' + border.name;
        if (!frameTexture.has(key)) frameTexture.add(key, 0, ...border.crop);
        return this.add.image(border.left, border.top, config.frameImage, key)
          .setOrigin(0).setDisplaySize(border.right - border.left, border.bottom - border.top);
      })).setAlpha(0);
      const poster = this.add.image(0, 0, config.poster).setOrigin(0).setDisplaySize(width, height);
      const video = this.add.video(0, 0).setOrigin(0).setVisible(false);
      this.portraitArtwork = this.add.container(small.x, small.y, [poster, video])
        .setScale(small.width / width, small.height / height);
      this.background.stage.add([this.portraitArtwork, this.portraitFrame]);
      this.portraitVideo = video;

      // Масштабируется контейнер: видео играет один раз и сохраняет последний кадр.
      video.once('created', () => {
        // В исходном видео сверху есть тёмная полоса в 4 px. Убираем её,
        // заполняя прежнюю область портрета без смещения его видимого края.
        const topInset = 4;
        video.setCrop(0, topInset, video.width, video.height - topInset)
          .setOrigin(0, topInset / video.height)
          .setDisplaySize(width, height * video.height / (video.height - topInset))
          .setVisible(true);
        this.portraitPlaybackReady = true;
      });
      video.once('complete', () => { this.portraitAnimationComplete = true; });
      video.once('error', () => {
        // При недоступном видео показываем картину без рамы в том же контейнере.
        video.setVisible(false);
        const texture = this.textures.get(config.fallbackImage);
        if (!texture.has('portrait')) texture.add('portrait', 0, x, y, width, height);
        poster.setTexture(config.fallbackImage, 'portrait').setDisplaySize(width, height);
        this.portraitAnimationComplete = true;
        this.portraitPlaybackReady = true;
      });
      video.loadURL(config.video, true);
      let started = false;
      const play = () => { started = true; video.play(false); };
      const pause = () => { if (started) video.setPaused(true); };
      const resume = () => {
        if (started && !this.historyVisible && !this.portraitAnimationComplete) {
          video.setPaused(false);
        }
      };
      this.events.on('pause', pause);
      this.events.on('resume', resume);
      if (this.minigameFadeInMs > 0) camera.once('camerafadeincomplete', play);
      else play();

      this.clearPortraitSequence = () => {
        // CameraManager уже может убрать main до пользовательского shutdown.
        camera.off('camerafadeincomplete', play);
        this.events.off('pause', pause);
        this.events.off('resume', resume);
        this.portraitTween?.remove();
        this.portraitTween = null;
        video.removeAllListeners();
        this.portraitArtwork?.destroy();
        this.portraitArtwork = null;
        this.portraitFrame?.destroy();
        this.portraitFrame = null;
        this.portraitTitle?.destroy();
        this.portraitTitle = null;
        this.portraitVideo = null;
        this.portraitPhase = null;
        this.portraitAnimationComplete = false;
        this.portraitPlaybackReady = false;
        this.portraitVoiceComplete = false;
        this.clearPortraitSequence = null;
      };
    }

    showPortraitTitle() {
      if (this.portraitPhase !== 'dialogue' || !this.portraitAnimationComplete
        || !this.portraitVoiceComplete || this.historyVisible || this._pendingVoiceResume) return;
      this.portraitPhase = 'enlarging';
      this.stopVoice();
      this._pendingVoiceResume = false;
      this.voiceInterruptedByOverlay = false;
      this.setPortraitControlsVisible(false);
      this.menuBtn.bg.setVisible(false);
      this.destroyGlossaryWordOverlays();

      const config = this.currentLines[this.screenIndex].portraitReveal;
      const panel = this.add.image(0, 0, config.titlePanel).setDisplaySize(640, 183);
      const title = this.add.text(0, 0, config.title, {
        fontFamily: 'Ysabeau', fontSize: '36px', color: '#04151F',
        align: 'center', wordWrap: { width: 550, useAdvancedWrap: true },
      }).setOrigin(0.5);
      const titleObjects = [panel, title];
      // Подпись открывает справку в том же окне, что и слова-ссылки в репликах.
      if (config.popupText) {
        title.setColor('#1B1A19').setStroke('#1B1A19', 1.5);
        const openPopup = () => {
          window.VN?.systems.AudioManager?.click?.(this);
          this.openGlossaryPopup(config.popupText);
        };
        // Подчёркиваем каждую строку по ширине её текста, как ссылки в репликах.
        const lines = title.getWrappedText(config.title);
        const lineHeight = title.height / lines.length;
        lines.forEach((line, index) => {
          const width = Math.ceil(title.context.measureText(line).width + 1.5);
          titleObjects.push(this.add.rectangle(
            0, -title.height / 2 + (index + 1) * lineHeight - 4, width, 3, 0x1b1a19
          ).setOrigin(0.5, 0));
        });
        titleObjects.forEach(object => object.setInteractive({ useHandCursor: true })
          .on('pointerup', openPopup));
      }
      this.portraitTitle = this.add.container(1515, HEIGHT / 2, titleObjects).setAlpha(0);
      this.background.stage.add(this.portraitTitle);
      this.portraitTween = this.tweens.add({
        targets: this.portraitArtwork,
        x: config.frame.x, y: config.frame.y, scaleX: 1, scaleY: 1,
        duration: config.transitionDuration, ease: 'Sine.easeInOut',
        onComplete: () => {
          this.portraitPhase = 'revealing';
          this.portraitTween = this.tweens.add({
            targets: [this.portraitFrame, this.portraitTitle],
            alpha: 1, duration: config.transitionDuration, ease: 'Sine.easeInOut',
            onComplete: () => {
              this.portraitTween = null;
              this.portraitPhase = 'hold';
              // Оставляем только «далее»: картина ждёт отдельного нажатия.
              for (const object of [this.characterImage, this.panelBg, this.speakerNameText,
                this.dialogueText, this.dialogueRevealedText, this.backBtn.bg]) {
                object.setVisible(false);
              }
              this.bottomGroup.setVisible(true);
              this.nextBtn.bg.setVisible(true);
            },
          });
        },
      });
    }

    finishPortraitSequence() {
      if (this.portraitPhase !== 'hold') return;
      this.portraitPhase = 'finished';
      this.clearScreenTimer();
      window.VN.systems.GameState.save();
      window.VN.systems.StartupScreen.show('Загрузка финального экрана…');
      this.scene.stop();
      window.location.assign('games/finish/index.html');
    }

    clearScreenTimer() {
      this.screenTimer?.remove(false);
      this.screenTimer = null;
    }

    scheduleScreenAction(entry) {
      this.pendingBackgroundPath = entry.backgroundChange?.path ?? null;
      // Окончание звука проверяется в update: пауза/история могут перезапустить реплику.
      if (this.pendingBackgroundPath && entry.backgroundChange.afterVoice) return;
      const delay = this.pendingBackgroundPath ? entry.backgroundChange.delay : entry.autoAdvanceDelay;
      this.scheduleScreenTimer(delay, () => {
        if (this.pendingBackgroundPath) this.changeScreenBackground();
        else this.advanceScreen();
      });
    }

    scheduleScreenTimer(delay, callback) {
      this.clearScreenTimer();
      if (delay == null) return;

      // Часы Phaser останавливаются вместе со сценой в меню паузы.
      this.screenTimer = this.time.delayedCall(delay, () => {
        this.screenTimer = null;
        callback();
      });
      this.screenTimer.paused = this.historyVisible;
    }

    changeScreenBackground() {
      if (this.cancelBackgroundTransition) return true;
      if (!this.pendingBackgroundPath) return false;
      this.clearScreenTimer();
      const path = this.pendingBackgroundPath;
      const entry = this.currentLines[this.screenIndex];
      this.pendingBackgroundPath = null;
      const scheduleAdvance = () => this.scheduleScreenTimer(entry.autoAdvanceDelay, () => this.advanceScreen());
      const fadeDuration = entry.backgroundChange.fadeDuration || 0;
      if (fadeDuration <= 0) {
        this.setBackground(path);
        scheduleAdvance();
        return true;
      }

      this.skipVoice();
      this._pendingVoiceResume = false;
      this.voiceInterruptedByOverlay = false;
      const camera = this.cameras.main;
      const inputEnabled = this.input.enabled;
      const keyboardEnabled = this.input.keyboard?.enabled;
      this.input.enabled = false;
      if (this.input.keyboard) this.input.keyboard.enabled = false;

      const finish = () => {
        this.cancelBackgroundTransition();
        scheduleAdvance();
      };
      const showBackground = () => {
        this.setBackground(path);
        if (entry.backgroundChange.hideDialogue) {
          this.setCharacter('');
          this.panelBg.setAlpha(0);
          this.speakerNameText.setText('');
          this.dialogueText.setText('');
          this.dialogueRevealedText.setText('');
          this.destroyGlossaryWordOverlays();
        }
        camera.once('camerafadeincomplete', finish);
        camera.fadeIn(fadeDuration / 2, 0, 0, 0);
      };
      this.cancelBackgroundTransition = () => {
        camera.off('camerafadeoutcomplete', showBackground);
        camera.off('camerafadeincomplete', finish);
        camera.fadeEffect.reset();
        this.input.enabled = inputEnabled;
        if (this.input.keyboard) this.input.keyboard.enabled = keyboardEnabled;
        this.cancelBackgroundTransition = null;
      };
      camera.once('camerafadeoutcomplete', showBackground);
      camera.fadeOut(fadeDuration / 2, 0, 0, 0);
      return true;
    }

    goNext() {
      if (this.portraitPhase) {
        if (this.portraitPhase === 'hold') {
          this.finishPortraitSequence();
        } else if (this.portraitPhase === 'dialogue' && !this.historyVisible) {
          this.skipVoice();
          this.portraitVoiceComplete = true;
          this.showPortraitTitle();
        }
        return;
      }
      // Смена фона — отдельный шаг внутри экрана. После него следующий
      // клик переходит дальше, даже если озвучка ещё не закончилась.
      if (this.changeScreenBackground()) return;

      // Пока играет озвучка — первый клик "Далее" только обрывает её и
      // сразу дозаполняет текст реплики целиком, экран пока не меняется.
      if (this.voiceActive && !this.currentLines[this.screenIndex].backgroundChange) {
        this.skipVoice();
        return;
      }

      this.advanceScreen();
    }

    advanceScreen() {
      if (this.portraitPhase) {
        this.showPortraitTitle();
        return;
      }
      if (this.cancelBackgroundTransition) return;
      if (this.screenIndex < this.totalScreensInThisScene - 1) {
        this.screenIndex += 1;
        this.renderCurrentScreen();
      } else {
        this.startMinigame();
      }
    }

    goBack() {
      if (this.portraitPhase) return;
      if (this.cancelBackgroundTransition) return;
      if (this.screenIndex > 0) {
        this.screenIndex -= 1;
        // "Назад" не переслушивает реплику: текст сразу целиком тёмным.
        this.renderCurrentScreen({ skipVoice: true });
      }
    }

    // ---- синхронизация текста реплики с озвучкой -----------------------------

    /**
     * Запускает воспроизведение озвучки реплики и побуквенную анимацию текста.
     * voiceConfig — путь строкой, либо { path, delay, margin, volume }:
     *   delay  — задержка в секундах перед стартом анимации текста (звук
     *            при этом стартует сразу);
     *   margin — "погрешность" в секундах (по умолчанию 0): дополнительно
     *            вычитается из времени на анимацию, как и delay.
     * Анимация укладывается в (duration - delay - margin) секунд, чтобы
     * текст заканчивал проявляться к концу дорожки, а не позже.
     *
     * Файл озвучки к этому моменту уже в кэше: SceneAudio.paths() включает
     * screen.voice, поэтому SceneAssets грузит его через общую очередь
     * (в preload сцены и заранее через prefetchNext предыдущей сцены).
     */
    startVoiceReveal(voiceConfig, text, nowMs) {
      if (this.portraitPhase === 'dialogue') this.portraitVoiceComplete = false;
      // При повторном входе в сцену this.time.now хранит время до мини-игры
      // вплоть до первого update(). Берём время текущего кадра игры —
      // в той же шкале, что time в updateVoiceReveal(), даже в create().
      const now = nowMs != null ? nowMs : this.game.getTime();
      const config = typeof voiceConfig === 'string' ? { path: voiceConfig } : voiceConfig;
      const delay = config.delay || 0;
      const margin = config.margin || 0;

      let track;
      try {
        const controller = window.VN.systems.MusicController.forScene(this);
        // Аудио запускаем сразу, без delay — задержка и погрешность влияют
        // только на анимацию текста.
        track = controller.playSound({ path: config.path, volume: config.volume, loop: false });
      } catch (error) {
        // Файл не загрузился/не декодировался — не должно ломать сюжет,
        // просто показываем реплику как обычно, без анимации.
        console.warn('[StoryScene]', error.message);
        this.dialogueRevealedText.setText(text);
        this.applyGlossaryReveal(Infinity);
        return;
      }

      const duration = track.source.buffer ? track.source.buffer.duration : 0;
      this.voiceTrack = track;
      this.voiceFullText = text;
      // Полный текст, разбитый на строки ТАК ЖЕ, как его уже разбил
      // wordWrap светлого слоя — с реальными переносами. Режем именно эту
      // версию: тогда слово не "перескакивает" на следующую строку, пока
      // проявляется по буквам.
      this.voiceRevealText = this.dialogueText.getWrappedText(text).join('\n');
      this.voiceRevealDuration = Math.max(0, duration - delay - margin);
      this.voiceStartTime = now + delay * 1000;
      this.voiceActive = duration > 0;
      this.dialogueRevealedText.setText(this.voiceActive ? '' : text);
      // Если длительности нет (edge-case) — текст показан сразу целиком,
      // слова-ссылки тоже сразу жирные; иначе они ещё скрыты (см. build) —
      // это важно и при повторном запуске после паузы/"Истории"
      // (resumeVoiceIfNeeded): реплика проигрывается заново с начала,
      // поэтому уже показанные слова-ссылки тоже скрываются обратно.
      this.applyGlossaryReveal(this.voiceActive ? 0 : Infinity);
    }

    /** Вызывается из update(): подсвечивает "проговорённую" часть текста. */
    updateVoiceReveal(time) {
      if (!this.voiceActive) return;

      // Пока идёт задержка перед стартом анимации — тёмного текста нет.
      if (time < this.voiceStartTime) {
        if (this.dialogueRevealedText.text !== '') this.dialogueRevealedText.setText('');
        return;
      }

      const elapsedSeconds = (time - this.voiceStartTime) / 1000;
      if (elapsedSeconds >= this.voiceRevealDuration) {
        this.dialogueRevealedText.setText(this.voiceFullText);
        // Текст дописан, но звук мог ещё не закончиться (margin) — не
        // обрываем его, просто завершаем анимацию. Все слова-ссылки к
        // этому моменту уже "проговорены" — показываем их жирными.
        this.voiceActive = false;
        this.applyGlossaryReveal(Infinity);
        return;
      }

      const ratio = this.voiceRevealDuration > 0
        ? Phaser.Math.Clamp(elapsedSeconds / this.voiceRevealDuration, 0, 1)
        : 1;
      const revealCount = Math.floor(ratio * this.voiceRevealText.length);
      const revealed = this.voiceRevealText.slice(0, revealCount);
      // setText перерисовывает canvas текста — вызываем только при реальном
      // изменении, а не каждый кадр (важно для слабых телефонов).
      if (revealed !== this.dialogueRevealedText.text) this.dialogueRevealedText.setText(revealed);
      // Слово-ссылка становится жирным и подчёркнутым, как только тёмный
      // текст дойдёт до его конца — не раньше.
      this.applyGlossaryReveal(revealCount);
    }

    /**
     * Прерывает воспроизведение и сразу показывает реплику целиком —
     * реакция на первый клик "Далее" во время озвучки.
     */
    skipVoice() {
      if (this.voiceFullText != null) this.dialogueRevealedText.setText(this.voiceFullText);
      this.applyGlossaryReveal(Infinity);
      this.stopVoice();
    }

    /**
     * Молча останавливает текущую озвучку — при переходе на другой экран,
     * "Назад", открытии паузы/истории, уходе со сцены.
     */
    stopVoice() {
      if (this.voiceTrack) {
        if (this.portraitPhase === 'dialogue' && this.voiceTrack.ended) this.portraitVoiceComplete = true;
        this.voiceTrack.stop();
        this.voiceTrack = null;
      }
      this.voiceActive = false;
    }

    /**
     * Возобновляет озвучку и анимацию текущей реплики после паузы или
     * "Истории". Реплика проигрывается заново с начала. Если к моменту
     * прерывания текст уже был проявлен целиком — ничего не перезапускаем.
     * Сам запуск откладывается до update() (см. startVoiceReveal()).
     */
    resumeVoiceIfNeeded() {
      if (this.voiceInterruptedByOverlay && this._voiceConfigForCurrentScreen) {
        this._pendingVoiceResume = true;
      }
      this.voiceInterruptedByOverlay = false;
    }

    startMinigame() {
      if (this.portraitPhase) {
        this.showPortraitTitle();
        return;
      }
      this.clearScreenTimer();
      const GameState = window.VN.systems.GameState;
      GameState.markMinigameStarted();

      const sceneKey = this.currentMinigameKey || 'PlaceholderMinigameScene';
      const minigameId = 'story_' + (this.storySceneIndex + 1) + '_minigame';

      this.scene.start(sceneKey, {
        storySceneIndex: this.storySceneIndex,
        minigameId: minigameId,
      });
    }

    toggleHistory() {
      if (this.portraitPhase && this.portraitPhase !== 'dialogue') return;
      // Открытие "Истории" останавливает текущую озвучку; запоминаем, была ли
      // она прервана, чтобы при закрытии окна проиграть реплику заново.
      if (!this.historyVisible) {
        this.voiceInterruptedByOverlay = this.voiceActive
          || Boolean(this.portraitPhase === 'dialogue' && this.voiceTrack && !this.voiceTrack.ended);
        this.stopVoice();
      }

      this.historyVisible = !this.historyVisible;
      if (this.portraitVideo && !this.portraitAnimationComplete) {
        this.portraitVideo.setPaused(this.historyVisible);
      }
      if (this.screenTimer) this.screenTimer.paused = this.historyVisible;
      this.historyContainer.setVisible(this.historyVisible);
      // Иконка "История" пропадает, пока открыто окно, и появляется снова
      // при закрытии — один toggle, без повторного переключения.
      this.historyBtn.bg.setVisible(!this.historyVisible);

      if (this.historyVisible) {
        // Показываем реплики всех сюжетных сцен, пройденных к этому моменту,
        // а не только текущей — в хронологическом порядке.
        const entries = window.VN.systems.GameState.getFullHistory();
        this.historyText.setText(
          entries
            .map(function (e) {
              return e.speakerName ? e.speakerName + ':\n' + e.text : e.text;
            })
            .join('\n\n')
        );
        // Каждый раз открываем историю с самого начала и пересчитываем
        // размер/позицию ползунка под актуальный объём текста.
        this.setHistoryScroll(0);
      } else {
        this.resumeVoiceIfNeeded();
      }
    }

    openPauseMenu() {
      if (this.portraitPhase && !['loading', 'dialogue'].includes(this.portraitPhase)) return;
      // Пока сцена на паузе, её update() не выполняется, но Web Audio
      // продолжил бы играть в фоне — останавливаем озвучку.
      this.voiceInterruptedByOverlay = this.voiceActive
        || Boolean(this.portraitPhase === 'dialogue' && this.voiceTrack && !this.voiceTrack.ended);
      this.stopVoice();
      this.scene.pause();
      this.scene.launch('PauseScene', { returnSceneKey: 'StoryScene' });
    }
  }

  window.VN.scenes.StoryScene = StoryScene;
})();
