(function () {
  const WIDTH = 1920;
  const HEIGHT = 1080;
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

    init(data) {
      data = data || {};
      const GameState = window.VN.systems.GameState;
      this.storySceneIndex = data.storySceneIndex != null ? data.storySceneIndex : GameState.state.storySceneIndex;
      this.screenIndex = data.screenIndex != null ? data.screenIndex : GameState.state.screenIndex;
      this.historyVisible = false;
    }

    preload() {
      window.VN.systems.SceneAudio.preload(this);
      this.load.image('historyModalBg', 'resource/images/ui/history_modal_bg.png');
      this.load.image('dialogTextBg', 'resource/images/ui/dialog_text_bg.png');

      this.load.image('closeButton', 'resource/images/ui/close_button.png');

      // SceneAudio.preload() уже поставил все пути storyAudio (включая
      // screen.voice) в очередь загрузки — здесь ничего дополнительно
      // грузить не нужно.
    }

    create() {
      this.sceneAudio = window.VN.systems.SceneAudio.enter(this);
      this.buildBackgroundLayer();
      this.buildCharacterLayer();
      this.buildBottomBar();
      this.buildNavButtons();
      this.buildTopButtons();
      this.buildHistoryOverlay();

      this.renderCurrentScreen();

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
      this.bgImage = this.add.image(0, 0, '__MISSING').setOrigin(0, 0).setVisible(false);

      this.bgLabel = this.add.text(WIDTH / 2, BAR_Y / 2, 'Фон', { fontSize: '40px', color: '#000000' }).setOrigin(0.5).setVisible(false);
    }

    setBackground(path) {
      if (this.textures.exists(path)) {
        this.bgImage.setTexture(path).setDisplaySize(WIDTH, BAR_Y).setVisible(true);
        this.bgLabel.setVisible(false);
      } else {
        this.bgImage.setVisible(false);
        this.bgLabel.setVisible(true).setText('Фон не найден:\n' + path);
      }
    }

    // ---- персонаж на экране (по имени говорящего) ---------------------------

    buildCharacterLayer() {
      this.characterImage = this.add.image(WIDTH * 0.22, BAR_Y, '__MISSING').setOrigin(0.5, 1).setVisible(false);
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

      const dialogTex = this.textures.get('dialogTextBg').getSourceImage();
      const panelWidth = WIDTH * 0.75;
      const panelHeight = panelWidth * (dialogTex.height / dialogTex.width);

      // "плажку чуть-чуть приподними" — панель поднята над самым низом экрана.
      const panelY = HEIGHT - panelHeight - 110;
      const panelLeft = WIDTH / 2 - panelWidth / 2;
      const panelCenterY = panelY + panelHeight / 2;

      this.panelY = panelY;
      this.panelHeight = panelHeight;

      this.panelLeft = panelLeft;
      this.panelWidth = panelWidth;
      this.panelCenterY = panelCenterY;

      // Плашка реплики — бежевая, однотонная (без градиента/текстуры).
      this.add.image(WIDTH / 2, panelY, 'dialogTextBg').setOrigin(0.5, 0).setDisplaySize(panelWidth, panelHeight);
      // Имя героя — слева, отделено вертикальной чертой от текста реплики
      // (макет: имя и реплика стоят в один ряд, а не друг под другом).
      const nameAreaWidth = panelWidth * 0.32;
      const nameX = panelLeft + 65;
      const dividerX = panelLeft + nameAreaWidth;
      const textX = dividerX - 10;

      this.speakerNameText = this.add
        .text(nameX, panelCenterY, '', {
          fontFamily: 'Philosopher',
          fontSize: '40px',
          color: '#6E6056',
          align: 'left',
          wordWrap: { width: nameAreaWidth - 55 },
        })
        .setOrigin(0, 0.5);

      const dialogueTextStyle = {
        fontFamily: 'Ysabeau',
        fontSize: '32px',
        align: 'left',
        wordWrap: { width: panelLeft + panelWidth - textX - 90 },
      };

      // Реплика рисуется двумя наложенными друг на друга текстами:
      // нижний — "непроговорённый" цвет на всю длину сразу, верхний —
      // "проговорённый" цвет, растущий по мере воспроизведения озвучки.
      // Если у реплики нет озвучки, верхний текст сразу выставляется
      // на всю длину — получается обычное мгновенное появление, как раньше.
      //
      // Оба текста выровнены по верхнему краю (setOrigin(0, 0)), а не по
      // центру: при побуквенном заполнении "проговорённый" текст короче и
      // оборачивается в меньшее число строк, поэтому при центрировании его
      // верх "плавал" бы ниже верха светлого текста. Единая верхняя точка
      // Y пересчитывается в renderCurrentScreen() по высоте полного текста
      // и применяется к обоим слоям — они всегда начинаются с одной строки.
      this.dialogueText = this.add
        .text(textX, panelCenterY, '', { ...dialogueTextStyle, color: '#E3D8CA' })
        .setOrigin(0, 0);

      this.dialogueRevealedText = this.add
        .text(textX, panelCenterY, '', { ...dialogueTextStyle, color: '#1B1A19' })
        .setOrigin(0, 0);
    }

    buildNavButtons() {
      // "Далее" — у правого края плашки, по центру по вертикали.
      this.nextBtn = this.makeIconButton(
        this.panelLeft + this.panelWidth,
        this.panelCenterY,
        'resource/images/ui/next_button.png',
        () => this.goNext()
      );

      // "Назад" — у левого нижнего края плашки, размером поменьше.
      this.backBtn = this.makeIconButton(
        this.panelLeft,
        this.panelY + this.panelHeight - 80,
        'resource/images/ui/back_button.png',
        () => this.goBack(),
        90
      );
    }

    buildTopButtons() {
      // depth выше, чем у historyContainer (10) — чтобы кнопки оставались
      // видимыми и кликабельными поверх открытой вкладки "История"
      // (крестика для закрытия больше нет, закрывают тем же тумблером).
      const menuBtn = this.makeIconButton(1920 * 0.015 + 75, 1080 * 0.023 + 75, 'images/icon_UI/pause_button.png', () => this.openPauseMenu(), 150);
      menuBtn.bg.setDepth(20);

      this.historyBtn = this.makeIconButton(100, 205, 'resource/images/ui/history_button.png', () => this.toggleHistory(), 70);
      this.historyBtn.bg.setDepth(20);
    }

    /** Кнопка-иконка (картинка вместо прямоугольника с текстом). */
    makeIconButton(x, y, texture, onClick, displaySize) {
      const img = this.add.image(x, y, texture).setInteractive({ useHandCursor: true });
      if (displaySize) img.setDisplaySize(displaySize, displaySize);
      img.on('pointerup', onClick);
      window.VN.systems.ButtonFx.applyHoverLift(this, img, img);
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
      window.VN.systems.ButtonFx.applyHoverLift(this, closeBtn, closeBtn);

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

      // Реплика предыдущего экрана могла ещё озвучиваться — обрываем её
      // молча (без ускоренного дозаполнения текста, оно тут ни на что не
      // влияет: экран и так уже полностью меняется).
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

      // Общая верхняя точка для обоих слоёв текста реплики — считаем её по
      // высоте ПОЛНОГО текста (dialogueText), чтобы блок был вертикально
      // центрирован в панели так же, как раньше, но верх был фиксирован и
      // общий для светлого и тёмного слоя (см. buildBottomBar()).
      const textTopY = this.panelCenterY - this.dialogueText.height / 2;
      this.dialogueText.setY(textTopY);
      this.dialogueRevealedText.setY(textTopY);

      // Запоминаем для возможного перезапуска озвучки после паузы/истории
      // (см. resumeVoiceIfNeeded()) — без повторного обращения к storyAudio.
      this._voiceConfigForCurrentScreen = voiceConfig;
      this._textForCurrentScreen = text;

      if (voiceConfig && !skipVoice) {
        // Есть озвучка — реплика "проговаривается" побуквенно синхронно с ней;
        // startVoiceReveal сама очищает dialogueRevealedText.
        this.startVoiceReveal(voiceConfig, text);
      } else {
        // Озвучки нет, либо это возврат "Назад" (skipVoice) — реплика
        // показывается сразу целиком тёмным текстом, без звука и анимации.
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
      // Только следующий клик "Далее" переводит реплику дальше.
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
        // "Назад" не переслушивает реплику: ни звук, ни анимация не
        // запускаются — текст сразу показывается целиком тёмным.
        this.renderCurrentScreen({ skipVoice: true });
      }
    }

    // ---- синхронизация текста реплики с озвучкой -----------------------------

    /**
     * Запускает воспроизведение озвучки реплики и побуквенную анимацию текста.
     * voiceConfig — путь строкой, либо { path, delay, margin }:
     *   delay  — задержка в секундах перед стартом анимации текста (звук
     *            при этом стартует сразу, без задержки);
     *   margin — "погрешность" в секундах (по умолчанию 0): дополнительно
     *            вычитается из времени на анимацию, как и delay.
     * Сама анимация укладывается в (duration - delay - margin) секунд, то
     * есть скорость проявления текста — (duration - delay - margin) /
     * количество символов реплики — чтобы дозаполнение всё равно
     * заканчивалось ровно к концу дорожки, а не позже.
     */
    startVoiceReveal(voiceConfig, text, nowMs) {
      // nowMs передаётся явно только при отложенном перезапуске после
      // паузы/истории (см. update()) — там важно использовать "живое" time
      // из update(), а не this.time.now, которое сразу после scene.resume()
      // ещё не обновилось (обновится только на следующем кадре) и было бы
      // "устаревшим": расчёт voiceStartTime на его основе давал бы момент,
      // который к следующему кадру уже в прошлом — из-за этого задержка и
      // анимация после выхода из паузы фактически проскакивали вперёд,
      // вместо того чтобы начаться с нуля.
      const now = nowMs != null ? nowMs : this.time.now;
      const config = typeof voiceConfig === 'string' ? { path: voiceConfig } : voiceConfig;
      const delay = config.delay || 0;
      const margin = config.margin || 0;

      let track;
      try {
        const controller = window.VN.systems.MusicController.forScene(this);
        // Аудио запускаем сразу, без delay — задержка и погрешность влияют
        // только на анимацию текста.
        track = controller.playSound({ path: config.path });
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
      this.voiceDuration = duration;
      // Полный текст, разбитый на строки ТАК ЖЕ, как его уже разбил
      // wordWrap светлого слоя (dialogueText) — с реальными переносами
      // строк вместо пробелов на местах переноса. По мере проявления мы
      // режем именно эту версию, а не исходную строку: тогда "проговорённый"
      // текст с самого первого символа появляется на своей окончательной
      // строке, а не сначала на предыдущей и потом "перескакивает" на
      // следующую при добавлении новых букв (сравните с обычным словом,
      // которое из-за собственного wordWrap короткого фрагмента иногда
      // сперва помещается на первой строке, а на 3–4 букве вдруг уезжает
      // на вторую — так и выглядела эта проблема).
      this.voiceRevealText = this.dialogueText.getWrappedText(text).join('\n');
      // У анимации на дозаполнение текста остаётся не вся длительность
      // дорожки, а (duration - delay - margin): она стартует позже звука,
      // но должна закончиться в тот же момент — иначе текст "доедет" уже
      // после того, как реплика замолчала.
      this.voiceRevealDuration = Math.max(0, duration - delay - margin);
      // Анимация текста стартует не сразу, а через delay секунд после запуска
      // аудио. Пока идёт задержка — текст полностью непроговорённый.
      this.voiceStartTime = now + delay * 1000;
      this.voiceActive = duration > 0;
      this.dialogueRevealedText.setText('');

      if (!this.voiceActive) {
        this.dialogueRevealedText.setText(text);
      }
    }

    /** Вызывается из update(): подсвечивает "проговорённую" часть текста. */
    updateVoiceReveal(time) {
      if (!this.voiceActive) return;

      // Пока идёт задержка перед стартом анимации — текст остаётся пустым.
      if (time < this.voiceStartTime) {
        this.dialogueRevealedText.setText('');
        return;
      }

      const elapsedSeconds = (time - this.voiceStartTime) / 1000;
      if (elapsedSeconds >= this.voiceRevealDuration) {
        this.dialogueRevealedText.setText(this.voiceFullText);
        this.stopVoice();
        return;
      }

      // Скорость дозаполнения текста считается от voiceRevealDuration
      // (длительность дорожки за вычетом задержки и погрешности), а не от
      // полной длительности — иначе анимация не успевала бы закончиться
      // к концу звука.
      const ratio = this.voiceRevealDuration > 0
        ? Phaser.Math.Clamp(elapsedSeconds / this.voiceRevealDuration, 0, 1)
        : 1;
      const revealCount = Math.floor(ratio * this.voiceFullText.length);
      // Режем предварительно перенесённый по строкам текст (voiceRevealText),
      // а не исходную строку — см. комментарий в startVoiceReveal().
      this.dialogueRevealedText.setText(this.voiceRevealText.slice(0, revealCount));
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
     * Молча останавливает текущую озвучку без завершения текста —
     * используется при переходе на другой экран, "Назад", открытии
     * паузы/истории, чтобы звук не продолжал играть фоном.
     */
    stopVoice() {
      if (this.voiceTrack) {
        this.voiceTrack.stop();
        this.voiceTrack = null;
      }
      this.voiceActive = false;
    }

    /**
     * Возобновляет озвучку и анимацию текущей реплики после того, как её
     * прервали открытием паузы или "Истории" (см. openPauseMenu()/
     * toggleHistory()). Веб-звук нельзя поставить на паузу и продолжить с
     * того же места без лишней сложности с отслеживанием смещения — поэтому
     * при возврате реплика проигрывается заново с начала, как и при повторном
     * заходе на экран вперёд. Если реплика к моменту прерывания уже была
     * озвучена целиком (voiceActive был false), ничего не перезапускаем.
     */
    resumeVoiceIfNeeded() {
      if (this.voiceInterruptedByOverlay && this._voiceConfigForCurrentScreen) {
        // Не запускаем startVoiceReveal() прямо здесь: это вызывается
        // синхронно из обработчика клика (PauseScene.resumeGame() /
        // toggleHistory()), а this.time.now в этот момент — особенно после
        // паузы — ещё не обновилось до реального текущего времени (Phaser
        // не вызывает update()/preUpdate() для сцены, пока она на паузе,
        // поэтому this.time.now всё это время "застывший"). Если запустить
        // отсюда, voiceStartTime посчитается от устаревшего времени, а на
        // следующем кадре this.time.now скачком "догонит" реальное — из-за
        // этого задержка перед текстом и сама анимация фактически
        // проскакивали вперёд вместо честного перезапуска с нуля. Поэтому
        // просто помечаем "нужен перезапуск", а сам запуск — в update(),
        // на первом кадре после возобновления, когда time уже актуально.
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
      // Открытие "Истории" останавливает текущую озвучку — иначе она
      // продолжила бы играть поверх текста реплики, ушедшего под окно.
      // Запоминаем, была ли озвучка прервана именно этим открытием, чтобы
      // при закрытии окна корректно возобновить её (resumeVoiceIfNeeded).
      if (!this.historyVisible) this.voiceInterruptedByOverlay = this.voiceActive;
      if (!this.historyVisible) this.stopVoice();

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
        // Закрыли "Историю" — если она прервала озвучку, проигрываем реплику
        // заново с начала (см. комментарий в resumeVoiceIfNeeded()).
        this.resumeVoiceIfNeeded();
      }
    }

    openPauseMenu() {
      // Пока сцена на паузе, её update() (а значит и анимация текста) не
      // выполняется, но Web Audio продолжил бы играть в фоне — останавливаем.
      // Запоминаем, была ли озвучка активна именно в момент открытия паузы,
      // чтобы при возврате из паузы (см. PauseScene.resumeGame()) корректно
      // решить, нужно ли проигрывать реплику заново.
      this.voiceInterruptedByOverlay = this.voiceActive;
      this.stopVoice();
      this.scene.pause();
      this.scene.launch('PauseScene', { returnSceneKey: 'StoryScene' });
    }
  }

  window.VN.scenes.StoryScene = StoryScene;
})();