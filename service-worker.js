/* =========================================================
   Velocidad y Distancia — Service Worker Offline
   Compatible con GitHub Pages / PWA / iOS
   ========================================================= */

const CACHE_VERSION = 'velocidad-v7.5-offline-v1';
const APP_CACHE = `${CACHE_VERSION}-app`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const APP_SHELL = [
  './'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(APP_CACHE)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== APP_CACHE && key !== RUNTIME_CACHE)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;

  if (request.method !== 'GET') return;

  // HTML: primero intenta obtener la versión más nueva.
  // Si no hay Internet, utiliza la copia guardada.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();

            caches.open(APP_CACHE)
              .then(cache => cache.put(request, copy));
          }

          return response;
        })
        .catch(async () => {
          const exact = await caches.match(request);

          if (exact) {
            return exact;
          }

          const root = await caches.match('./');

          if (root) {
            return root;
          }

          return new Response(
            '<!doctype html><html><body><h1>Sin conexión</h1><p>Abre la app una vez con Internet para guardar su contenido.</p></body></html>',
            {
              headers: {
                'Content-Type': 'text/html; charset=utf-8'
              }
            }
          );
        })
    );

    return;
  }

  // Recursos estáticos.
  // También guarda recursos externos como Font Awesome.
  event.respondWith(
    caches.match(request)
      .then(cached => {
        if (cached) {
          return cached;
        }

        return fetch(request)
          .then(response => {
            if (!response) {
              return response;
            }

            if (response.ok || response.type === 'opaque') {
              const copy = response.clone();

              caches.open(RUNTIME_CACHE)
                .then(cache => cache.put(request, copy));
            }

            return response;
          })
          .catch(() => cached);
      })
  );
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
