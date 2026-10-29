const CACHE = 'noor-shell-v2';

const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './noor-icon-192.png',
  './noor-icon-512.png',
  './screenshots/Screenshot_2026-10-29-10-19-56-10_40deb401b9ffe8e1df2f1cc5ba480b12.jpg',
  './screenshots/Screenshot_2026-10-29-10-20-04-09_40deb401b9ffe8e1df2f1cc5ba480b12.jpg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(async cache => {
      for (const file of FILES) {
        try {
          await cache.add(file);
        } catch (error) {
          console.warn('Cache skipped:', file);
        }
      }

      await self.skipWaiting();
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();

    await Promise.all(
      keys
        .filter(key =>
          key.startsWith('noor-shell-') && key !== CACHE
        )
        .map(key => caches.delete(key))
    );

    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin
  ) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            caches.open(CACHE).then(cache =>
              cache.put('./index.html', response.clone())
            );
          }

          return response;
        })
        .catch(async () => {
          return await caches.match('./index.html') ||
                 await caches.match('./');
        })
    );

    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;

      return fetch(request).then(response => {
        if (response.ok) {
          caches.open(CACHE).then(cache =>
            cache.put(request, response.clone())
          );
        }

        return response;
      });
    })
  );
});
