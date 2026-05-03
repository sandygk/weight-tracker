const CACHE = 'wt-v2';
const SHELL = ['/', '/manifest.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const { request } = e;
  if (!request.url.startsWith(self.location.origin)) return;
  if (request.method !== 'GET') return;

  const isNavigation = request.mode === 'navigate';
  const isStatic = request.url.includes('/_next/static/');

  if (isStatic) {
    // Cache-first for immutable static assets
    e.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(res => {
        if (res.ok) caches.open(CACHE).then(c => c.put(request, res.clone()));
        return res;
      }))
    );
    return;
  }

  // Network-first for HTML and everything else; fall back to cache
  e.respondWith(
    fetch(request)
      .then(res => {
        if (res.ok) caches.open(CACHE).then(c => c.put(request, res.clone()));
        return res;
      })
      .catch(() => caches.match(isNavigation ? '/' : request)
        .then(cached => cached || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } }))
      )
  );
});
