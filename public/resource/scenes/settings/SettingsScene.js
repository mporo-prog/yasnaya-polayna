(function () {
  const ROWS = [
    { category: 'music', label: 'Громкость музыки' },
    { category: 'ui', label: 'Громкость звуков' },
    { category: 'voice', label: 'Громкость голоса' },
  ];
  const TEXT_COLOR = '#1B1A19';
  const BUTTON_TEXT_COLOR = '#6E6056';

  /**
   * Раскладка по макетам: DESKTOP — в пикселях макета 1920×1080,
   * компактная (телефон) — считается в compactLayout() от ширины экрана.
   * Слайдер: track — дорожка, thumb — ползунок; их y — от центра строки.
   */
  const DESKTOP = {
    back: { x: 152, y: 112, size: 96 },
    header: { x: 707, y: 47, width: 505, height: 143, fontSize: 64 },
    panel: { x: 313, y: 243, width: 1297, height: 577 },
    rows: [408, 535, 657],
    label: { x: 413, fontSize: 46, fontStyle: 'normal', wrap: 0 },
    track: { x: 937, width: 474, height: 11, dy: 10 },
    thumb: { width: 35, height: 50, dy: -8 },
    value: { right: 1540, fontSize: 44, dy: 0 },
    save: { x: 1255, y: 880, width: 342, height: 95, fontSize: 60 },
    status: { x: 313, y: 1000, fontSize: 30, wrap: 900 },
    dim: 0.35,
  };

  class SettingsScene extends Phaser.Scene {
    constructor(key = 'SettingsScene') {
      super(key);
    }

    getAssetManifest() {
      return {
        images: [
          { key: 'menuBackground', url: 'images/backgrounds/menu_screen.png' },
          { key: 'settingsHeaderBg', url: 'images/icon_UI/result_message_panel.png' },
          { key: 'settingsPanelBg', url: 'images/icon_UI/text_bg.png' },
          { key: 'settingsSliderBar', url: 'images/icon_UI/slider_bar.png' },
          { key: 'settingsSlider', url: 'images/icon_UI/slider.png' },
          // «Сохранить» — та же плашка, что у кнопок меню.
          { key: 'saveButtonBg', url: 'images/icon_UI/main_button.png' },
          { key: 'settingsBackButton', url: 'images/icon_UI/back_button.png' },
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
      this.audio = window.VN.systems.AudioManager;
      this.draft = this.audio.getSettings();
      this.selectedRow = 0;

      // Фон меню на весь экран, поверх — лёгкое затемнение (на компьютере).
      this.layout.addBackground(this, 'menuBackground');
      this.dim = this.add.rectangle(0, 0, 1920, 1080, 0x000000).setOrigin(0).setInteractive();
      this.layout.fill(this, this.dim);

      this.backButton = this.add.image(0, 0, 'settingsBackButton').setInteractive({ useHandCursor: true });
      this.backButton.on('pointerup', () => {
        this.audio.click?.(this);
        this.goBack();
      });

      this.headerBg = this.add.image(0, 0, 'settingsHeaderBg').setOrigin(0, 0);
      this.headerText = this.add.text(0, 0, this.settingsTitle || 'НАСТРОЙКИ', {
        fontFamily: 'Philosopher', fontSize: '64px', color: TEXT_COLOR,
      }).setOrigin(0.5);

      this.panelBg = this.add.image(0, 0, 'settingsPanelBg').setOrigin(0, 0);
      this.sliders = ROWS.map((row) => this.makeSlider(row));

      this.statusText = this.add.text(0, 0, '', {
        fontFamily: 'Ysabeau', fontSize: '30px', color: '#FFF1DE',
        stroke: '#3f2f22', strokeThickness: 6,
      });

      if (!this.autoSave) {
        this.saveButton = this.add.image(0, 0, 'saveButtonBg').setOrigin(0, 0).setInteractive({ useHandCursor: true });
        this.saveLabel = this.add.text(0, 0, 'Сохранить', {
          fontFamily: 'Philosopher', fontSize: '60px', color: BUTTON_TEXT_COLOR,
        }).setOrigin(0.5);
        this.saveButton.on('pointerup', () => {
          this.audio.click?.(this);
          this.save();
        });
      }

      this.layout.onLayout(this, (visible, ui) => {
        this.lastUi = ui;
        this.applyLayout(ui);
      });
      // Ширина подписей на телефоне измеряется по шрифту — пересчитываем
      // раскладку, когда веб-шрифты догрузятся.
      const fonts = globalThis.document?.fonts;
      const relayout = () => { if (this.lastUi) this.applyLayout(this.lastUi); };
      fonts?.addEventListener('loadingdone', relayout);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => fonts?.removeEventListener('loadingdone', relayout));

      this.onKeyDown = (event) => {
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        if (!['Escape', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        // Phaser может повторно обходить очередь до следующего кадра.
        // Помечаем обработанное событие, чтобы один ввод менял значение один раз.
        event.stopPropagation();
        if (event.key === 'Escape') {
          this.goBack();
          return;
        }
        if (event.key === 'Tab' || event.key === 'ArrowUp' || event.key === 'ArrowDown') {
          const direction = event.key === 'ArrowUp' || (event.key === 'Tab' && event.shiftKey) ? -1 : 1;
          this.selectRow((this.selectedRow + direction + ROWS.length) % ROWS.length);
        } else if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
          this.selectRow(this.selectedRow);
          const slider = this.sliders[this.selectedRow];
          const current = this.draft[slider.category];
          const value = event.key === 'Home' ? 0 : event.key === 'End' ? 100
            : current + (event.key === 'ArrowRight' ? 1 : -1);
          this.setValue(slider, value);
        }
      };
      this.input.keyboard.on('keydown', this.onKeyDown);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
        this.input.keyboard.off('keydown', this.onKeyDown);
      });
    }

    /**
     * Мобильный макет: x — доли ширины экрана, y — пиксели макета 1080.
     * Подписи — в одну строку, с одинаковым отступом от левой грани плашки;
     * подпись, дорожка и процент стоят на одной линии по центру строки,
     * строки равномерно распределены по высоте плашки.
     */
    compactLayout(ui) {
      const x = (px) => ui.x + ui.width * px / 917;
      const w = (px) => ui.width * px / 917;
      const panel = { x: x(110), y: 52, width: w(695), height: 800 };
      const labelX = panel.x + panel.width * 0.08;
      const valueRight = panel.x + panel.width * 0.93;
      const valueWidth = 150;
      const gap = 60;
      const minTrack = panel.width * 0.25;
      // Самая длинная подпись в одну строку; если не хватает места под
      // дорожку — шрифт подписей и процентов немного уменьшается.
      const widestLabel = (size) => Math.max(...this.sliders.map(({ label }) =>
        label.setFontSize(size).setFontStyle('600').setWordWrapWidth(null).width));
      let fontSize = 58;
      while (fontSize > 40 && labelX + widestLabel(fontSize) + gap * 2 + minTrack + valueWidth > valueRight) {
        fontSize -= 2;
      }
      const trackX = labelX + widestLabel(fontSize) + gap;
      const trackRight = valueRight - valueWidth - gap;
      return {
        back: { x: x(50), y: 197, size: 157 },
        header: null,
        panel,
        rows: [0.28, 0.5, 0.72].map((f) => panel.y + panel.height * f),
        label: { x: labelX, fontSize, fontStyle: '600', wrap: 0 },
        track: { x: trackX, width: trackRight - trackX, height: 16, dy: 0 },
        // Ползунок относительно дорожки — как в исходном макете (на 23 выше).
        thumb: { width: 52, height: 73, dy: -23 },
        value: { right: valueRight, fontSize, dy: 0 },
        save: { x: x(568), y: 891, width: w(232), height: 157, fontSize: 89 },
        status: { x: x(110), y: 900, fontSize: 48, wrap: w(440) },
        dim: 0,
      };
    }

    applyLayout(ui) {
      const compact = !this.forceDesktopLayout && this.layout.isCompact(this);
      const L = compact ? this.compactLayout(ui) : DESKTOP;
      // На компьютере кнопка «назад» — у левого верхнего угла экрана.
      const backX = compact ? L.back.x : ui.x + L.back.x;
      const backY = compact ? L.back.y : ui.y + L.back.y;
      this.rowLayout = L;

      this.dim.setAlpha(L.dim);
      // Размер «назад» — общий для всех сцен (Layout.UI_BUTTONS).
      const backSize = this.layout.buttonSize(this, 'back');
      this.backButton.setPosition(backX, backY).setDisplaySize(backSize, backSize);

      const header = L.header;
      this.headerBg.setVisible(Boolean(header));
      this.headerText.setVisible(Boolean(header));
      if (header) {
        this.headerBg.setPosition(header.x, header.y).setDisplaySize(header.width, header.height);
        this.headerText.setPosition(header.x + header.width / 2, header.y + header.height / 2).setFontSize(header.fontSize);
      }

      this.panelBg.setPosition(L.panel.x, L.panel.y).setDisplaySize(L.panel.width, L.panel.height);
      this.sliders.forEach((slider, index) => this.layoutSlider(slider, L, L.rows[index]));

      this.statusText
        .setPosition(L.status.x, L.status.y)
        .setFontSize(L.status.fontSize)
        .setWordWrapWidth(L.status.wrap);

      if (this.saveButton) {
        const s = L.save;
        this.saveButton.setPosition(s.x, s.y).setDisplaySize(s.width, s.height);
        this.saveLabel.setPosition(s.x + s.width / 2, s.y + s.height / 2).setFontSize(s.fontSize);
      }
    }

    makeSlider(row) {
      const label = this.add.text(0, 0, row.label, {
        fontFamily: 'Ysabeau', fontSize: '46px', color: TEXT_COLOR,
      }).setOrigin(0, 0.5);
      // Дорожка — вертикальная картинка, повёрнутая на 90°.
      const track = this.add.image(0, 0, 'settingsSliderBar').setAngle(-90);
      const thumb = this.add.image(0, 0, 'settingsSlider');
      const valueText = this.add.text(0, 0, '', {
        fontFamily: 'Ysabeau', fontSize: '44px', color: TEXT_COLOR,
      }).setOrigin(1, 0.5);
      // Широкая зона для мыши и касания; drag продолжает работать за краями дорожки.
      const hitArea = this.add.zone(0, 0, 1, 1).setInteractive({ useHandCursor: true });
      this.input.setDraggable(hitArea);

      const slider = { ...row, label, track, thumb, valueText, hitArea, trackX: 0, trackWidth: 1 };
      const update = (pointer) => {
        this.selectRow(ROWS.findIndex((item) => item.category === row.category));
        // worldX, а не x: камера сдвинута на поле слева, экранная координата
        // больше не совпадает с координатой макета.
        this.setValue(slider, (pointer.worldX - slider.trackX) / slider.trackWidth * 100);
      };
      hitArea.on('pointerdown', update);
      hitArea.on('drag', update);
      return slider;
    }

    layoutSlider(slider, L, rowY) {
      slider.label
        .setPosition(L.label.x, rowY)
        .setFontSize(L.label.fontSize)
        .setFontStyle(L.label.fontStyle)
        .setWordWrapWidth(L.label.wrap || null);
      slider.trackX = L.track.x;
      slider.trackWidth = L.track.width;
      slider.trackY = rowY + L.track.dy;
      slider.thumbY = rowY + L.thumb.dy;
      // Повёрнута на 90°: ширина картинки — толщина дорожки, высота — длина.
      slider.track
        .setPosition(L.track.x + L.track.width / 2, slider.trackY)
        .setDisplaySize(L.track.height, L.track.width);
      slider.thumb.setDisplaySize(L.thumb.width, L.thumb.height);
      slider.valueText
        .setPosition(L.value.right, rowY + L.value.dy)
        .setFontSize(L.value.fontSize)
        .setFontStyle(L.label.fontStyle);
      const hitHeight = Math.max(80, L.thumb.height + 30);
      slider.hitArea
        .setPosition(L.track.x + L.track.width / 2, (slider.trackY + slider.thumbY) / 2)
        .setSize(L.track.width + L.thumb.width + 20, hitHeight);
      slider.hitArea.input.hitArea.setSize(slider.hitArea.width, slider.hitArea.height);
      this.renderValue(slider);
    }

    selectRow(index) {
      this.selectedRow = index;
      this.sliders.forEach((slider, i) => {
        if (i === index) slider.thumb.setTint(0x3f2f22);
        else slider.thumb.clearTint();
      });
    }

    setValue(slider, value) {
      const next = Math.round(Phaser.Math.Clamp(value, 0, 100));
      if (this.draft[slider.category] === next) return;
      this.draft[slider.category] = next;
      this.renderValue(slider);
      if (this.autoSave) {
        this.save();
      } else {
        // Громкость меняется только после сохранения — подсказываем это.
        this.statusText.setText('Чтобы применить изменения, нажмите «Сохранить»');
      }
    }

    renderValue(slider) {
      const value = this.draft[slider.category];
      // Ползунок не выходит за концы дорожки.
      const half = slider.thumb.displayWidth / 2;
      slider.thumb.setPosition(slider.trackX + half + (slider.trackWidth - half * 2) * value / 100, slider.thumbY);
      slider.valueText.setText(value + '%');
    }

    save() {
      const persisted = this.audio.saveSettings(this.draft);
      this.statusText.setText(persisted ? 'Настройки сохранены' : 'Настройки применены. Браузер не разрешил сохранить их после закрытия игры');
    }

    goBack() {
      this.scene.stop();
      this.scene.wake(this.returnSceneKey);
    }
  }

  window.VN.scenes.SettingsScene = SettingsScene;
})();
