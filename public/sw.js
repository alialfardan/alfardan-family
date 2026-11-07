const CACHE_NAME = 'alfardan-pwa-v11';
const GITHUB_RAW_PUBLIC = 'https://raw.githubusercontent.com/alialfardan/alfardan-family/main/public';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.png'
];

// 1. Install Event: Cache essential shell and activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('Precache partial fallback:', err);
      });
    })
  );
});

// 2. Activate Event: Claim clients immediately, preserve any cached /avatars/*, and clean old shell caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      const newCache = await caches.open(CACHE_NAME);
      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        if (name !== CACHE_NAME) {
          try {
            const oldCache = await caches.open(name);
            const oldKeys = await oldCache.keys();
            for (const req of oldKeys) {
              if (req.url && req.url.includes('/avatars/')) {
                const resp = await oldCache.match(req);
                if (resp && resp.status === 200) {
                  await newCache.put(req, resp.clone());
                }
              }
            }
          } catch (_) {}
          await caches.delete(name);
        }
      }
    })()
  );
});

// 3. Fetch Event: Stale-While-Revalidate for images/avatars + Network-First for HTML/JS
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Bypass non-GET requests and browser extensions / internal schemes
  if (req.method !== 'GET' || !req.url.startsWith('http')) {
    return;
  }

  const url = new URL(req.url);

  // Never intercept live API routes, Firebase Firestore, or GitHub Raw JSON streams
  if (
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('raw.githubusercontent.com') ||
    url.pathname.endsWith('fardan_family_tree_backup.json')
  ) {
    return;
  }

  // Fast Stale-While-Revalidate for member photos (/avatars/* and images)
  if (req.destination === 'image' || url.pathname.startsWith('/avatars/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        let cachedResp = await cache.match(req);
        if (!cachedResp && url.pathname.startsWith('/avatars/')) {
          cachedResp = await caches.match(req, { ignoreSearch: true });
        }

        const fetchPromise = fetch(req)
          .then(async (networkResponse) => {
            if (
              (!networkResponse || networkResponse.status === 404) &&
              url.pathname.startsWith('/avatars/')
            ) {
              try {
                const rawAvatarResp = await fetch(`${GITHUB_RAW_PUBLIC}${url.pathname}?t=${Date.now()}`, {
                  cache: 'no-store'
                });
                if (rawAvatarResp && rawAvatarResp.ok) {
                  cache.put(req, rawAvatarResp.clone()).catch(() => {});
                  return rawAvatarResp;
                }
              } catch (_) {}
              if (cachedResp) {
                return cachedResp;
              }
            }
            if (networkResponse && networkResponse.status === 200) {
              cache.put(req, networkResponse.clone()).catch(() => {});
            }
            return networkResponse;
          })
          .catch(() => cachedResp);

        return cachedResp || fetchPromise;
      })
    );
    return;
  }

  // Network-First for application shell, scripts, and styles
  event.respondWith(
    fetch(req)
      .then(async (networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          (req.destination === 'document' ||
            req.destination === 'style' ||
            req.destination === 'script' ||
            req.destination === 'font')
        ) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, responseClone).catch(() => {});
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        const cached = await caches.match(req);
        if (cached) {
          return cached;
        }

        // For navigation requests, return cached root/index.html
        if (req.mode === 'navigate') {
          const fallback = await caches.match('/');
          if (fallback) return fallback;
        }

        return new Response('Offline - No connection', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({ 'Content-Type': 'text/plain; charset=utf-8' })
        });
      })
  );
});

// 4. Push Event: Handle incoming push payloads with family logo
self.addEventListener('push', (event) => {
  let data = {
    title: 'شجرة عائلة الفردان',
    body: 'إشعار جديد من شجرة عائلة الفردان',
    url: '/'
  };

  if (event.data) {
    try {
      const json = event.data.json();
      data = { ...data, ...json };
    } catch {
      data.body = event.data.text() || data.body;
    }
  }

  const options = {
    body: data.body,
    icon: '/logo.png',
    badge: '/logo.png',
    dir: 'rtl',
    lang: 'ar',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// 5. Notification Click Event: Focus or open window
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
