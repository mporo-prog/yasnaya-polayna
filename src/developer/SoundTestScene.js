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
    // Кнопки дорожек рассчитаны на раскладку компьютера.
    this.forceDesktopLayout = true;
    this.onBack = onBack;
  }

  preload() {
    this.scene.bringToTop();
    this.cameras.main.setBackgroundColor('#ffffff');
    this.loadingText = this.add.text(960, 540, 'Загрузка тестовых звуков…', {
      fontSize: '38px', color: '#000000',
    }).setOrigin(0.5);
    this.trackKeys = TRACKS.map((track) => window.VN.systems.AudioManager.load(this, track.path));
    // Картинки экрана настроек (фон, плашки, слайдеры).
    window.VN.systems.SceneAssets.preload(this, { visualsOnly: true });
  }

  create() {
    // Саундтест начинает с тишины и не смешивает записи с музыкой сюжета.
    if (this.sound.context) window.VN.systems.MusicController.forScene(this).stop();
    this.loadingText.destroy();
    super.create();
    this.testSounds = [];
    this.add.text(313, 835, 'Громкость сохраняется автоматически\nПовторное нажатие на кнопку останавливает звук', {
      fontSize: '28px', color: '#FFF1DE', lineSpacing: 8, stroke: '#3f2f22', strokeThickness: 6,
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
    // Справа от плашки настроек, напротив строк слайдеров.
    const x = 1765;
    const y = this.rowLayout.rows[index];
    const button = this.add.rectangle(x, y, 290, 82, 0xd9d9d9);
    const label = this.add.text(x, y, '▶ ' + track.label, {
      fontSize: '24px', color: '#000000',
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
      else if (!sound.play()) this.statusText.setText('Не удалось запустить звук. Попробуй нажать ещё раз');
    });
  }

  goBack() {
    this.stopTestSounds();
    this.onBack();
  }
}
