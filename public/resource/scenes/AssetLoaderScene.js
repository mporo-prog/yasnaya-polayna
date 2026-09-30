(function () {
  /** Живёт рядом с игровыми сценами; не рисует и не воспроизводит звук. */
  class AssetLoaderScene extends Phaser.Scene {
    constructor() {
      super({ key: 'AssetLoaderScene', visible: false });
      this.isAssetLoader = true;
    }

    create() {
      this.queue = new window.VN.systems.AssetQueue({
        isCached: (asset) => asset.type === 'image'
          ? this.textures.exists(asset.key) : this.cache.audio.exists(asset.key),
        loadBatch: (assets, onFileComplete) => new Promise((resolve) => {
          const complete = (key, type) => onFileComplete({ key, type });
          const failed = (file) => onFileComplete(file);
          this.load.on('filecomplete', complete);
          this.load.on('loaderror', failed);
          this.load.once('complete', () => {
            this.load.off('filecomplete', complete);
            this.load.off('loaderror', failed);
            resolve();
          });
          for (const asset of assets) {
            if (asset.type === 'image') {
              this.load.image({ key: asset.key, url: asset.url, xhrSettings: { timeout: 15000 } });
            } else {
              this.load.audio(asset.key, asset.url, {}, { timeout: 15000 });
            }
          }
          this.load.start();
        }),
      });
      const dispose = () => {
        this.queue.destroy();
        this.events.off('shutdown', dispose);
        this.events.off('destroy', dispose);
      };
      this.events.once('shutdown', dispose);
      this.events.once('destroy', dispose);
    }

    update() {
      // Начинаем работу на следующем кадре, давая текущей сцене отрисоваться.
      this.queue.pump();
    }
  }

  window.VN.scenes.AssetLoaderScene = AssetLoaderScene;
})();
