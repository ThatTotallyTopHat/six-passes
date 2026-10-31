// Six Passes: builds the static site into dist/ (page, offline cache, app manifest, icons, link preview image)
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { Resvg } = require('@resvg/resvg-js');

const ROOT = __dirname, OUT = path.join(ROOT, 'dist');
const HOST = process.env.VERCEL_PROJECT_PRODUCTION_URL;
const SITE_URL = process.env.SITE_URL || (HOST ? 'https://' + HOST : 'https://six-passes.vercel.app');
const DESC = 'Link two footballers through the clubs they shared and the teammates they played alongside, in as few passes as possible.';
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'icons'), { recursive: true });

// ---- images, drawn from the SVG sources with the game's fonts ----
const FONTS = path.join(ROOT, 'node_modules/@expo-google-fonts');
const fontFiles = [
  'big-shoulders-display/BigShouldersDisplay_900Black.ttf',
  'big-shoulders-display/BigShouldersDisplay_800ExtraBold.ttf',
  'archivo/600SemiBold/Archivo_600SemiBold.ttf',
  'archivo/500Medium/Archivo_500Medium.ttf'
].map(f => path.join(FONTS, f));
function png(svg, width, out) {
  const r = new Resvg(read(svg), { fitTo: { mode: 'width', value: width }, font: { fontFiles, loadSystemFonts: false, defaultFontFamily: 'Archivo' } });
  fs.writeFileSync(path.join(OUT, out), r.render().asPng());
}
png('icon.svg', 512, 'icons/icon-512.png');
png('icon.svg', 192, 'icons/icon-192.png');
png('icon.svg', 180, 'icons/apple-touch-icon.png');
png('og.svg', 1200, 'og.png');

// ---- page ----
const data = fs.readdirSync(path.join(ROOT, 'data')).filter(f => /^data-\d+\.txt$/.test(f)).sort().map(f => read(path.join('data', f))).join('');
if (/[`$\\]/.test(data)) throw new Error('squad data contains a character that would break the page');
let body = read('head.html').split('\n').filter(l => !/^<(title|meta|link)\b/.test(l)).join('\n');
body = body.replace('<style>', '<style>\n:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}\nbody{margin:0}\nimg{max-width:100%}\n[hidden]{display:none!important}');

const html = `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Six Passes</title>
<meta name="description" content="${DESC}">
<meta name="theme-color" content="#eef2ec" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0c1510" media="(prefers-color-scheme: dark)">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Six Passes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta property="og:type" content="website">
<meta property="og:title" content="Six Passes">
<meta property="og:description" content="${DESC}">
<meta property="og:url" content="${SITE_URL}/">
<meta property="og:image" content="${SITE_URL}/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=Big+Shoulders+Display:wght@700;800;900&display=swap">
</head>
<body>
${body}
<script>window.SIX_SITE = true;</script>
<script>
var RAW = \`
${data}\`;
${read('app.js')}</script>
<script>
if ('serviceWorker' in navigator) addEventListener('load', function () { navigator.serviceWorker.register('/sw.js').catch(function () {}); });
</script>
</body>
</html>
`;
fs.writeFileSync(path.join(OUT, 'index.html'), html);

// ---- install as an app ----
fs.writeFileSync(path.join(OUT, 'manifest.webmanifest'), JSON.stringify({
  name: 'Six Passes', short_name: 'Six Passes', description: DESC,
  start_url: '/', scope: '/', display: 'standalone', orientation: 'portrait',
  background_color: '#eef2ec', theme_color: '#236f48',
  icons: [
    { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
  ]
}, null, 2));

// ---- offline play: pages load fresh when online and fall back to the cache; fonts are kept once fetched ----
const version = crypto.createHash('sha1').update(html).digest('hex').slice(0, 10);
fs.writeFileSync(path.join(OUT, 'sw.js'), `const CACHE = 'six-passes-${version}';
const FONT_CACHE = 'six-passes-fonts';
const ASSETS = ['/', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/apple-touch-icon.png'];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== FONT_CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (FONT_HOSTS.includes(url.hostname)) {
    e.respondWith(caches.open(FONT_CACHE).then(c => c.match(req).then(hit => hit || fetch(req).then(res => { c.put(req, res.clone()); return res; }))));
    return;
  }
  if (url.origin !== location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put('/', copy)); return res; }).catch(() => caches.match('/')));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
});
`);

console.log('Built Six Passes for', SITE_URL);
fs.readdirSync(OUT, { recursive: true }).forEach(f => { const p = path.join(OUT, f); if (fs.statSync(p).isFile()) console.log('  ' + f, fs.statSync(p).size); });
