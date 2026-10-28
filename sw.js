
const CACHE = 'noor-shell-v1';
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon.svg'
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
      keys.filter(key =>
        key.startsWith('noor-shell-') && key !== CACHE
      ).map(key => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET' ||
      url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then(response => {
        if (response.ok) {
          caches.open(CACHE).then(cache =>
            cache.put('./index.html', response.clone())
          );
        }
        return response;
      }).catch(async () => {
        return await caches.match('./index.html') ||
               await caches.match('./');
      })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached =>
      cached || fetch(request).then(response => {
        if (response.ok) {
          caches.open(CACHE).then(cache =>
            cache.put(request, response.clone())
          );
        }
        return response;
      })
    )
  );
});
                  
