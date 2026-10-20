/*
 * Service worker for the parent portal (scope /parent). It makes the
 * installed app open without a network:
 *   - pages: network first, then the last copy, then /parent/offline
 *   - /_next/static (content-hashed): cache first
 *   - icons, fonts and images: stale while revalidate
 * API calls go to another origin and are never touched here; the portal keeps
 * its own per-user offline copies of reads, cleared on sign-out. Pages hold no
 * personal data (they render on the client), so caching them is safe on a
 * shared device.
 */
const VERSION = 'v1';
const PAGES = `parent-pages-${VERSION}`;
const STATIC = `parent-static-${VERSION}`;
const ASSETS = `parent-assets-${VERSION}`;
const OFFLINE_URL = '/parent/offline';
const PRECACHE = [
  OFFLINE_URL,
  '/parent-app/manifest.webmanifest',
  '/parent-app/icon-192.png',
  '/parent-app/icon-512.png',
];

/** The offline page plus the scripts and styles it needs, read from its HTML. */
async function precache() {
  const pages = await caches.open(PAGES);
  const assets = await caches.open(ASSETS);
  await assets.addAll(PRECACHE.slice(1));
  const response = await fetch(OFFLINE_URL, { cache: 'reload' });
  if (!response.ok) return;
  await pages.put(OFFLINE_URL, response.clone());
  const html = await response.text();
  const urls = [...html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+)"/g)].map((m) => m[1]);
  const staticCache = await caches.open(STATIC);
  await Promise.all(urls.map((url) => staticCache.add(url).catch(() => undefined)));
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  const keep = new Set([PAGES, STATIC, ASSETS]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key.startsWith('parent-') && !keep.has(key)).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

async function networkFirstPage(request) {
  const cache = await caches.open(PAGES);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) ?? (await cache.match(OFFLINE_URL)) ?? Response.error();
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(ASSETS);
  const cached = await cache.match(request);
  const fresh = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached ?? Response.error());
  return cached ?? fresh;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    if (url.pathname === '/parent' || url.pathname.startsWith('/parent/')) {
      event.respondWith(networkFirstPage(request));
    }
    return;
  }
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request));
    return;
  }
  if (url.pathname.startsWith('/parent-app/') || request.destination === 'image' || request.destination === 'font') {
    event.respondWith(staleWhileRevalidate(request));
  }
});
