/* Jokko storefront — service worker minimal.
   Chaque boutique a son origine (sous-domaine) → SW et caches isolés. */
const VERSION = 'jokko-v1';
const STATIC_CACHE = `${VERSION}-static`;
const PAGE_CACHE = `${VERSION}-pages`;
const OFFLINE_URL = '/offline';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PAGE_CACHE).then((cache) => cache.addAll(['/', OFFLINE_URL])),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Jamais l'API, l'analytique, ni les routes de contact.
  if (url.pathname.startsWith('/api/')) return;

  // Navigations : réseau d'abord, repli sur le cache puis page hors-ligne.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(PAGE_CACHE).then((c) => c.put(request, copy));
          return res;
        })
        .catch(async () => {
          const cache = await caches.open(PAGE_CACHE);
          return (
            (await cache.match(request)) ||
            (await cache.match('/')) ||
            (await cache.match(OFFLINE_URL)) ||
            Response.error()
          );
        }),
    );
    return;
  }

  // Assets Next + images : stale-while-revalidate.
  if (url.pathname.startsWith('/_next/static/') || request.destination === 'image') {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((res) => {
            if (res.ok) cache.put(request, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || network;
      }),
    );
  }
});
