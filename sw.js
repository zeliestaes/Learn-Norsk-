/* Service worker : application utilisable hors ligne.
   La liste PRECACHE est générée par `node scripts/build-sw.js`. */
const VERSION = '01371fa53f';
const CACHE = 'norsk-reisen-' + VERSION;
const PRECACHE = ['./'];
// -- PRECACHE-START
PRECACHE.push("./assets/fonts/nunito.woff2", "./content/ch01.json", "./content/ch02.json", "./content/ch03.json", "./content/ch04.json", "./content/ch05.json", "./content/ch06.json", "./content/ch07.json", "./content/ch08.json", "./content/ch09.json", "./content/ch10.json", "./content/ch11.json", "./content/ch12.json", "./content/ch13.json", "./content/ch14.json", "./content/ch15.json", "./content/ch16.json", "./content/ch17.json", "./content/ch18.json", "./content/index.json", "./icons/apple-touch-icon-v2.png", "./icons/icon-192-v2.png", "./icons/icon-512-v2.png", "./index.html", "./manifest.webmanifest", "./src/audio.js", "./src/avatar.js", "./src/content.js", "./src/db.js", "./src/engine.js", "./src/exercises.js", "./src/game.js", "./src/leitner.js", "./src/main.js", "./src/schedule.js", "./src/screens.js", "./src/speech.js", "./src/state.js", "./src/text.js", "./src/util.js", "./styles/main.css");
// -- PRECACHE-END

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('norsk-reisen-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// Réseau d'abord pour les contenus JSON (corrections visibles vite), cache d'abord pour le reste.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const isContent = req.url.includes('/content/');
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req, { ignoreSearch: true });
    if (isContent) {
      try { const r = await fetch(req); if (r.ok) cache.put(req, r.clone()); return r; } catch { if (hit) return hit; throw new Error('offline'); }
    }
    if (hit) { fetch(req).then((r) => { if (r.ok) cache.put(req, r); }).catch(() => {}); return hit; }
    try { const r = await fetch(req); if (r.ok) cache.put(req, r.clone()); return r; }
    catch { if (req.mode === 'navigate') return cache.match('./'); throw new Error('offline'); }
  })());
});
