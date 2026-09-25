(function () {
  const ROWS = [
    { category: 'music', label: 'ГРОМКОСТЬ МУЗЫКИ' },
    { category: 'ui', label: 'ГРОМКОСТЬ ЗВУКОВ' },
    { category: 'voice', label: 'ГРОМКОСТЬ ГОЛОСА' },
  ];
  const TRACK_X = 675;
  const TRACK_WIDTH = 340;

  class SettingsScene extends Phaser.Scene {
    constructor(key = 'SettingsScene') {
      super(key);
    }

    init(data = {}) {
      this.returnSceneKey = data.returnSceneKey || 'MainMenuScene';
    }

    create() {
      this.scene.bringToTop();
      this.audio = window.VN.systems.AudioManager;
      this.draft = this.audio.getSettings();
      this.selectedRow = 0;
      this.add.rectangle(0, 0, 1920, 1080, 0xffffff).setOrigin(0);
      this.add.rectangle(55, 60, 780, 122, 0xd9d9d9).setOrigin(0);
      this.add.text(80, 121, this.settingsTitle || 'НАСТРОЙКИ', { fontSize: '40px', color: '#000000' }).setOrigin(0, 0.5);
      this.makeButton(1055, 120, 210, 'НАЗАД', () => this.goBack());

      this.sliders = ROWS.map((row, index) => this.makeSlider(row, 365 + index * 120));
      this.statusText = this.add.text(55, 825, '', {
        fontSize: '28px', color: '#333333', wordWrap: { width: 950 },
      });
      if (!this.autoSave) this.makeButton(1205, 865, 280, 'СОХРАНИТЬ', () => this.save());

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

    makeButton(x, y, width, label, callback) {
      const button = this.add.rectangle(x, y, width, 82, 0xd9d9d9).setInteractive({ useHandCursor: true });
      this.add.text(x, y, label, { fontSize: '38px', color: '#000000' }).setOrigin(0.5);
      button.on('pointerover', () => button.setFillStyle(0xc9c9c9));
      button.on('pointerout', () => button.setFillStyle(0xd9d9d9));
      button.on('pointerup', callback);
    }

    makeSlider(row, y) {
      this.add.text(55, y, row.label, { fontSize: '38px', color: '#000000' }).setOrigin(0, 0.5);
      this.add.rectangle(TRACK_X, y, TRACK_WIDTH, 16, 0xd9d9d9).setOrigin(0, 0.5);
      const fill = this.add.rectangle(TRACK_X, y, 1, 16, 0x777777).setOrigin(0, 0.5);
      const thumb = this.add.rectangle(TRACK_X, y, 42, 48, 0xd9d9d9);
      const valueText = this.add.text(TRACK_X + TRACK_WIDTH + 50, y, '', {
        fontSize: '38px', color: '#000000',
      }).setOrigin(0, 0.5);
      const slider = { ...row, fill, thumb, valueText };
      this.renderValue(slider);

      // Широкая зона для мыши и касания; drag продолжает работать за краями дорожки.
      const hitArea = this.add.zone(TRACK_X + TRACK_WIDTH / 2, y, TRACK_WIDTH + 44, 80).setInteractive({ useHandCursor: true });
      this.input.setDraggable(hitArea);
      const update = (pointer) => {
        this.selectRow(ROWS.findIndex((item) => item.category === row.category));
        this.setValue(slider, (pointer.x - TRACK_X) / TRACK_WIDTH * 100);
      };
      hitArea.on('pointerdown', update);
      hitArea.on('drag', update);
      return slider;
    }

    selectRow(index) {
      this.selectedRow = index;
      this.sliders.forEach((slider, i) => slider.thumb.setStrokeStyle(i === index ? 2 : 0, 0x555555));
    }

    setValue(slider, value) {
      const next = Math.round(Phaser.Math.Clamp(value, 0, 100));
      if (this.draft[slider.category] === next) return;
      this.draft[slider.category] = next;
      this.renderValue(slider);
      this.statusText.setText('');
      if (this.autoSave) this.save();
    }

    renderValue(slider) {
      const value = this.draft[slider.category];
      slider.fill.width = TRACK_WIDTH * value / 100;
      slider.thumb.x = TRACK_X + TRACK_WIDTH * value / 100;
      slider.valueText.setText(value + '%');
    }

    save() {
      const persisted = this.audio.saveSettings(this.draft);
      this.statusText.setText(persisted ? 'Настройки сохранены' : 'Настройки применены. Браузер не разрешил сохранить их после закрытия игры.');
    }

    goBack() {
      this.scene.stop();
      this.scene.wake(this.returnSceneKey);
    }
  }

  window.VN.scenes.SettingsScene = SettingsScene;
})();
