// Проверка production-сборки при медленной сети: npm run build,
// затем node tests/serve-slow-startup.mjs и /yasnaya-polayna/tests/startup-loading.html.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const base = '/yasnaya-polayna/';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.wav': 'audio/wav' };
const delays = new Map([
  ['resource/lib/phaser.min.js', 2500],
  ['images/icon_UI/main_button.png', 300],
  ['images/icon_UI/save_button.png', 1000],
  ['images/backgrounds/menu_screen.png', 2000],
  ['test-delayed-fonts.css', 12000],
]);
createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (!url.pathname.startsWith(base)) { res.writeHead(404).end(); return; }
    const name = decodeURIComponent(url.pathname.slice(base.length)) || 'index.html';
    const folder = resolve(root, name.startsWith('tests/') ? 'tests' : 'dist');
    const path = resolve(folder, name.startsWith('tests/') ? name.slice(6) : name);
    if (!path.startsWith(folder + sep)) { res.writeHead(403).end(); return; }
    let content = name === 'test-delayed-fonts.css' ? '' : await readFile(path);
    if (name === 'index.html') {
      // Удерживаем внешний CSS шрифтов: он не должен блокировать ни экран, ни игру.
      content = content.toString().replace(/https:\/\/fonts\.googleapis\.com\/css2[^"\s]*/, base + 'test-delayed-fonts.css');
    }
    const send = () => {
      if (res.destroyed) return;
      res.writeHead(200, { 'Content-Type': types[extname(name)] ?? 'application/octet-stream',
        'Cache-Control': 'no-store' });
      res.end(content);
    };
    setTimeout(send, delays.get(name) ?? 0);
  } catch {
    res.writeHead(404).end();
  }
}).listen(4174, '127.0.0.1', () => {
  console.log('Slow startup test: http://127.0.0.1:4174' + base + 'tests/startup-loading.html');
});
