const CACHE = 'noor-shell-v3';

const FILES = [
'./',
'./index.html',
'./manifest.webmanifest',
'./noor-icon-192.png'
];

const QURAN_API = 'https://api.alquran.cloud';
const PRAYER_API = 'https://api.aladhan.com';

self.addEventListener('install', event => {
event.waitUntil((async () => {
const cache = await caches.open(CACHE);

for (const file of FILES) {
  try {
    const response = await fetch(file, { cache: 'reload' });

    if (response.ok) {
      await cache.put(file, response);
    }
  } catch (error) {
    console.warn('Could not cache:', file);
  }
}

await self.skipWaiting();

})());
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

if (request.method !== 'GET') return;

const url = new URL(request.url);

if (
url.origin === QURAN_API ||
url.origin === PRAYER_API
) {
event.respondWith(
fetch(request).catch(() =>
new Response(
JSON.stringify({
code: 503,
status: 'offline',
message: 'البيانات غير متاحة حاليًا. تحقق من اتصال الإنترنت وحاول مجددًا.'
}),
{
status: 503,
headers: {
'Content-Type': 'application/json; charset=utf-8'
}
}
)
)
);

return;

}

if (url.origin !== self.location.origin) return;

if (request.mode === 'navigate') {
event.respondWith(
fetch(request).then(async response => {
if (response.ok) {
const cache = await caches.open(CACHE);
await cache.put('./index.html', response.clone());
}

    return response;
  }).catch(async () => {
    const cached =
      await caches.match('./index.html') ||
      await caches.match('./');

    return cached || new Response(
      'نور: لا يوجد اتصال بالإنترنت حاليًا.',
      {
        status: 503,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8'
        }
      }
    );
  })
);

return;

}

event.respondWith((async () => {
const cached = await caches.match(request);

if (cached) return cached;

try {
  const response = await fetch(request);

  if (response.ok) {
    const cache = await caches.open(CACHE);
    await cache.put(request, response.clone());
  }

  return response;
} catch {
  return Response.error();
}

})());
});
