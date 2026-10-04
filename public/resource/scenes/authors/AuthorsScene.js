(function () {
  const WIDTH = 1920;
  const HEIGHT = 1080;
  const TEXT_COLOR = '#1B1A19';
  const TITLE_COLOR = '#6E6056';

  /**
   * Размеры колонки — в пикселях мобильного макета «Авторы» (ширина 934).
   * На экране они умножаются на масштаб: на компьютере DESKTOP_SCALE,
   * на телефоне (Layout.isCompact) — COMPACT_SCALE, чтобы текст читался.
   */
  const DESKTOP_SCALE = 2;
  const COMPACT_SCALE = 2.8;
  const CARD = {
    width: 424,
    titleY: 45,
    titleSize: 28,
    firstRowY: 97,
    rowStep: 23.5,
    rowSize: 16,
    nameX: -171,
    orgX: 160,
    minHeight: 205,
    bottomPadding: 40,
    gap: 18,
    socialSize: 72,
    socialDx: 82,
  };
  // Сдвиг пальца/мыши, после которого нажатие считается прокруткой.
  const DRAG_THRESHOLD = 12;

  /**
   * Авторы — прокручиваемая колонка карточек по мобильному макету:
   * плашка «АВТОРЫ», надпись «Ясная Поляна», карточки команд. Данные —
   * startMenuData.credits. Кнопка «назад» остаётся на месте при прокрутке.
   */
  class AuthorsScene extends Phaser.Scene {
    constructor() {
      super('AuthorsScene');
    }

    getAssetManifest() {
      return {
        images: [
          { key: 'menuBackground', url: 'images/backgrounds/menu_screen.webp' },
          { key: 'settingsHeaderBg', url: 'images/icon_UI/result_message_panel.webp' },
          { key: 'authorsCardBg', url: 'images/icon_UI/text_bg.webp' },
          { key: 'settingsBackButton', url: 'images/icon_UI/back_button.webp' },
          { key: 'authorsMuseumLogo', url: 'images/icon_UI/YP_Logo.webp' },
          { key: 'authorsPartnerLogos', url: 'images/icon_UI/all_logos.webp' },
          { key: 'authorsVk', url: 'images/icon_UI/Group%2060.webp' },
          { key: 'authorsTelegram', url: 'images/icon_UI/Group%2062.webp' },
        ],
      };
    }

    init(data = {}) {
      this.returnSceneKey = data.returnSceneKey || 'MainMenuScene';
    }

    preload() {
      window.VN.systems.SceneAssets.preload(this, { visualsOnly: true });
    }

    create() {
      this.scene.bringToTop();
      this.layout = window.VN.systems.Layout;
      this.scrollY = 0;
      this.maxScroll = 0;
      this.easterEggClicks = 0;
      // Phaser переиспользует объект сцены при повторном запуске:
      // сбрасываем масштаб, чтобы колонка собралась заново.
      this.contentScale = null;

      this.layout.addBackground(this, 'menuBackground');
      // Затемнение — белые логотипы читаются и на светлом небе фона.
      this.layout.fill(this, this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x000000, 0.35).setOrigin(0));

      this.content = this.add.container(0, 0);

      this.backButton = this.add.image(0, 0, 'settingsBackButton')
        .setDepth(10)
        .setInteractive({ useHandCursor: true });
      this.backButton.on('pointerup', () => {
        window.VN?.systems.AudioManager?.click?.(this);
        this.goBack();
      });

      this.layout.onLayout(this, (visible, ui) => this.applyLayout(visible, ui));
      this.installScrolling();
    }

    applyLayout(visible, ui) {
      const compact = this.layout.isCompact(this);
      // Размер «назад» — общий для всех сцен (Layout.UI_BUTTONS).
      const backSize = this.layout.buttonSize(this, 'back');
      if (compact) {
        this.backButton.setPosition(ui.x + ui.width * 50 / 917, 197).setDisplaySize(backSize, backSize);
      } else {
        this.backButton.setPosition(ui.x + 152, ui.y + 112).setDisplaySize(backSize, backSize);
      }

      const scale = compact ? COMPACT_SCALE : DESKTOP_SCALE;
      if (scale !== this.contentScale) this.buildContent(scale);

      this.visibleRect = visible;
      this.content.x = ui.centerX;
      this.contentTop = ui.y;
      this.maxScroll = Math.max(0, this.contentHeight - ui.height);
      this.setScroll(this.scrollY);
    }

    /** Строит колонку заново в масштабе s (координаты — от центра колонки). */
    buildContent(s) {
      this.contentScale = s;
      this.content.removeAll(true);
      this.socialButtons = [];

      const add = (obj) => { this.content.add(obj); return obj; };
      const text = (x, y, value, style) => add(this.add.text(x * s, y * s, value, style));

      // Плашка «АВТОРЫ».
      add(this.add.image(0, 20 * s, 'settingsHeaderBg').setOrigin(0.5, 0).setDisplaySize(235 * s, 65 * s));
      text(0, 52.5, 'АВТОРЫ', {
        fontFamily: 'Philosopher', fontSize: 30 * s + 'px', color: TEXT_COLOR,
      }).setOrigin(0.5);

      // Логотип музея и ряд логотипов партнёров — ширина по макету,
      // высота по пропорциям картинки.
      const logo = (key, y, width) => {
        const source = this.textures.get(key).getSourceImage();
        const image = add(this.add.image(0, y * s, key).setOrigin(0.5, 0));
        image.setDisplaySize(width * s, width * s * source.height / source.width);
        return image.displayHeight / s;
      };
      let top = 130;
      top += logo('authorsMuseumLogo', top, 450) + 40;
      top += logo('authorsPartnerLogos', top, 552) + 40;
      window.VN.data.startMenuData.credits.forEach((card) => {
        top += this.buildCard(card, top, s) + CARD.gap;
      });
      this.contentHeight = (top + 40) * s;
    }

    /** Карточка команды; возвращает её высоту (в пикселях макета). */
    buildCard(card, top, s) {
      const rowStyle = { fontFamily: 'Ysabeau', fontSize: CARD.rowSize * s + 'px', color: TEXT_COLOR };
      const rows = [];
      let rowsBottom = CARD.firstRowY;
      card.people.forEach(([name, org], index) => {
        const y = CARD.firstRowY + index * CARD.rowStep;
        const nameText = this.add.text(CARD.nameX * s, (top + y) * s, name, rowStyle).setOrigin(0, 0.5);
        if (name === 'Евгений Скуковский') {
          let pressedPointer = null;
          nameText.setInteractive();
          nameText.on('pointerdown', (pointer) => { pressedPointer = pointer.id; });
          nameText.on('pointerout', () => { pressedPointer = null; });
          nameText.on('pointerup', (pointer) => {
            const clicked = pressedPointer === pointer.id;
            pressedPointer = null;
            if (!clicked || this.dragMoved) return;
            this.easterEggClicks += 1;
            if (this.easterEggClicks === 5) {
              this.easterEggClicks = 0;
              window.open('https://www.youtube.com/watch?v=dQw4w9WgXcQ', '_blank', 'noopener');
            }
          });
        }
        rows.push(nameText);
        const orgText = this.add.text(CARD.orgX * s, (top + y) * s, org, { ...rowStyle, align: 'right' })
          .setOrigin(1, 0.5);
        // Организация в две строки растёт вниз от строки с именем.
        const extraLines = org.split('\n').length - 1;
        if (extraLines) orgText.setOrigin(1, 0.5 / (extraLines + 1));
        rows.push(orgText);
        rowsBottom = y + extraLines * CARD.rowStep;
      });

      let height = rowsBottom + CARD.bottomPadding;
      const socials = card.socials || [];
      if (socials.length) height = rowsBottom + CARD.socialSize + 50;
      height = Math.max(CARD.minHeight, height);

      this.content.add(this.add.image(0, top * s, 'authorsCardBg')
        .setOrigin(0.5, 0)
        .setDisplaySize(CARD.width * s, height * s));
      this.content.add(this.add.text(0, (top + CARD.titleY) * s, card.title, {
        fontFamily: 'Philosopher', fontSize: CARD.titleSize * s + 'px', color: TITLE_COLOR,
      }).setOrigin(0.5));
      this.content.add(rows);

      socials.forEach((social, index) => {
        const dx = (index - (socials.length - 1) / 2) * CARD.socialDx * 2;
        const button = this.add.image(dx * s, (top + rowsBottom + 25 + CARD.socialSize / 2) * s, social.key)
          .setDisplaySize(CARD.socialSize * s, CARD.socialSize * s)
          .setInteractive({ useHandCursor: true });
        button.on('pointerup', () => {
          // Отпускание после прокрутки — не нажатие.
          if (this.dragMoved) return;
          window.VN?.systems.AudioManager?.click?.(this);
          window.open(social.href, '_blank', 'noopener');
        });
        this.content.add(button);
      });
      return height;
    }

    // ---- прокрутка -------------------------------------------------------------

    installScrolling() {
      this.dragStartY = null;
      this.dragMoved = false;

      this.input.on('wheel', (pointer, objects, dx, dy) => this.setScroll(this.scrollY + dy));
      this.input.on('pointerdown', (pointer) => {
        this.dragStartY = pointer.y;
        this.dragStartScroll = this.scrollY;
        this.dragMoved = false;
      });
      this.input.on('pointermove', (pointer) => {
        if (this.dragStartY === null || !pointer.isDown) return;
        const delta = this.dragStartY - pointer.y;
        if (Math.abs(delta) > DRAG_THRESHOLD) this.dragMoved = true;
        if (this.dragMoved) this.setScroll(this.dragStartScroll + delta);
      });
      const stop = () => { this.dragStartY = null; };
      this.input.on('pointerup', stop);
      this.input.on('pointerupoutside', stop);

      this.onKeyDown = (event) => {
        const step = { ArrowDown: 80, ArrowUp: -80, PageDown: 600, PageUp: -600 }[event.key];
        if (event.key === 'Escape') this.goBack();
        else if (step) this.setScroll(this.scrollY + step);
        else if (event.key === 'Home') this.setScroll(0);
        else if (event.key === 'End') this.setScroll(this.maxScroll);
      };
      this.input.keyboard.on('keydown', this.onKeyDown);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
        this.input.keyboard.off('keydown', this.onKeyDown);
      });
    }

    setScroll(value) {
      this.scrollY = Phaser.Math.Clamp(value, 0, this.maxScroll);
      this.content.y = this.contentTop - this.scrollY;
    }

    goBack() {
      this.scene.stop();
      this.scene.wake(this.returnSceneKey);
    }
  }

  window.VN.scenes.AuthorsScene = AuthorsScene;
})();
