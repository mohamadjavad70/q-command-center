// Q Network — Service Worker v1.0
// شورای نور: ناسا (offline) + تسلا (کارایی) + برنامه‌نویس خبره

const CACHE_NAME   = 'q-network-v1';
const STATIC_CACHE = 'q-static-v1';

// فایل‌های اصلی که باید آفلاین در دسترس باشند
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/q-being.html',
  '/qos',
  '/manifest.json',
];

// CDN‌هایی که کش می‌شوند (Three.js, fonts)
const CDN_CACHE = 'q-cdn-v1';
const CDN_ORIGINS = [
  'cdnjs.cloudflare.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
];

// ── Install: pre-cache static assets ──────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        // Non-fatal: some assets might not exist yet
        console.warn('[Q-SW] Pre-cache warning:', err);
      });
    }).then(() => {
      return self.skipWaiting(); // Activate immediately
    })
  );
});

// ── Activate: clean old caches ────────────────────────────────────
self.addEventListener('activate', (event) => {
  const KEEP = [CACHE_NAME, STATIC_CACHE, CDN_CACHE];
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => !KEEP.includes(key))
          .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// ── Fetch: cache-first for static, network-first for API ──────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests and chrome-extension
  if (event.request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;

  // API calls: network-first (don't cache)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(
          JSON.stringify({ error: 'offline', message: 'Q is offline. حافظه محلی استفاده می‌شود.' }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // CDN assets: cache-first
  if (CDN_ORIGINS.some((o) => url.hostname.includes(o))) {
    event.respondWith(
      caches.open(CDN_CACHE).then((cache) =>
        cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((response) => {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          });
        })
      )
    );
    return;
  }

  // App shell + static: stale-while-revalidate
  event.respondWith(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.match(event.request).then((cached) => {
        const networkFetch = fetch(event.request)
          .then((response) => {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          })
          .catch(() => cached); // fallback to cached on network failure

        return cached || networkFetch;
      })
    )
  );
});

// ── Background sync (for future use) ─────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'q-memory-sync') {
    // Future: sync localStorage memory to backend
    console.log('[Q-SW] Background sync: memory');
  }
});

// ── Push notifications (for future use) ──────────────────────────
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'Q Network', {
      body:    data.body  || 'پیام جدید از Q',
      icon:    '/icons/icon-192.png',
      badge:   '/icons/icon-192.png',
      vibrate: [100, 50, 100],
      data:    { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  );
});
