(function () {
  const WIDTH = 1920;
  const HEIGHT = 1080;
  const TEXT_COLOR = '#1B1A19';
  const TITLE_COLOR = '#6E6056';
  const EASTER_EGGS = new Map([
    ['Александра Абашина', { cardTitle: 'Геймдизайн и UX/UI', toggleNegative: true }],
    ['Евгений Скуковский', { href: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }],
    ['Полина Новикова', { href: 'https://t.me/mporoandthoughts' }],
    ['Марк Абеленцев', {
      image: { key: 'authorsMarkPhoto', url: 'images/authors/mark-center.webp' },
      scatteredImages: Array.from({ length: 7 }, (_, index) => ({
        key: 'authorsMarkArt' + (index + 1),
        url: 'images/authors/mark-' + (index + 1) + '.webp',
      })),
    }],
    ['Егор Игнатов', {
      image: { key: 'authorsEgorPhoto', url: 'images/authors/egor.webp' },
    }],
    ['Варвара Зайцева', {
      href: 'https://itch.io/profile/sulgeyr',
      image: { key: 'authorsVarvaraPhoto', url: 'images/authors/varvara.webp' },
    }],
    ['Екатерина Воронцова', {
      href: 'https://music.yandex.ru/artist/24975276?utm_source=web&utm_medium=copy_link',
      music: 'music/OTHERWORLDLY_SHADE.mp3',
    }],
  ]);

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
          ...[...EASTER_EGGS.values()].flatMap((egg) => [
            ...(egg.image ? [egg.image] : []), ...(egg.scatteredImages ?? []),
          ]),
        ],
        audio: [...EASTER_EGGS.values()].flatMap((egg) => egg.music ? [egg.music] : []),
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
      this.installEasterEggs();
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
      this.layoutEasterEggPhoto(visible, ui);
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
        const egg = EASTER_EGGS.get(name);
        if (egg && (!egg.cardTitle || egg.cardTitle === card.title)) {
          let pressedPointer = null;
          nameText.setInteractive();
          nameText.on('pointerdown', (pointer) => { pressedPointer = pointer.id; });
          nameText.on('pointerout', () => { pressedPointer = null; });
          nameText.on('pointerup', (pointer) => {
            const clicked = pressedPointer === pointer.id;
            pressedPointer = null;
            if (!clicked || this.dragMoved) return;
            const clicks = (this.easterEggClicks.get(name) || 0) + 1;
            this.easterEggClicks.set(name, clicks % 5);
            if (clicks === 5) {
              if (egg.toggleNegative) window.VN.systems.NegativeFilter.toggle();
              if (egg.music) this.playEasterEggMusic(egg.music);
              if (egg.image) this.showEasterEggPhoto(egg.image.key, egg.scatteredImages);
              // Открываем в обработчике клика, не дожидаясь загрузки музыки.
              if (egg.href) window.open(egg.href, '_blank', 'noopener');
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

    installEasterEggs() {
      this.easterEggClicks = new Map();
      this.easterEggPlayback = null;
      this.easterEggPhoto = null;
      const cleanup = () => {
        this.stopEasterEggMusic();
        this.hideEasterEggPhoto();
        this.events.off('shutdown', cleanup);
        this.events.off('destroy', cleanup);
      };
      this.events.once('shutdown', cleanup);
      this.events.once('destroy', cleanup);
      // Готовим трек в фоне: открытие авторов не ждёт большого аудиофайла.
      window.VN.systems.SceneAssets.prefetch(this, 'AuthorsScene');
    }

    showEasterEggPhoto(key, scatteredImages = []) {
      if (!this.textures.exists(key)) return;
      this.hideEasterEggPhoto();
      this.dragStartY = null;
      const backdrop = this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x000000, 0.7)
        .setOrigin(0).setDepth(100).setInteractive();
      // Случайные места по бокам оставляют центральный QR-код открытым.
      // Координаты выбираем один раз: при изменении окна коллаж не перемешивается.
      const slots = scatteredImages.length ? Phaser.Utils.Array.Shuffle(
        [0.16, 0.84].flatMap((x) => [0.125, 0.375, 0.625, 0.875].map((y) => ({ x, y }))),
      ) : [];
      const scattered = scatteredImages.filter((image) => this.textures.exists(image.key))
        .map((image, index) => ({
          photo: this.add.image(0, 0, image.key).setDepth(101).setAngle(Math.random() * 24 - 12),
          x: slots[index].x + (Math.random() - 0.5) * 0.06,
          y: slots[index].y + (Math.random() - 0.5) * 0.04,
          size: 0.84 + Math.random() * 0.2,
        }));
      const photo = this.add.image(0, 0, key).setDepth(102);
      this.easterEggPhoto = { backdrop, photo, scattered };
      this.layoutEasterEggPhoto(this.layout.getVisibleRect(this), this.layout.getUiRect(this));
      // Подложка ловит следующий клик и не пропускает его к кнопкам под фото.
      backdrop.on('pointerup', (pointer, x, y, event) => {
        event.stopPropagation();
        this.hideEasterEggPhoto();
      });
    }

    layoutEasterEggPhoto(visible, ui) {
      if (!this.easterEggPhoto) return;
      const { backdrop, photo, scattered } = this.easterEggPhoto;
      backdrop.setPosition(visible.x, visible.y).setSize(visible.width, visible.height);
      const scale = Math.min(ui.width * (scattered.length ? 0.34 : 0.9) / photo.width,
        ui.height * (scattered.length ? 0.78 : 0.9) / photo.height);
      photo.setPosition(ui.centerX, ui.centerY).setScale(scale);
      const padding = Math.min(ui.width, ui.height) * 0.02;
      for (const item of scattered) {
        const image = item.photo;
        image.setScale(Math.min(ui.width * 0.29 / image.width, ui.height * 0.27 / image.height) * item.size);
        const cos = Math.abs(Math.cos(image.rotation));
        const sin = Math.abs(Math.sin(image.rotation));
        const halfWidth = (image.displayWidth * cos + image.displayHeight * sin) / 2;
        const halfHeight = (image.displayWidth * sin + image.displayHeight * cos) / 2;
        image.setPosition(
          Phaser.Math.Clamp(ui.x + item.x * ui.width, ui.x + padding + halfWidth, ui.right - padding - halfWidth),
          Phaser.Math.Clamp(ui.y + item.y * ui.height, ui.y + padding + halfHeight, ui.bottom - padding - halfHeight),
        );
      }
    }

    hideEasterEggPhoto() {
      if (!this.easterEggPhoto) return;
      this.easterEggPhoto.backdrop.destroy();
      this.easterEggPhoto.photo.destroy();
      this.easterEggPhoto.scattered.forEach(({ photo }) => photo.destroy());
      this.easterEggPhoto = null;
    }

    async playEasterEggMusic(path) {
      // Повторные пять кликов не накладывают трек на самого себя.
      if (this.easterEggPlayback) return;
      const playback = {};
      this.easterEggPlayback = playback;
      try {
        const { AudioManager, SceneAssets, MusicController } = window.VN.systems;
        const url = AudioManager.getUrl(path);
        if (!this.cache.audio.exists(url)) {
          await SceneAssets.queueFor(this).ensure([{ type: 'audio', key: url, url }], { priority: 1 });
        }
        // Меню загружает музыку в фоне; его поздний запуск должен завершиться
        // до подмены, чтобы затем можно было вернуть именно музыку меню.
        await SceneAssets.prefetch(this, this.returnSceneKey);
        if (this.easterEggPlayback !== playback) return;
        const controller = MusicController.forScene(this);
        const previousMusic = controller.getCurrentMusic();
        const track = controller.transitionTo({ path, loop: false }, { type: 'fadein', duration: 0 });
        playback.restore = () => {
          if (this.easterEggPlayback !== playback) return;
          this.easterEggPlayback = null;
          track.source.removeEventListener('ended', playback.restore);
          const ownsMusic = controller.current === track || !controller.current;
          track.stop();
          // Другая сцена уже могла включить свою музыку при переходе.
          if (ownsMusic && !controller.destroyed) {
            controller.transitionTo(previousMusic, { type: 'fadein', duration: 0 });
          }
        };
        track.source.addEventListener('ended', playback.restore, { once: true });
      } catch (error) {
        if (this.easterEggPlayback === playback) this.easterEggPlayback = null;
        console.warn('[AuthorsScene]', error.message);
      }
    }

    stopEasterEggMusic() {
      this.easterEggPlayback?.restore?.();
      // Отменяем также запуск трека, который ещё загружается.
      this.easterEggPlayback = null;
    }

    // ---- прокрутка -------------------------------------------------------------

    installScrolling() {
      this.dragStartY = null;
      this.dragMoved = false;

      this.input.on('wheel', (pointer, objects, dx, dy) => {
        if (!this.easterEggPhoto) this.setScroll(this.scrollY + dy);
      });
      this.input.on('pointerdown', (pointer) => {
        if (this.easterEggPhoto) return;
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
        if (this.easterEggPhoto) {
          if (event.key === 'Escape') this.hideEasterEggPhoto();
          return;
        }
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
