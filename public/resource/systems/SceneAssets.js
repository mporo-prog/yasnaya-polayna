/** Состав ресурсов и подготовка ровно одного следующего шага маршрута. */
(function () {
  const image = (key, url = key) => ({ type: 'image', key, url });
  const audio = (path) => {
    const url = window.VN.systems.AudioManager.getUrl(path);
    return { type: 'audio', key: url, url };
  };

  // Файл-барьер сохраняет обычный контракт Phaser: preload -> create.
  // Сам он ничего не скачивает, а ожидает общую очередь и декодирование.
  class AssetBarrier extends Phaser.Loader.File {
    constructor(scene, queue, assets, onProgress) {
      super(scene.load, { type: 'scene-assets', key: 'scene-assets', url: '' });
      this.owner = scene;
      this.queue = queue;
      this.assets = assets;
      this.cancelled = false;
      this.detach = () => {
        scene.events.off('shutdown', this.onShutdown);
        scene.events.off('destroy', this.onShutdown);
      };
      this.onShutdown = () => { this.cancelled = true; this.detach(); };
      scene.events.once('shutdown', this.onShutdown);
      scene.events.once('destroy', this.onShutdown);
      this.showProgress = onProgress;
      if (!this.showProgress) {
        const { width, height } = scene.scale;
        this.panel = scene.add.rectangle(0, 0, width, height, 0xe8dcc0).setOrigin(0);
        this.label = scene.add.text(width / 2, height / 2, 'Загрузка…', {
          fontFamily: 'sans-serif', fontSize: '32px', color: '#3f2f22',
        }).setOrigin(0.5);
        // В EXPAND холст шире/выше макета; фон должен закрывать всю видимую область.
        const layout = window.VN.systems.Layout;
        layout?.fill(scene, this.panel);
        layout?.pin(scene, this.label, { centerX: 0, centerY: 0 });
        this.showProgress = (progress) => this.label.setText('Загрузка… ' + Math.round(progress * 100) + '%');
      }
    }

    load() {
      this.state = Phaser.Loader.FILE_LOADING;
      this.queue.ensure(this.assets, {
        priority: 1,
        onProgress: (progress) => {
          if (!this.cancelled) this.showProgress(progress);
        },
      }).then(() => {
        if (this.cancelled || !this.loader) return;
        this.panel?.destroy();
        this.label?.destroy();
        this.detach();
        this.loader.nextFile(this, true);
      });
    }

    destroy() {
      this.onShutdown();
      super.destroy();
    }
  }

  const SceneAssets = {
    assetsFor(game, key, data = {}, { visualsOnly = false } = {}) {
      const vn = window.VN;
      const target = game.scene.getScene(key);
      const declared = target?.getAssetManifest?.() ?? {};
      const assets = (declared.images ?? []).map(({ key, url }) => image(key, url));
      if (key === 'MainMenuScene') {
        assets.push(image('menuBackground', 'images/backgrounds/menu_screen.png'));
      } else if (key === 'StoryScene') {
        const index = data.storySceneIndex ?? vn.systems.GameState.state.storySceneIndex;
        for (const path of vn.data.storyBackgrounds[index] ?? []) assets.push(image(path));
        for (const entry of vn.data.storyLines[index] ?? []) {
          const path = vn.data.storyCharacterPortraits?.[entry.character ?? entry.speaker];
          if (path) assets.push(image(path));
          if (entry.backgroundChange?.path) assets.push(image(entry.backgroundChange.path));
          if (entry.portraitReveal) {
            assets.push(image(entry.portraitReveal.poster), image(entry.portraitReveal.titlePanel));
            for (const path of [entry.portraitReveal.frameImage, entry.portraitReveal.fallbackImage]) {
              if (path) assets.push(image(path));
            }
          }
        }
        for (const name of ['pause', 'history', 'back', 'next', 'main']) {
          assets.push(image('images/icon_UI/' + name + '_button.png'));
        }
      }
      if (!visualsOnly) {
        const config = data.audio !== undefined ? data.audio ?? {}
          : key === 'StoryScene'
            ? vn.data.storyAudio[data.storySceneIndex ?? vn.systems.GameState.state.storySceneIndex]
            : vn.data.sceneAudio[key];
        assets.push(...vn.systems.SceneAudio.paths(config).map(audio));
        assets.push(...(declared.audio ?? []).map(audio));
        // Клик и победа нужны везде; файл скачивается один раз.
        assets.push(...Object.values(vn.systems.AudioManager.UI_SOUNDS ?? {}).map(audio));
      }
      return [...new Map(assets.map((asset) => [asset.type + ':' + asset.key, asset])).values()];
    },

    queueFor(scene) {
      return scene.game.scene.getScene('AssetLoaderScene').queue;
    },

    preload(scene, options) {
      const onProgress = window.VN.systems.StartupScreen?.track(scene);
      const queue = this.queueFor(scene);
      const assets = this.assetsFor(scene.game, scene.sys.settings.key, scene.sys.settings.data, options);
      if (assets.every((asset) => queue.isCached(asset))) {
        onProgress?.(1);
        return;
      }
      scene.load.addFile(new AssetBarrier(scene, queue, assets, onProgress));
    },

    prefetch(scene, key, data = {}) {
      return this.queueFor(scene).ensure(this.assetsFor(scene.game, key, data));
    },

    nextTarget(key, data = {}) {
      const vn = window.VN;
      if (key === 'MainMenuScene') return { key: 'StoryScene', data: { storySceneIndex: 0, screenIndex: 0 } };
      const index = data.storySceneIndex;
      if (!Number.isInteger(index)) return null;
      if (key === 'StoryScene') {
        if (vn.data.storyLines[index]?.some((entry) => entry.portraitReveal)) return null;
        return { key: vn.data.storyMinigameLinks[index] || 'PlaceholderMinigameScene', data: { storySceneIndex: index } };
      }
      if (['GameScene1', 'GameScene2', 'GameScene3', 'GameScene4', 'QuoteMinigameScene', 'PlaceholderMinigameScene'].includes(key)) {
        return index + 1 < vn.data.storyLines.length
          ? { key: 'StoryScene', data: { storySceneIndex: index + 1, screenIndex: 0 } }
          : { key: 'MainMenuScene', data: {} };
      }
      return null;
    },

    prefetchNext(scene) {
      const target = this.nextTarget(scene.sys.settings.key, { storySceneIndex: scene.storySceneIndex });
      if (target) this.prefetch(scene, target.key, target.data);
    },

    enterMenu(scene) {
      let cancelled = false;
      const detach = () => {
        scene.events.off('shutdown', cancel);
        scene.events.off('destroy', cancel);
      };
      const cancel = () => { cancelled = true; detach(); };
      scene.events.once('shutdown', cancel);
      scene.events.once('destroy', cancel);
      // Музыка и первая сцена начинают загружаться только после создания меню.
      this.prefetch(scene, 'MainMenuScene', scene.sys.settings.data).then(() => {
        detach();
        if (!cancelled) window.VN.systems.SceneAudio.enter(scene);
      });
      this.prefetchNext(scene);
    },
  };

  window.VN.systems.SceneAssets = SceneAssets;
})();
