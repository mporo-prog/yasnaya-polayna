(function () {
  const WIDTH = 1920;
  const HEIGHT = 1080;
  const BAR_Y = HEIGHT * 0.75;

  /**
   * StoryScene — одна универсальная сцена на все сюжетные сцены игры.
   * Сама она не хранит никакого контента — на каждом шаге берёт нужный
   * текст/фон/ссылку на мини-игру из общего namespace:
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
      this.dialogueText = this.add
        .text(WIDTH / 2, BAR_Y + 150, '', {
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
      this.makeButton(WIDTH - 95, 45, 'кнопка\nменю', () => this.openPauseMenu(), 150, 80);
      this.historyBtn = this.makeButton(WIDTH - 95, BAR_Y + 50, 'История', () => this.toggleHistory(), 150, 60);
    }

    makeButton(x, y, label, onClick, w, h, fontSize) {
      w = w || 120; h = h || 40; fontSize = fontSize || '20px';
      const bg = this.add.rectangle(x, y, w, h, 0xd9d9d9).setInteractive({ useHandCursor: true });
      const text = this.add.text(x, y, label, { fontSize: fontSize, color: '#000000', align: 'center' }).setOrigin(0.5);
      bg.on('pointerup', onClick);
      return { bg: bg, text: text };
    }

    buildHistoryOverlay() {
      this.historyContainer = this.add.container(0, 0).setDepth(10).setVisible(false);
      const panelBg = this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x3f3f3f, 0.98).setOrigin(0, 0).setInteractive();
      const title = this.add.text(WIDTH / 2, 70, 'История', { fontSize: '56px', color: '#ffffff' }).setOrigin(0.5);
      this.historyText = this.add.text(WIDTH * 0.32, 170, '', {
        fontSize: '30px',
        color: '#ffffff',
        wordWrap: { width: WIDTH * 0.55 },
        lineSpacing: 26,
      });
      const closeBtn = this.makeButton(WIDTH - 70, 60, '✕', () => this.toggleHistory(), 60, 60, '36px');
      this.historyContainer.add([panelBg, title, this.historyText, closeBtn.bg, closeBtn.text]);
    }

    // ---- логика переключения экранов -----------------------------------------

    renderCurrentScreen() {
      const GameState = window.VN.systems.GameState;
      const text = this.currentLines[this.screenIndex];
      const backgroundPath = this.currentBackgrounds[this.screenIndex];
      const historyOverride = this.currentHistoryTexts[this.screenIndex];
      const historyText = historyOverride != null ? historyOverride : text;

      this.debugLabel.setText('Сюжетная сцена ' + (this.storySceneIndex + 1) + ', экран ' + (this.screenIndex + 1));
      this.setBackground(backgroundPath);
      this.dialogueText.setText(text);

      GameState.goToScreen(this.storySceneIndex, this.screenIndex);
      GameState.addHistoryEntry(this.storySceneIndex, this.screenIndex, historyText);

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
        const entries = window.VN.systems.GameState.getHistoryForScene(this.storySceneIndex);
        this.historyText.setText(entries.map(function (e) { return e.text; }).join('\n\n'));
      }
    }

    openPauseMenu() {
      this.scene.pause();
      this.scene.launch('PauseScene', { returnSceneKey: 'StoryScene' });
    }
  }

  window.VN.scenes.StoryScene = StoryScene;
})();
