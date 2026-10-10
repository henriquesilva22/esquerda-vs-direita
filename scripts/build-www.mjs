// Monta a pasta do jogo a partir de src/.
//   node scripts/build-www.mjs              → www/  (vai dentro do app iOS/Android)
//   node scripts/build-www.mjs --web site   → site/ (GitHub Pages: jogável e instalável pelo navegador, offline)
// Nos dois casos: página com cabeçalho completo, zoom desligado e fontes embutidas (sem Google Fonts).
import { readFileSync, writeFileSync, rmSync, mkdirSync, cpSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const web = args.includes('--web');
const outName = web ? (args[args.indexOf('--web') + 1] || 'site') : 'www';
const src = join(root, 'src'), out = join(root, outName);

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(join(src, 'js'), join(out, 'js'), { recursive: true });
cpSync(join(src, 'fonts'), join(out, 'fonts'), { recursive: true });

let body = readFileSync(join(src, 'index.html'), 'utf8');
body = body.split('\n').filter(l => !/fonts\.(googleapis|gstatic)\.com/.test(l)).join('\n');

let head = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<meta name="format-detection" content="telephone=no">
<meta name="color-scheme" content="dark">
<link rel="stylesheet" href="fonts/fonts.css">
`;

if (web) {
  // ---- versão instalável (PWA) ----
  const pwa = join(root, 'web');
  cpSync(pwa, out, { recursive: true });
  head += `<meta name="theme-color" content="#0c0912">
<meta name="description" content="Jogo de luta 2D com sátira política fictícia. Personagens inventados.">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icons/icon-192.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Esq. vs Dir.">
<script>
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }
</script>
`;
} else {
  head += `<script>window.EVD_APP = true;</script>\n`;
}

const html = head + body.replace('<canvas id="bg"', '</head>\n<body>\n<canvas id="bg"') + '\n</body>\n</html>\n';
writeFileSync(join(out, 'index.html'), html);

if (web) {
  // service worker com a lista de arquivos e uma versão calculada pelo conteúdo
  const files = [];
  (function walk(d) { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else files.push(relative(out, p).split('\\').join('/')); } })(out);
  const list = files.filter(f => f !== 'sw.js' && !f.endsWith('.txt'));
  const hash = createHash('sha1'); list.forEach(f => hash.update(readFileSync(join(out, f)))); const ver = hash.digest('hex').slice(0, 10);
  const sw = readFileSync(join(out, 'sw.js'), 'utf8').replace('__VERSION__', ver).replace('__FILES__', JSON.stringify(['./', ...list]));
  writeFileSync(join(out, 'sw.js'), sw);
  writeFileSync(join(out, '.nojekyll'), '');
  console.log(`${outName}/ pronto (web instalável, ${list.length} arquivos, versão ${ver})`);
} else console.log('www/ pronto');
