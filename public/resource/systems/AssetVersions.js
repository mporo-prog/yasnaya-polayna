/**
 * Добавляет ?v=хэш к адресам файлов игры, которые загружаются во время работы
 * (картинки, звук, видео). Хостинг кэширует их на 45 дней; изменённый файл
 * получает новый адрес и скачивается заново, ключи текстур и звуков не меняются.
 * Таблицу версий кладёт в страницу сборка (build/assetVersions.js), в npm run dev
 * её нет и адреса остаются прежними. Подробнее — docs/caching.md.
 */
(function () {
  // Скрипт лежит в resource/systems/: корень сайта — на два уровня выше.
  const root = new URL('../../', document.currentScript.src);

  window.VN.systems.AssetVersions = {
    url(url) {
      const versions = window.VN_ASSET_VERSIONS;
      if (!versions || typeof url !== 'string') return url;
      let path;
      try {
        const resolved = new URL(url, document.baseURI);
        if (resolved.origin !== root.origin || !resolved.pathname.startsWith(root.pathname)) return url;
        path = decodeURIComponent(resolved.pathname.slice(root.pathname.length));
      } catch (error) {
        return url;
      }
      const version = Object.hasOwn(versions, path) ? versions[path] : null;
      if (!version) return url;
      const hashIndex = url.indexOf('#');
      const head = hashIndex < 0 ? url : url.slice(0, hashIndex);
      const tail = hashIndex < 0 ? '' : url.slice(hashIndex);
      return head + (head.includes('?') ? '&' : '?') + 'v=' + version + tail;
    },
  };
})();
