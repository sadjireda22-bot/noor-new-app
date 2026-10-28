
const SHELL_CACHE = 'noor-shell-v4';
const DATA_CACHE = 'noor-data-v1';

const APP_FILES = [
  './',
  './index.html',
  './app.js',
  './manifest.webmanifest',
  './icon.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(cache => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key =>
            key.startsWith('noor-') &&
            key !== SHELL_CACHE &&
            key !== DATA_CACHE
          )
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // تخزين بيانات القرآن ومواقيت الصلاة من واجهات API
  const isQuranAPI = url.hostname === 'api.alquran.cloud';
  const isPrayerAPI = url.hostname === 'api.aladhan.com';

  if (isQuranAPI || isPrayerAPI) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            event.waitUntil(
              caches.open(DATA_CACHE)
                .then(cache => cache.put(request, copy))
            );
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;

          return new Response(
            JSON.stringify({
              code: 503,
              status: 'OFFLINE',
              message: 'هذه البيانات غير متاحة دون اتصال.'
            }),
            {
              status: 503,
              headers: {
                'Content-Type': 'application/json; charset=utf-8'
              }
            }
          );
        })
    );
    return;
  }

  // لا نتدخل في طلبات المواقع الخارجية الأخرى
  if (url.origin !== self.location.origin) return;

  // عرض نسخة الموقع المحفوظة عند انقطاع الإنترنت
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            event.waitUntil(
              caches.open(SHELL_CACHE)
                .then(cache => cache.put('./index.html', response.clone()))
            );
          }
          return response;
        })
        .catch(async () => {
          return (await caches.match(request)) ||
            (await caches.match('./index.html')) ||
            new Response('نور: أنت غير متصل بالإنترنت.', {
              headers: { 'Content-Type': 'text/plain; charset=utf-8' }
            });
        })
    );
    return;
  }

  // الملفات المحلية: استخدم النسخة المحفوظة أولاً
  event.respondWith(
    caches.match(request).then(async cached => {
      if (cached) return cached;

      const response = await fetch(request);

      if (response.ok) {
        event.waitUntil(
          caches.open(SHELL_CACHE)
            .then(cache => cache.put(request, response.clone()))
        );
      }

      return response;
    })
  );
});
  
