/* Service worker : application utilisable hors ligne.
   La liste PRECACHE est générée par `node scripts/build-sw.js`. */
const VERSION = 'b1d1027994';
const CACHE = 'norsk-reisen-' + VERSION;
const PRECACHE = ['./'];
// -- PRECACHE-START
PRECACHE.push("./assets/fonts/nunito.woff2", "./assets/vendor/jspdf.umd.min.js", "./content/ch01.json", "./content/ch02.json", "./content/ch03.json", "./content/ch04.json", "./content/ch05.json", "./content/ch06.json", "./content/ch07.json", "./content/ch08.json", "./content/ch09.json", "./content/ch10.json", "./content/ch11.json", "./content/ch12.json", "./content/ch13.json", "./content/ch14.json", "./content/ch15.json", "./content/ch16.json", "./content/ch17.json", "./content/ch18.json", "./content/index.json", "./icons/apple-touch-icon-v2.png", "./icons/icon-192-v2.png", "./icons/icon-512-v2.png", "./index.html", "./manifest.webmanifest", "./src/audio.js", "./src/avatar.js", "./src/content.js", "./src/db.js", "./src/engine.js", "./src/exercises.js", "./src/game.js", "./src/leitner.js", "./src/main.js", "./src/pdf.js", "./src/schedule.js", "./src/screens.js", "./src/speech.js", "./src/state.js", "./src/text.js", "./src/util.js", "./styles/main.css");
// -- PRECACHE-END

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('norsk-reisen-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// Réseau d'abord (les mises à jour apparaissent dès que l'appli est ouverte avec internet),
// cache en secours pour le mode hors ligne.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const r = await fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' });
      if (r.ok) cache.put(req, r.clone());
      return r;
    } catch {
      const hit = await cache.match(req, { ignoreSearch: true });
      if (hit) return hit;
      if (req.mode === 'navigate') { const home = await cache.match('./'); if (home) return home; }
      throw new Error('offline');
    }
  })());
});
