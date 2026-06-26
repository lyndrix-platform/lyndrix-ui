// Minimal service worker — required for PWA installability (and thus the TWA).
// Lyndrix is an online-first dashboard, so we deliberately do NOT precache the
// hashed app shell here; we just register a fetch handler and pass GET requests
// through to the network. Non-GET (auth, mutations) and SSE are left untouched.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(fetch(event.request));
});
