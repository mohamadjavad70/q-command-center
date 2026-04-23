// Q Network — Service Worker v2.0 (QPN Offline Layer)
// شورای نور: ناسا (offline) + تسلا (کارایی) + برنامه‌نویس خبره

const CACHE_NAME   = 'q-network-v2';
const STATIC_CACHE = 'q-static-v2';
const API_CACHE    = 'q-api-v2';

// فایل‌های اصلی که باید آفلاین در دسترس باشند
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/q-being.html',
  '/qos',
  '/manifest.json',
];

// CDN‌هایی که کش می‌شوند (Three.js, fonts)
const CDN_CACHE = 'q-cdn-v2';
const CDN_ORIGINS = [
  'cdnjs.cloudflare.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
];

// API endpointهایی که GET آن‌ها کش می‌شود
const CACHEABLE_API_PATHS = ['/health', '/health/security', '/health/runtime'];

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
  const KEEP = [CACHE_NAME, STATIC_CACHE, CDN_CACHE, API_CACHE];
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

  // Skip non-GET: handle mutations with offline queue
  if (event.request.method !== 'GET') {
    event.respondWith(handleMutationRequest(event.request));
    return;
  }
  if (url.protocol === 'chrome-extension:') return;

  // Cacheable API GETs: network-first with API cache
  if (CACHEABLE_API_PATHS.some((p) => url.pathname.startsWith(p))) {
    event.respondWith(networkFirstWithCache(event.request, API_CACHE));
    return;
  }

  // API calls: network-first (no cache for dynamic data)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(
          JSON.stringify({ error: 'OFFLINE', message: 'Q is offline. حافظه محلی استفاده می‌شود.' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
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

// ── Background sync ────────────────────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'q-memory-sync' || event.tag === 'qpn-sync') {
    event.waitUntil(notifyClientsToReplayQueue());
  }
});

// ── QPN: Offline Mutation Queue ───────────────────────────────────
async function handleMutationRequest(request) {
  try {
    return await fetch(request);
  } catch {
    // آفلاین: درخواست را در صف ذخیره کن از طریق postMessage
    const body = await request.text().catch(() => '');
    const entry = {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body,
      timestamp: Date.now(),
    };
    const clients = await self.clients.matchAll({ includeUncontrolled: true });
    clients.forEach((c) => c.postMessage({ type: 'QPN_QUEUE_REQUEST', payload: entry }));
    return new Response(
      JSON.stringify({ status: 'queued', offline: true, message: 'آفلاین — پس از اتصال sync می‌شود' }),
      { status: 202, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function networkFirstWithCache(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached ?? new Response(
      JSON.stringify({ error: 'OFFLINE' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function notifyClientsToReplayQueue() {
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  clients.forEach((c) => c.postMessage({ type: 'QPN_REPLAY_QUEUE' }));
}

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
