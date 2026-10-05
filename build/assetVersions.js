// Версии файлов из public/ для обхода долгого кэша хостинга (см. docs/caching.md).
// Хостинг отдаёт статику с Cache-Control на 45 дней, а Vite хэширует имена только
// у собранного бандла. Поэтому к ссылкам на файлы public/ добавляется ?v=хэш
// содержимого: изменённый файл получает новый адрес, остальные остаются в кэше.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

// Таблица «путь → хэш» для адресов, которые игра собирает во время работы
// (картинки, звук, видео). Читает её resource/systems/AssetVersions.js.
export const VERSIONS_GLOBAL = 'VN_ASSET_VERSIONS';

const PLACEHOLDER_ORIGIN = 'http://site';

export function contentHash(data) {
  return createHash('sha256').update(data).digest('hex').slice(0, 10);
}

/** Пути относительно корня сайта → хэш. Скрытые файлы (.htaccess) не отдаются. */
export function collectVersions(publicDir) {
  const versions = {};
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile()) {
        versions[relative(publicDir, path).split(sep).join('/')] = contentHash(readFileSync(path));
      }
    }
  };
  walk(publicDir);
  // Порядок обхода зависит от ОС; от него не должен зависеть хэш таблицы.
  return Object.fromEntries(Object.entries(versions).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}

export function appendVersion(url, version) {
  const hashIndex = url.indexOf('#');
  const head = hashIndex < 0 ? url : url.slice(0, hashIndex);
  const tail = hashIndex < 0 ? '' : url.slice(hashIndex);
  return head + (head.includes('?') ? '&' : '?') + 'v=' + version + tail;
}

/**
 * Версионирует адрес из HTML-страницы pagePath (путь от корня сайта, например
 * /games/finish/index.html). Внешние адреса, бандл Vite и неизвестные файлы
 * не меняются.
 */
export function versionUrl(url, pagePath, base, versions) {
  const root = base.startsWith('/') ? base : '/';
  let resolved;
  let path;
  try {
    const page = new URL(pagePath.replace(/^\//, ''), PLACEHOLDER_ORIGIN + root);
    resolved = new URL(url, page);
    if (resolved.origin !== PLACEHOLDER_ORIGIN || !resolved.pathname.startsWith(root)) return url;
    path = decodeURIComponent(resolved.pathname.slice(root.length));
  } catch {
    return url;
  }
  const version = Object.hasOwn(versions, path) ? versions[path] : null;
  return version ? appendVersion(url, version) : url;
}

const HTML_REFERENCE = /(<(?:script|link)\b[^>]*?\s(?:src|href)=)(["'])([^"']+)\2/gi;

export function assetVersions() {
  let config;
  let versions = {};
  let manifestFile = '';
  let manifestSource = '';

  return {
    name: 'yasnaya:asset-versions',
    apply: 'build',

    configResolved(resolved) {
      config = resolved;
    },

    buildStart() {
      versions = config.publicDir ? collectVersions(config.publicDir) : {};
      manifestSource = `window.${VERSIONS_GLOBAL} = ${JSON.stringify(versions)};\n`;
      manifestFile = `${config.build.assetsDir}/asset-versions-${contentHash(manifestSource).slice(0, 8)}.js`;
    },

    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        let manifestAdded = false;
        return html.replace(HTML_REFERENCE, (match, prefix, quote, url, offset) => {
          const next = versionUrl(url, ctx.path, config.base, versions);
          if (next === url) return match;
          const result = prefix + quote + next + quote;
          if (manifestAdded || !/^<script/i.test(prefix)) return result;
          // Таблица — прямо перед первым скриптом игры: она готова до любых
          // загрузок и не задерживает показ HTML-заставки, как скрипт в <head>.
          manifestAdded = true;
          const lineStart = html.lastIndexOf('\n', offset) + 1;
          const indent = /^\s*$/.test(html.slice(lineStart, offset)) ? html.slice(lineStart, offset) : '';
          return `<script src="${config.base}${manifestFile}"></script>\n${indent}${result}`;
        });
      },
    },

    generateBundle() {
      this.emitFile({ type: 'asset', fileName: manifestFile, source: manifestSource });
    },
  };
}
