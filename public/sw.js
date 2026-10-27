/**
 * Bricktrack service worker.
 *
 * Goal: the catalog stays readable in the cellar, in the shop, and wherever
 * else the phone loses its connection. Anything that changes data still needs
 * the network - a wish reserved offline would be a lie.
 *
 * Caches are versioned; bumping VERSION drops the old ones on activation.
 */
const VERSION = 'v1';
const PAGE_CACHE = `bricktrack-pages-${VERSION}`;
const ASSET_CACHE = `bricktrack-assets-${VERSION}`;
const IMAGE_CACHE = `bricktrack-images-${VERSION}`;
const OFFLINE_URL = '/offline';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(PAGE_CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL, '/manifest.webmanifest']))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  const keep = new Set([PAGE_CACHE, ASSET_CACHE, IMAGE_CACHE]);

  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => !keep.has(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

/**
 * Signing out must not leave readable pages behind on a shared device, so the
 * app tells the worker to drop everything it holds.
 */
self.addEventListener('message', (event) => {
  if (event.data === 'bricktrack:clear-cache') {
    event.waitUntil(caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key)))));
  }
});

/** Long-lived, content-addressed build output. */
function isStaticAsset(url) {
  return url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/');
}

/** Set pictures; their file names contain a UUID and never change. */
function isCacheableImage(url) {
  return url.pathname.startsWith('/api/files/images/');
}

/** Everything that must never be answered from a cache. */
function isNeverCached(url) {
  return (
    url.pathname.startsWith('/api/auth/') ||
    url.pathname.startsWith('/api/export/') ||
    url.pathname.startsWith('/api/missing-parts/') ||
    url.pathname.startsWith('/api/health')
  );
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;

  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

/**
 * Network first, cache as a fallback: the catalog is always current when there
 * is a connection, and still readable when there is not.
 */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    const hit = await cache.match(request);
    if (hit) return hit;

    if (request.mode === 'navigate') {
      const offline = await cache.match(OFFLINE_URL);
      if (offline) return offline;
    }
    throw error;
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only plain GETs are safe to serve from a cache.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isNeverCached(url)) return;

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
    return;
  }

  if (isCacheableImage(url)) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }

  // Page loads and the RSC payloads behind client-side navigation.
  if (request.mode === 'navigate' || url.searchParams.has('_rsc')) {
    event.respondWith(networkFirst(request, PAGE_CACHE));
  }
});
