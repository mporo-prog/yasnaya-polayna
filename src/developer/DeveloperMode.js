/** Управляет только жизненным циклом экрана; игровые сцены о нём не знают. */
export class DeveloperMode {
  constructor(game, screen, entries, beforeLaunch, keyboardTarget = window) {
    this.game = game;
    this.screen = screen;
    this.entries = entries;
    this.beforeLaunch = beforeLaunch;
    this.keyboardTarget = keyboardTarget;
    this.opened = false;
    this.destroyed = false;
    this.pausedScenes = new Set();

    this.onKeyDown = (event) => {
      // code работает и в русской раскладке (Ctrl+В).
      const toggle = event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey
        && (event.code === 'KeyD' || event.key?.toLowerCase() === 'd');
      const close = this.opened && event.key === 'Escape';

      if (toggle || close) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (event.repeat) return;
        if (this.opened) this.close();
        else this.open();
      } else if (this.opened) {
        // Не передаём клавиши из модального экрана в Phaser.
        event.stopPropagation();
      }
    };
    this.onStep = () => {
      // Загрузка ресурсов не прерывается. Сцены, созданные за это время,
      // тоже будут поставлены на паузу, пока экран открыт.
      if (this.opened) this.pauseActiveScenes();
    };
    this.onDestroy = () => this.destroy();

    keyboardTarget.addEventListener('keydown', this.onKeyDown, { capture: true });
    game.events.on('prestep', this.onStep);
    game.events.once('destroy', this.onDestroy);
  }

  open() {
    if (this.opened || this.destroyed) return;
    this.opened = true;
    this.pauseActiveScenes();
    this.screen.show();
  }

  pauseActiveScenes() {
    for (const scene of this.game.scene.getScenes(true)) {
      scene.input?.keyboard?.resetKeys();
      scene.sys.pause();
      this.pausedScenes.add(scene);
    }
  }

  close() {
    if (!this.opened) return;
    this.opened = false;
    this.screen.hide();
    for (const scene of this.pausedScenes) {
      if (scene.sys.isPaused()) scene.sys.resume();
    }
    this.pausedScenes.clear();
  }

  launch(entry) {
    if (!this.opened || !this.entries.includes(entry)) return;
    const target = this.game.scene.getScene(entry.key);
    if (!target) return;

    this.beforeLaunch(entry);
    // Останавливаем также сцены под меню паузы и загружающиеся сцены.
    // ScenePlugin выполняет переходы в очереди, на границе кадра.
    for (const scene of this.game.scene.getScenes(false)) {
      if (scene.sys.isActive() || scene.sys.isPaused() || scene.sys.isSleeping()
        || scene.sys.load?.isLoading()) {
        scene.scene.stop();
      }
    }
    this.pausedScenes.clear();
    this.opened = false;
    this.screen.hide();
    target.scene.start(entry.key, { ...entry.data });
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.close();
    this.keyboardTarget.removeEventListener('keydown', this.onKeyDown, { capture: true });
    this.game.events.off('prestep', this.onStep);
    this.game.events.off('destroy', this.onDestroy);
    this.screen.destroy();
  }
}
