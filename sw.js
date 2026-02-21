const CACHE = 'foto-v1';
const ASSETS = ['/', '/index.html', '/css/style.css', '/css/print.css',
  '/js/presets.js', '/js/camera.js', '/js/editor.js', '/js/background.js',
  '/js/face.js', '/js/validation.js', '/js/print.js', '/js/export.js', '/js/app.js'];

self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS))));
self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
