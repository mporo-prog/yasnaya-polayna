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

    getAssetManifest() {
      return {
        images: [
          { key: 'dialogTextBg', url: 'images/icon_UI/dialog_text_bg.png' },
          { key: 'historyModalBg', url: 'images/icon_UI/history_modal_bg.png' },
          { key: 'closeButton', url: 'images/icon_UI/close_button.png' },
        ],
      };
    }

    init(data) {
      data = data || {};
      const GameState = window.VN.systems.GameState;
      this.storySceneIndex = data.storySceneIndex != null ? data.storySceneIndex : GameState.state.storySceneIndex;
      this.screenIndex = data.screenIndex != null ? data.screenIndex : GameState.state.screenIndex;
      this.historyVisible = false;
    }

    preload() {
      window.VN.systems.SceneAssets.preload(this);
    }

    create() {
      this.sceneAudio = window.VN.systems.SceneAudio.enter(this);
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

      this.layout.onLayout(this, (visible, ui) => {
        this.bottomGroup.y = ui.bottom - HEIGHT;
      });

      this.renderCurrentScreen();
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
      });
    }

    update(time) {
      // Отложенный перезапуск озвучки после паузы/истории — см. комментарий
      // в resumeVoiceIfNeeded(): его нельзя делать синхронно в обработчике
      // клика "Продолжить", поэтому здесь мы забираем его на первом же
      // кадре после возобновления, когда time уже точно актуально.
      if (this._pendingVoiceResume) {
        this._pendingVoiceResume = false;
        this.startVoiceReveal(this._voiceConfigForCurrentScreen, this._textForCurrentScreen, time);
      }
      this.updateVoiceReveal(time);
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
      this.background = this.layout.addBackground(this, null);

      this.bgLabel = this.add.text(WIDTH / 2, BAR_Y / 2, 'Фон', { fontSize: '40px', color: '#000000' }).setOrigin(0.5).setVisible(false);
    }

    setBackground(path) {
      if (this.textures.exists(path)) {
        this.background.setTexture(path);
        this.bgLabel.setVisible(false);
      } else {
        this.background.setTexture(null);
        this.bgLabel.setVisible(true).setText('Фон не найден:\n' + path);
      }
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

      // Плашка диалога — по дизайну задан её ПРАВЫЙ ВЕРХНИЙ угол:
      // 8.63% от правого края макета, 68.58% от верхнего края,
      // фиксированный размер 1580.17 x 314.3px (не доля ширины экрана,
      // как было раньше).
      const panelWidth = 1580.17;
      const panelHeight = 314.3;
      const panelRight = WIDTH - WIDTH * 0.0863;
      const panelLeft = panelRight - panelWidth;
      const panelY = HEIGHT * 0.6858;
      const panelCenterY = panelY + panelHeight / 2;

      this.panelY = panelY;
      this.panelHeight = panelHeight;

      this.panelLeft = panelLeft;
      this.panelWidth = panelWidth;
      this.panelCenterY = panelCenterY;

      // Плашка реплики — бежевая, однотонная (без градиента/текстуры).
      const panelBg = this.add.image(panelLeft, panelY, 'dialogTextBg').setOrigin(0, 0).setDisplaySize(panelWidth, panelHeight);

      // Имя героя — родитель "Диалоговое окно", позиция задана в % от его
      // размеров (от левого верхнего угла панели): 5.643% / 18.231%.
      const nameX = panelLeft + panelWidth * 0.0564306372099;
      const nameY = panelY + panelHeight * 0.25;
      const nameAreaWidth = panelWidth * 0.32;

      this.speakerNameText = this.add
        .text(nameX, nameY, '', {
          fontFamily: 'Philosopher',
          fontSize: '40px',
          color: '#6E6056',
          align: 'left',
          wordWrap: { width: nameAreaWidth - 55 },
        })
        .setOrigin(0, 0);

      // Текст реплики — родитель "Диалоговое окно", позиция 29.185% / 16.322%
      // от размеров панели, фиксированная ширина 922px (высота — по контенту).
      const textX = panelLeft + panelWidth * 0.291848345431;
      this.dialogueTextY = panelY + panelHeight * 0.25;

      const dialogueTextStyle = {
        fontFamily: 'Ysabeau',
        fontSize: '32px',
        align: 'left',
        wordWrap: { width: 922 },
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
        .text(textX, this.dialogueTextY, '', { ...dialogueTextStyle, color: '#E3D8CA' })
        .setOrigin(0, 0);

      this.dialogueRevealedText = this.add
        .text(textX, this.dialogueTextY, '', { ...dialogueTextStyle, color: '#1B1A19' })
        .setOrigin(0, 0);

      this.bottomGroup.add([panelBg, this.speakerNameText, this.dialogueText, this.dialogueRevealedText]);
    }

    buildNavButtons() {
      // "Далее" — абсолютная позиция на макете (не привязана к плашке):
      // левый верхний угол на 85.417% / 76.389%, размер 150x150.
      // makeIconButton ставит x/y в ЦЕНТР картинки (origin 0.5,0.5 по
      // умолчанию у Phaser.Image), поэтому смещаем на половину размера.
      const nextBtnSize = 150;
      const nextBtnX = WIDTH * 0.8541666667 + nextBtnSize / 2;
      const nextBtnY = HEIGHT * 0.7638888889 + nextBtnSize / 2;
      this.nextBtn = this.makeIconButton(
        nextBtnX,
        nextBtnY,
        'images/icon_UI/next_button.png',
        () => this.goNext(),
        nextBtnSize
      );

      // "Назад" — левый верхний угол на 6.77% / 86.389%, размер 96x96.
      const backBtnSize = 96;
      const backBtnX = WIDTH * 0.0677 + backBtnSize / 2;
      const backBtnY = HEIGHT * 0.8638888889 + backBtnSize / 2;
      this.backBtn = this.makeIconButton(
        backBtnX,
        backBtnY,
        'images/icon_UI/back_button.png',
        () => this.goBack(),
        backBtnSize
      );

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
      const menuBtn = this.makeIconButton(menuBtnLeft, menuBtnTop, 'images/icon_UI/pause_button.png', () => this.openPauseMenu(), menuBtnSize);
      menuBtn.bg.setDepth(20);

      this.historyBtn = this.makeIconButton(100, 205, 'images/icon_UI/history_button.png', () => this.toggleHistory(), 70);
      this.historyBtn.bg.setDepth(20);

      // Прижимаем к левому верхнему углу экрана (с учётом выреза телефона),
      // а не к углу макета — на широком экране они уходят на поле.
      this.layout.pin(this, menuBtn.bg, { left: menuBtnLeft, top: menuBtnTop });
      this.layout.pin(this, this.historyBtn.bg, { left: 100, top: 205 });
    }

    /** Кнопка-иконка (картинка вместо прямоугольника с текстом). */
    makeIconButton(x, y, texture, onClick, displaySize) {
      const img = this.add.image(x, y, texture).setInteractive({ useHandCursor: true });
      if (displaySize) img.setDisplaySize(displaySize, displaySize);
      img.on('pointerup', onClick);
      return { bg: img, text: null };
    }

    buildHistoryOverlay() {
      // Небольшое окно по центру экрана, а не на весь экран — фон сюжетной
      // сцены остаётся виден (просто слегка притемнён) вокруг него.
      const panelW = WIDTH * 0.62;
      const panelH = HEIGHT * 0.82;
      const panelX = (WIDTH - panelW) / 2;
      const panelY = (HEIGHT - panelH) / 2;

      // Видимая область под текст истории — за её пределами текст обрезается
      // маской, доступ к остальному — прокруткой.
      const viewport = {
        x: panelX + 90,
        y: panelY + 150,
        width: panelW - 200,
        height: panelH - 150 - 100,
      };
      this.historyViewport = viewport;
      this.historyScrollY = 0;
      this.historyMaxScroll = 0;
      this.historyDragStartY = null;
      this.historyDragStartScroll = 0;

      this.historyContainer = this.add.container(0, 0).setDepth(10).setVisible(false);

      // Затемняющая подложка на весь экран — приглушает фон и перехватывает
      // клики мимо окна, но сам фон сцены под ней остаётся виден.
      const dimBg = this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x000000, 0.35).setOrigin(0, 0).setInteractive();
      this.layout.fill(this, dimBg); // затемнение — на весь экран, включая поля

      // Сама панель "История" — небольшая, по центру, картинка-рамка.
      const windowBg = this.add
        .image(panelX, panelY, 'historyModalBg')
        .setOrigin(0, 0)
        .setDisplaySize(panelW, panelH)
        .setInteractive();

      const title = this.add.text(WIDTH / 2, panelY + 90, 'История', { fontFamily: 'Philosopher', fontSize: '48px', color: '#3f2f22' }).setOrigin(0.5);

      /**
       * Крестик для закрытия вкладки "История" — часть самого окна истории,
       * поэтому создаётся здесь и добавляется в тот же historyContainer,
       * чтобы появляться и исчезать вместе с окном, а не жить отдельно.
       */
      const closeBtn = this.add
        .image(panelX + panelW - 50, panelY + 50, 'closeButton')
        .setDisplaySize(60, 60)
        .setInteractive({ useHandCursor: true });
      closeBtn.on('pointerup', () => this.toggleHistory());

      // Сам текст — внутри отдельного контейнера, который двигается вверх/
      // вниз при прокрутке; видна только часть внутри viewport благодаря маске.
      this.historyText = this.add.text(0, 0, '', {
        fontSize: '28px',
        color: '#3f2f22',
        wordWrap: { width: viewport.width },
        lineSpacing: 24,
      });
      this.historyContentContainer = this.add.container(viewport.x, viewport.y, [this.historyText]);

      const maskShape = this.make.graphics({ x: 0, y: 0 }, false);
      maskShape.fillStyle(0xffffff);
      maskShape.fillRect(viewport.x, viewport.y, viewport.width, viewport.height);
      this.historyContentContainer.setMask(maskShape.createGeometryMask());

      // Полоса прокрутки справа от текста, внутри панели.
      const trackX = viewport.x + viewport.width + 30;
      this.historyScrollTrack = this.add.rectangle(trackX, viewport.y, 6, viewport.height, 0x5a4632, 0.5).setOrigin(0.5, 0);
      this.historyScrollThumb = this.add.rectangle(trackX, viewport.y, 10, viewport.height, 0x5a4632).setOrigin(0.5, 0);

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

    // ---- логика переключения экранов -----------------------------------------

    /**
     * options.skipVoice — не запускать озвучку/анимацию для этого показа
     * экрана, а сразу показать реплику полностью тёмным текстом. Используется
     * для "Назад" (goBack()): переслушивать реплику при возврате не нужно.
     */
    renderCurrentScreen(options = {}) {
      const skipVoice = options.skipVoice === true;

      // Реплика предыдущего экрана могла ещё озвучиваться — обрываем её.
      this.stopVoice();

      this.sceneAudio.showScreen(this.screenIndex);
      const GameState = window.VN.systems.GameState;
      const entry = this.currentLines[this.screenIndex];
      const text = entry.text;
      const speakerName = entry.speaker || '';
      const backgroundPath = this.currentBackgrounds[this.screenIndex];
      const historyOverride = this.currentHistoryTexts[this.screenIndex];
      const historyText = historyOverride != null ? historyOverride : text;
      const storyAudio = window.VN.data.storyAudio?.[this.storySceneIndex];
      const voiceConfig = storyAudio?.screens?.[this.screenIndex]?.voice || null;

      this.setBackground(backgroundPath);
      this.setCharacter(speakerName);
      this.speakerNameText.setText(speakerName || '');
      this.dialogueText.setText(text);

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
        // Озвучки нет, либо это возврат "Назад" — реплика сразу целиком.
        this.dialogueRevealedText.setText(text);
      }

      GameState.goToScreen(this.storySceneIndex, this.screenIndex);
      GameState.addHistoryEntry(this.storySceneIndex, this.screenIndex, historyText, speakerName);

      const isFirstScreen = this.screenIndex === 0;
      this.backBtn.bg.setAlpha(isFirstScreen ? 0.4 : 1);
      if (isFirstScreen) this.backBtn.bg.disableInteractive();
      else this.backBtn.bg.setInteractive({ useHandCursor: true });
    }

    goNext() {
      // Пока играет озвучка — первый клик "Далее" только обрывает её и
      // сразу дозаполняет текст реплики целиком, экран пока не меняется.
      if (this.voiceActive) {
        this.skipVoice();
        return;
      }

      if (this.screenIndex < this.totalScreensInThisScene - 1) {
        this.screenIndex += 1;
        this.renderCurrentScreen();
      } else {
        this.startMinigame();
      }
    }

    goBack() {
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
      // nowMs передаётся явно только при отложенном перезапуске после
      // паузы/истории (см. update()): this.time.now сразу после
      // scene.resume() ещё "застывший" и дал бы проскок анимации.
      const now = nowMs != null ? nowMs : this.time.now;
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
        // обрываем его, просто завершаем анимацию.
        this.voiceActive = false;
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
    }

    /**
     * Прерывает воспроизведение и сразу показывает реплику целиком —
     * реакция на первый клик "Далее" во время озвучки.
     */
    skipVoice() {
      if (this.voiceFullText != null) this.dialogueRevealedText.setText(this.voiceFullText);
      this.stopVoice();
    }

    /**
     * Молча останавливает текущую озвучку — при переходе на другой экран,
     * "Назад", открытии паузы/истории, уходе со сцены.
     */
    stopVoice() {
      if (this.voiceTrack) {
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
      // Открытие "Истории" останавливает текущую озвучку; запоминаем, была ли
      // она прервана, чтобы при закрытии окна проиграть реплику заново.
      if (!this.historyVisible) {
        this.voiceInterruptedByOverlay = this.voiceActive;
        this.stopVoice();
      }

      this.historyVisible = !this.historyVisible;
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
      // Пока сцена на паузе, её update() не выполняется, но Web Audio
      // продолжил бы играть в фоне — останавливаем озвучку.
      this.voiceInterruptedByOverlay = this.voiceActive;
      this.stopVoice();
      this.scene.pause();
      this.scene.launch('PauseScene', { returnSceneKey: 'StoryScene' });
    }
  }

  window.VN.scenes.StoryScene = StoryScene;
})();