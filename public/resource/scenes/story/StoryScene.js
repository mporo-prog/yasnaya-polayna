(function () {
  const WIDTH = 1920;
  const HEIGHT = 1080;
  const BAR_Y = HEIGHT * 0.75;

  /**
   * StoryScene — одна универсальная сцена на все сюжетные сцены игры.

   *   VN.data.storyLines           — реплики
   *   VN.data.storyHistoryTexts    — текст для окна "История"
   *   VN.data.storyBackgrounds     — пути к фонам
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

    create() {
      this.buildBackgroundLayer();
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
      });
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
      this.bgRect = this.add.rectangle(0, 0, WIDTH, BAR_Y, 0xd9d9d9).setOrigin(0, 0);
      this.bgLabel = this.add.text(WIDTH / 2, BAR_Y / 2, 'Фон', { fontSize: '40px', color: '#000000' }).setOrigin(0.5);
      this.debugLabel = this.add.text(WIDTH / 2, 40, '', { fontSize: '48px', color: '#000000' }).setOrigin(0.5);
    }

    setBackground(path) {
      if (this.textures.exists(path)) {
        this.bgImage.setTexture(path).setDisplaySize(WIDTH, BAR_Y).setVisible(true);
        this.bgRect.setVisible(false);
        this.bgLabel.setVisible(false);
      } else {
        this.bgImage.setVisible(false);
        this.bgRect.setVisible(true);
        this.bgLabel.setVisible(true).setText('Фон не найден:\n' + path);
      }
    }

    buildBottomBar() {
      this.add.rectangle(0, BAR_Y, WIDTH, HEIGHT - BAR_Y, 0x3f3f3f).setOrigin(0, 0);
      this.add.rectangle(WIDTH / 2, BAR_Y + 130, WIDTH * 0.55, 190, 0xd9d9d9).setOrigin(0.5, 0);
      // Имя героя, который сейчас говорит — над текстом реплики.
      this.speakerNameText = this.add
        .text(WIDTH / 2, BAR_Y + 145, '', {
          fontSize: '28px',
          fontStyle: 'bold',
          color: '#000000',
          align: 'center',
        })
        .setOrigin(0.5, 0);
      this.dialogueText = this.add
        .text(WIDTH / 2, BAR_Y + 185, '', {
          fontSize: '34px',
          color: '#000000',
          align: 'center',
          wordWrap: { width: WIDTH * 0.5 },
        })
        .setOrigin(0.5, 0);
    }

    buildNavButtons() {
      this.backBtn = this.makeButton(WIDTH * 0.16, BAR_Y + 220, 'Back', () => this.goBack());
      this.nextBtn = this.makeButton(WIDTH * 0.84, BAR_Y + 220, 'Next', () => this.goNext());
    }

    buildTopButtons() {
      // depth выше, чем у historyContainer (10) — чтобы кнопки оставались
      // видимыми и кликабельными поверх открытой вкладки "История"
      // (крестика для закрытия больше нет, закрывают тем же тумблером).
      const menuBtn = this.makeButton(WIDTH - 95, 45, 'кнопка\nменю', () => this.openPauseMenu(), 150, 80);
      menuBtn.bg.setDepth(20);
      menuBtn.text.setDepth(20);

      this.historyBtn = this.makeButton(WIDTH - 95, BAR_Y + 50, 'История', () => this.toggleHistory(), 150, 60);
      this.historyBtn.bg.setDepth(20);
      this.historyBtn.text.setDepth(20);
    }

    makeButton(x, y, label, onClick, w, h, fontSize) {
      w = w || 120; h = h || 40; fontSize = fontSize || '20px';
      const bg = this.add.rectangle(x, y, w, h, 0xd9d9d9).setInteractive({ useHandCursor: true });
      const text = this.add.text(x, y, label, { fontSize: fontSize, color: '#000000', align: 'center' }).setOrigin(0.5);
      bg.on('pointerup', onClick);
      return { bg: bg, text: text };
    }

    buildHistoryOverlay() {
      // Видимая область под текст истории — за её пределами текст обрезается
      // маской, доступ к остальному — прокруткой.
      const viewport = {
        x: WIDTH * 0.27,
        y: 170,
        width: WIDTH * 0.56,
        height: HEIGHT - 170 - 90,
      };
      this.historyViewport = viewport;
      this.historyScrollY = 0;
      this.historyMaxScroll = 0;
      this.historyDragStartY = null;
      this.historyDragStartScroll = 0;

      this.historyContainer = this.add.container(0, 0).setDepth(10).setVisible(false);
      const panelBg = this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x3f3f3f, 0.98).setOrigin(0, 0).setInteractive();
      const title = this.add.text(WIDTH / 2, 70, 'История', { fontSize: '56px', color: '#ffffff' }).setOrigin(0.5);

      // Сам текст — внутри отдельного контейнера, который двигается вверх/
      // вниз при прокрутке; видна только часть внутри viewport благодаря маске.
      this.historyText = this.add.text(0, 0, '', {
        fontSize: '30px',
        color: '#ffffff',
        wordWrap: { width: viewport.width },
        lineSpacing: 26,
      });
      this.historyContentContainer = this.add.container(viewport.x, viewport.y, [this.historyText]);

      const maskShape = this.make.graphics({ x: 0, y: 0 }, false);
      maskShape.fillStyle(0xffffff);
      maskShape.fillRect(viewport.x, viewport.y, viewport.width, viewport.height);
      this.historyContentContainer.setMask(maskShape.createGeometryMask());

      // Полоса прокрутки справа от текста, как на макете.
      const trackX = viewport.x + viewport.width + 30;
      this.historyScrollTrack = this.add.rectangle(trackX, viewport.y, 6, viewport.height, 0x2a2a2a, 0.8).setOrigin(0.5, 0);
      this.historyScrollThumb = this.add.rectangle(trackX, viewport.y, 10, viewport.height, 0xd9d9d9).setOrigin(0.5, 0);

      this.historyContainer.add([
        panelBg,
        title,
        this.historyContentContainer,
        this.historyScrollTrack,
        this.historyScrollThumb,
      ]);

      // Прокрутка колесом мыши.
      this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
        if (!this.historyVisible) return;
        this.setHistoryScroll(this.historyScrollY + deltaY);
      });

      // Прокрутка перетаскиванием (мышь/тач) прямо по области истории.
      panelBg.on('pointerdown', (pointer) => {
        if (!this.historyVisible) return;
        this.historyDragStartY = pointer.y;
        this.historyDragStartScroll = this.historyScrollY;
      });
      panelBg.on('pointermove', (pointer) => {
        if (!this.historyVisible || this.historyDragStartY === null || !pointer.isDown) return;
        const delta = this.historyDragStartY - pointer.y;
        this.setHistoryScroll(this.historyDragStartScroll + delta);
      });
      const stopHistoryDrag = () => { this.historyDragStartY = null; };
      panelBg.on('pointerup', stopHistoryDrag);
      panelBg.on('pointerupoutside', stopHistoryDrag);
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

    renderCurrentScreen() {
      const GameState = window.VN.systems.GameState;
      const entry = this.currentLines[this.screenIndex];
      const text = entry.text;
      const speakerName = entry.speaker || '';
      const backgroundPath = this.currentBackgrounds[this.screenIndex];
      const historyOverride = this.currentHistoryTexts[this.screenIndex];
      const historyText = historyOverride != null ? historyOverride : text;

      this.debugLabel.setText('Сюжетная сцена ' + (this.storySceneIndex + 1) + ', экран ' + (this.screenIndex + 1));
      this.setBackground(backgroundPath);
      this.speakerNameText.setText(speakerName || '');
      this.dialogueText.setText(text);

      GameState.goToScreen(this.storySceneIndex, this.screenIndex);
      GameState.addHistoryEntry(this.storySceneIndex, this.screenIndex, historyText, speakerName);

      const isFirstScreen = this.screenIndex === 0;
      this.backBtn.bg.setAlpha(isFirstScreen ? 0.4 : 1);
      if (isFirstScreen) this.backBtn.bg.disableInteractive();
      else this.backBtn.bg.setInteractive({ useHandCursor: true });
    }

    goNext() {
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
        this.renderCurrentScreen();
      }
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
      this.historyVisible = !this.historyVisible;
      this.historyContainer.setVisible(this.historyVisible);
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
      }
    }

    openPauseMenu() {
      this.scene.pause();
      this.scene.launch('PauseScene', { returnSceneKey: 'StoryScene' });
    }
  }

  window.VN.scenes.StoryScene = StoryScene;
})();
