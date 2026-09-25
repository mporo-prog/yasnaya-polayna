const TRACKS = [
  { label: 'test_music', path: 'music/test_music.mp3' },
  { label: 'ui_sound_test', path: 'ui/ui_sound_test.mp3' },
  { label: 'test_voice', path: 'voice_and_sound/test_voice.mp3' },
];

// Подключается вместе с режимом разработчика и использует обычные настройки игры.
export class SoundTestScene extends window.VN.scenes.SettingsScene {
  constructor(onBack) {
    super('SoundTestScene');
    this.settingsTitle = 'САУНДТЕСТ';
    this.autoSave = true;
    this.onBack = onBack;
  }

  preload() {
    this.scene.bringToTop();
    this.cameras.main.setBackgroundColor('#ffffff');
    this.loadingText = this.add.text(960, 540, 'Загрузка тестовых звуков…', {
      fontSize: '38px', color: '#000000',
    }).setOrigin(0.5);
    this.trackKeys = TRACKS.map((track) => window.VN.systems.AudioManager.load(this, track.path));
  }

  create() {
    this.loadingText.destroy();
    super.create();
    this.testSounds = [];
    this.add.text(55, 745, 'Громкость сохраняется автоматически.\nПовторное нажатие на кнопку останавливает звук.', {
      fontSize: '28px', color: '#333333', lineSpacing: 8,
    });

    TRACKS.forEach((track, index) => this.createTrackButton(track, index));
    this.stopTestSounds = () => this.testSounds.forEach((sound) => sound.stop());
    this.events.on('pause', this.stopTestSounds);
    this.events.once('shutdown', () => {
      this.events.off('pause', this.stopTestSounds);
      this.testSounds.forEach((sound) => sound.destroy());
      this.testSounds = [];
    });
  }

  createTrackButton(track, index) {
    const x = 1485;
    const y = 365 + index * 120;
    const button = this.add.rectangle(x, y, 620, 82, 0xd9d9d9);
    const label = this.add.text(x, y, '▶ ' + track.label, {
      fontSize: '32px', color: '#000000',
    }).setOrigin(0.5);

    if (!this.cache.audio.exists(this.trackKeys[index])) {
      label.setText(track.label + ': файл не загружен').setFontSize(26);
      button.setAlpha(0.5);
      return;
    }

    const sound = this.audio.add(this, track.path);
    this.testSounds.push(sound);
    const showStopped = () => {
      label.setText('▶ ' + track.label);
      button.setFillStyle(0xd9d9d9);
    };
    sound.on('play', () => {
      label.setText('■ ' + track.label);
      button.setFillStyle(0xb9d9c8);
    });
    sound.on('stop', showStopped);
    sound.on('complete', showStopped);
    button.setInteractive({ useHandCursor: true });
    button.on('pointerup', () => {
      if (sound.isPlaying || sound.isPaused) sound.stop();
      else if (!sound.play()) this.statusText.setText('Не удалось запустить звук. Попробуйте нажать ещё раз.');
    });
  }

  goBack() {
    this.stopTestSounds();
    this.onBack();
  }
}
