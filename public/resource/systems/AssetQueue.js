/** Общая очередь: один запрос на ресурс, до четырёх файлов в партии. */
(function () {
  class AssetQueue {
    constructor({ isCached, loadBatch, concurrency = 4 }) {
      this.isCached = isCached;
      this.loadBatch = loadBatch;
      this.concurrency = concurrency;
      this.pending = new Map();
      this.waiting = [];
      this.busy = false;
      this.destroyed = false;
    }

    ensure(assets, { priority = 0, onProgress = () => {} } = {}) {
      const unique = [...new Map(assets.map((asset) => [asset.type + ':' + asset.key, asset])).values()];
      let completed = 0;
      onProgress(unique.length ? 0 : 1);
      return Promise.all(unique.map((asset) => {
        const id = asset.type + ':' + asset.key;
        let entry = this.pending.get(id);
        let ready;
        if (this.destroyed || this.isCached(asset)) {
          ready = Promise.resolve(!this.destroyed);
        } else {
          if (!entry) {
            entry = { id, asset, priority };
            entry.promise = new Promise((resolve) => { entry.resolve = resolve; });
            this.pending.set(id, entry);
            this.waiting.push(entry);
          }
          // Переход игрока повышает приоритет уже запланированных файлов.
          entry.priority = Math.max(entry.priority, priority);
          ready = entry.promise;
        }
        return ready.then((ok) => {
          onProgress(++completed / unique.length);
          return { asset, ok };
        });
      })).then((results) => results.filter((result) => !result.ok).map((result) => result.asset));
    }

    pump() {
      if (this.busy || this.destroyed || !this.waiting.length) return;
      this.waiting.sort((a, b) => b.priority - a.priority);
      const batch = this.waiting.splice(0, this.concurrency);
      this.busy = true;
      Promise.resolve().then(() => this.loadBatch(batch.map((entry) => entry.asset)))
        .catch((error) => console.warn('[AssetQueue]', error))
        .then(() => {
          for (const entry of batch) {
            this.pending.delete(entry.id);
            entry.resolve(!this.destroyed && this.isCached(entry.asset));
          }
          this.busy = false;
          this.pump();
        });
    }

    destroy() {
      this.destroyed = true;
      for (const entry of this.pending.values()) entry.resolve(false);
      this.pending.clear();
      this.waiting.length = 0;
    }
  }

  window.VN.systems.AssetQueue = AssetQueue;
})();
