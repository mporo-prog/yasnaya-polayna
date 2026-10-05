import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import vm from 'node:vm';
import { build } from 'vite';
import {
  assetVersions, collectVersions, contentHash, versionUrl, VERSIONS_GLOBAL,
} from '../build/assetVersions.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const publicDir = join(root, 'public');
const resource = (path) => readFileSync(join(publicDir, 'resource', path), 'utf8');

function tempPublic(t, files) {
  const dir = mkdtempSync(join(tmpdir(), 'asset-versions-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(join(dir, path, '..'), { recursive: true });
    writeFileSync(join(dir, path), content);
  }
  return dir;
}

test('every public file gets a content hash under its site path; hidden files are skipped', (t) => {
  const dir = tempPublic(t, {
    '.htaccess': 'Options -Indexes',
    'images/icon_UI/Group 60.webp': 'icon',
    'images/hero/Репин_2.webp': 'repin',
    'resource/systems/Layout.js': 'layout v1',
  });
  const before = collectVersions(dir);
  assert.deepEqual(Object.keys(before), [
    'images/hero/Репин_2.webp', 'images/icon_UI/Group 60.webp', 'resource/systems/Layout.js',
  ]);
  assert.match(before['resource/systems/Layout.js'], /^[0-9a-f]{10}$/);

  writeFileSync(join(dir, 'resource/systems/Layout.js'), 'layout v2');
  const after = collectVersions(dir);
  assert.notEqual(after['resource/systems/Layout.js'], before['resource/systems/Layout.js'], 'Changed file gets a new address');
  assert.equal(after['images/hero/Репин_2.webp'], before['images/hero/Репин_2.webp'], 'Unchanged files keep their cache');
});

test('HTML addresses are versioned relative to the page for any deployment base', () => {
  const versions = { 'resource/core/screen.css': 'aaaaaaaaaa', 'images/icon_UI/Group 60.webp': 'bbbbbbbbbb' };
  for (const base of ['/', '/yasnaya-polayna/']) {
    assert.equal(versionUrl('resource/core/screen.css', '/index.html', base, versions), 'resource/core/screen.css?v=aaaaaaaaaa');
    assert.equal(versionUrl('../../resource/core/screen.css', '/games/finish/index.html', base, versions),
      '../../resource/core/screen.css?v=aaaaaaaaaa');
    assert.equal(versionUrl(base + 'resource/core/screen.css', '/games/finish/index.html', base, versions),
      base + 'resource/core/screen.css?v=aaaaaaaaaa');
    assert.equal(versionUrl('images/icon_UI/Group%2060.webp', '/index.html', base, versions),
      'images/icon_UI/Group%2060.webp?v=bbbbbbbbbb');
    // Хэшированный бандл Vite, внешние и неизвестные адреса не меняются.
    for (const url of [base + 'assets/main-CAtCQzuS.js', 'https://fonts.googleapis.com/css2?family=Ysabeau',
      '//cdn.example/resource/core/screen.css', 'resource/core/missing.js', 'data:text/css,']) {
      assert.equal(versionUrl(url, '/index.html', base, versions), url);
    }
  }
  assert.equal(versionUrl('resource/core/screen.css?x=1#top', '/index.html', '/', versions),
    'resource/core/screen.css?x=1&v=aaaaaaaaaa#top');
});

test('the build adds the versions table right before the first game script, once per page', (t) => {
  const dir = tempPublic(t, { 'resource/lib/phaser.min.js': 'phaser', 'resource/core/screen.css': 'css' });
  const plugin = assetVersions();
  plugin.configResolved({ base: '/', publicDir: dir, build: { assetsDir: 'assets' } });
  plugin.buildStart();
  const emitted = [];
  plugin.generateBundle.call({ emitFile: (file) => emitted.push(file) });
  assert.equal(emitted.length, 1);
  assert.match(emitted[0].fileName, /^assets\/asset-versions-[0-9a-f]{8}\.js$/);
  const table = vm.runInNewContext(emitted[0].source + `;window.${VERSIONS_GLOBAL}`, { window: {} });
  assert.deepEqual({ ...table }, collectVersions(dir));

  const html = [
    '<head>',
    '  <link rel="stylesheet" href="../../resource/core/screen.css">',
    '</head>',
    '<body>',
    '    <script src="../../resource/lib/phaser.min.js"></script>',
    '    <script src="../../resource/lib/phaser.min.js"></script>',
    '    <script type="module" crossorigin src="/assets/finish-x.js"></script>',
    '</body>',
  ].join('\n');
  const result = plugin.transformIndexHtml.handler(html, { path: '/games/finish/index.html' });
  const css = contentHash('css');
  const phaser = contentHash('phaser');
  assert.equal(result, [
    '<head>',
    `  <link rel="stylesheet" href="../../resource/core/screen.css?v=${css}">`,
    '</head>',
    '<body>',
    `    <script src="/${emitted[0].fileName}"></script>`,
    `    <script src="../../resource/lib/phaser.min.js?v=${phaser}"></script>`,
    `    <script src="../../resource/lib/phaser.min.js?v=${phaser}"></script>`,
    '    <script type="module" crossorigin src="/assets/finish-x.js"></script>',
    '</body>',
  ].join('\n'));

  const redirect = '<script type="module" crossorigin src="/assets/game2-x.js"></script>';
  assert.equal(plugin.transformIndexHtml.handler(redirect, { path: '/games/game2/index.html' }), redirect);
});

function runtime({ page, script, versions }) {
  const window = { VN: { systems: {}, data: {}, scenes: {} } };
  if (versions) window[VERSIONS_GLOBAL] = versions;
  const context = vm.createContext({
    window, URL, console,
    document: { baseURI: page, currentScript: { src: script } },
    localStorage: { getItem: () => null, setItem() {} },
    Phaser: { Scene: class {} },
  });
  const run = (path, src = new URL(path, new URL('../', script)).href) => {
    // Каждый скрипт видит свой document.currentScript, как в браузере.
    context.document.currentScript = { src };
    vm.runInContext(resource(path), context);
  };
  // script — адрес самого помощника, как в собранном HTML (с ?v=).
  run('systems/AssetVersions.js', script);
  return { window, run, context };
}

test('runtime addresses get the file version while unknown and foreign addresses stay the same', () => {
  const versions = {
    'images/backgrounds/game5.webp': '1111111111',
    'images/icon_UI/Group 60.webp': '2222222222',
    'images/hero/Репин_2.webp': '3333333333',
    'resource/sound/ui/interface_click.mp3': '4444444444',
    'video/tolstoy-portrait-e1ebd194.webm': '5555555555',
  };
  // Продакшен лежит в корне домена, GitHub Pages — в /yasnaya-polayna/.
  for (const site of ['https://game.example/', 'https://pages.example/yasnaya-polayna/']) {
    const { window } = runtime({ page: site, script: site + 'resource/systems/AssetVersions.js?v=abc', versions });
    const url = (value) => window.VN.systems.AssetVersions.url(value);
    assert.equal(url('images/hero/Репин_2.webp'), 'images/hero/Репин_2.webp?v=3333333333');
    assert.equal(url('images/icon_UI/Group%2060.webp'), 'images/icon_UI/Group%2060.webp?v=2222222222');
    assert.equal(url('video/tolstoy-portrait-e1ebd194.webm'), 'video/tolstoy-portrait-e1ebd194.webm?v=5555555555');
    // Ключ звука — полный адрес.
    assert.equal(url(site + 'resource/sound/ui/interface_click.mp3'), site + 'resource/sound/ui/interface_click.mp3?v=4444444444');
    for (const same of ['images/unknown.webp', 'https://other.example/images/backgrounds/game5.webp', 'blob:x', null]) {
      assert.equal(url(same), same);
    }
  }
  // Финальный экран — страница во вложенной папке с адресами от корня сайта.
  const site = 'https://game.example/';
  const finish = runtime({ page: site + 'games/finish/index.html', script: site + 'resource/systems/AssetVersions.js?v=abc', versions });
  const url = (value) => finish.window.VN.systems.AssetVersions.url(value);
  assert.equal(url('/images/icon_UI/Group 60.webp'), '/images/icon_UI/Group 60.webp?v=2222222222');
  assert.equal(url('../../images/backgrounds/game5.webp'), '../../images/backgrounds/game5.webp?v=1111111111');
});

test('without a versions table (npm run dev) addresses stay unchanged', () => {
  const site = 'https://game.example/';
  const { window } = runtime({ page: site, script: site + 'resource/systems/AssetVersions.js' });
  assert.equal(window.VN.systems.AssetVersions.url('images/backgrounds/game5.webp'), 'images/backgrounds/game5.webp');
});

test('the scene loader and AudioManager download versioned files under the unchanged cache keys', async () => {
  const site = 'https://game.example/';
  const click = site + 'resource/sound/ui/interface_click.mp3';
  const { window, run } = runtime({
    page: site, script: site + 'resource/systems/AssetVersions.js?v=abc',
    versions: { 'images/backgrounds/game5.webp': '1111111111', 'resource/sound/ui/interface_click.mp3': '4444444444' },
  });
  run('systems/AudioManager.js');
  const loaded = [];
  const load = {
    image: (config) => loaded.push(['image', config.key, config.url]),
    audio: (key, url) => loaded.push(['audio', key, url]),
    on() {}, off() {}, once: (event, done) => { if (event === 'complete') load.done = done; },
    start: () => load.done(),
  };
  const scene = { load, cache: { audio: { exists: () => false } } };
  assert.equal(window.VN.systems.AudioManager.load(scene, 'ui/interface_click.mp3'), click);

  let loadBatch;
  window.VN.systems.AssetQueue = class { constructor(options) { loadBatch = options.loadBatch; } };
  run('scenes/AssetLoaderScene.js');
  const loader = new window.VN.scenes.AssetLoaderScene();
  Object.assign(loader, { load, events: { once() {}, off() {} } });
  loader.create();
  await loadBatch([
    { type: 'image', key: 'images/backgrounds/game5.webp', url: 'images/backgrounds/game5.webp' },
    { type: 'audio', key: click, url: click },
  ], () => {});
  assert.deepEqual(loaded, [
    ['audio', click, click + '?v=4444444444'],
    ['image', 'images/backgrounds/game5.webp', 'images/backgrounds/game5.webp?v=1111111111'],
    ['audio', click, click + '?v=4444444444'],
  ]);
});

test('the final screen loads every image with its file version under the unchanged texture keys', () => {
  const site = 'https://game.example/';
  const versions = collectVersions(publicDir);
  const { window, context } = runtime({
    page: site + 'games/finish/', script: site + 'resource/systems/AssetVersions.js?v=abc', versions,
  });
  // Модуль финала собирает Vite; здесь подставляем то, что подставила бы сборка с базой '/'.
  const source = readFileSync(join(root, 'games/finish/FinishScene.js'), 'utf8')
    .replaceAll('import.meta.env.BASE_URL', JSON.stringify('/'))
    .replace('export class FinishScene', 'class FinishScene');
  vm.runInContext(source + '\nwindow.FinishScene = FinishScene;', context);
  window.VN.systems.StartupScreen = { track: () => null };
  const loaded = [];
  const scene = new window.FinishScene();
  scene.load = { image: (key, url) => loaded.push([key, url]) };
  scene.preload();

  assert.equal(loaded.length, 10);
  assert.deepEqual(loaded.slice(0, 2).map(([key]) => key), ['finishBackground', 'finishReplay']);
  for (const [key, url] of loaded) {
    const [path, version] = url.split('?v=');
    const file = decodeURIComponent(new URL(path, site).pathname.slice(1));
    assert.ok(version && version === versions[file], `${key}: ${url}`);
  }
});

test('production build: every page reference and the runtime table match the current public files', async (t) => {
  const outDir = mkdtempSync(join(tmpdir(), 'asset-versions-build-'));
  t.after(() => rmSync(outDir, { recursive: true, force: true }));
  // Как на продакшене: сайт в корне домена.
  await build({
    root, base: '/', logLevel: 'silent',
    build: { outDir, emptyOutDir: true, copyPublicDir: false },
  });
  // Ожидания считаются здесь заново, без collectVersions из плагина.
  const hashOf = (path) => createHash('sha256').update(readFileSync(join(publicDir, path))).digest('hex').slice(0, 10);
  const files = readdirSync(publicDir, { recursive: true })
    .map((path) => path.split(sep).join('/'))
    .filter((path) => !path.split('/').some((part) => part.startsWith('.')) && statSync(join(publicDir, path)).isFile())
    .sort();
  assert.ok(files.some((path) => path.endsWith('.mp3')) && files.some((path) => path.endsWith('.webm')));
  const [tableFile] = readdirSync(join(outDir, 'assets')).filter((name) => name.startsWith('asset-versions-'));
  const table = vm.runInNewContext(readFileSync(join(outDir, 'assets', tableFile), 'utf8') + `;window.${VERSIONS_GLOBAL}`, { window: {} });
  assert.deepEqual(Object.keys(table).sort(), files, 'The table lists every public file the game can load');
  for (const path of files) assert.equal(table[path], hashOf(path), path);

  for (const page of ['index.html', 'games/finish/index.html']) {
    const html = readFileSync(join(outDir, page), 'utf8');
    const references = [...html.matchAll(/<(script|link)\b[^>]*?\s(?:src|href)="([^"]+)"/g)]
      .map(([, tag, url]) => ({ tag, url }));
    const local = references.filter(({ url }) => !/^(https?:)?\/\//.test(url) && !url.startsWith('/assets/'));
    assert.ok(local.length > 5, page);
    for (const { url } of local) {
      const [path, version] = url.split('?v=');
      const file = new URL(path, 'http://site/' + page).pathname.slice(1);
      assert.equal(version, hashOf(decodeURIComponent(file)), `${page}: ${url}`);
    }
    const scripts = references.filter(({ tag }) => tag === 'script').map(({ url }) => url);
    const first = scripts.findIndex((url) => url.includes('resource/'));
    assert.equal(scripts[first - 1], '/assets/' + tableFile, `${page}: table goes right before the first game script`);
    assert.ok(scripts.some((url) => url.includes('resource/systems/AssetVersions.js?v=')), page);
  }
});
