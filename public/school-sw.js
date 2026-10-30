/*
 * Service worker for the staff school portal (scope /school-admin), built
 * from the parent portal's strategies (public/parent-sw.js). It lets the
 * portal load and move between screens with no network:
 *   - pages: network first, then the saved copy of that path (any query),
 *     then /school-admin/offline
 *   - /_next/static (content-hashed): cache first
 *   - icons, fonts and images: stale while revalidate
 * Every staff page is saved up front, with the scripts and styles its HTML
 * names, because offline Next turns a link to a screen whose code isn't
 * loaded into a full page load. The page list comes from the app (the
 * registrar posts APP_ROUTES), so it can't drift from the routes.
 * API calls go to another origin and are never touched here; their offline
 * copies live in each user's IndexedDB (src/lib/offline), deleted at sign-out.
 * Pages hold no personal data (they render on the client), so caching them
 * is safe on a shared device.
 */
const VERSION = 'v1';
const PAGES = `school-pages-${VERSION}`;
const STATIC = `school-static-${VERSION}`;
const ASSETS = `school-assets-${VERSION}`;
const SCOPE = '/school-admin';
const OFFLINE_URL = '/school-admin/offline';
const PRECACHE_ASSETS = [
  '/school-app/manifest.webmanifest',
  '/school-app/icon-192.png',
  '/school-app/icon-512.png',
];

/** A page's cache key: its path, since pages render the query on the client. */
const pageKey = (url) => new URL(url, self.location.origin).pathname;

const inScope = (pathname) => pathname === SCOPE || pathname.startsWith(`${SCOPE}/`);

/** Saves a page and the scripts and styles its HTML names. */
async function savePage(path) {
  const response = await fetch(path, { cache: 'reload', credentials: 'same-origin' });
  if (!response.ok || response.redirected) return;
  const pages = await caches.open(PAGES);
  await pages.put(pageKey(path), response.clone());
  const html = await response.text();
  const urls = [...html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+)"/g)].map((m) => m[1]);
  const staticCache = await caches.open(STATIC);
  await Promise.all(
    [...new Set(urls)].map(async (url) => {
      if (await staticCache.match(url)) return;
      await staticCache.add(url).catch(() => undefined);
    }),
  );
}

async function precache() {
  const assets = await caches.open(ASSETS);
  await assets.addAll(PRECACHE_ASSETS).catch(() => undefined);
  await savePage(OFFLINE_URL).catch(() => undefined);
}

self.addEventListener('install', (event) => {
  // The first install takes over at once; an update waits for the page's "Reload" (registrar).
  event.waitUntil(precache().then(() => (self.registration.active ? undefined : self.skipWaiting())));
});

self.addEventListener('activate', (event) => {
  const keep = new Set([PAGES, STATIC, ASSETS]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key.startsWith('school-') && !keep.has(key)).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  const message = event.data || {};
  if (message.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }
  if (message.type === 'PRECACHE_PAGES' && Array.isArray(message.paths)) {
    const paths = message.paths.filter((path) => typeof path === 'string' && inScope(path));
    // Pages already saved are kept (visits refresh them); the rest are saved one at a
    // time, so this doesn't compete with the screen being used on a slow connection.
    event.waitUntil(
      caches.open(PAGES).then((pages) =>
        paths.reduce(
          (done, path) =>
            done.then(async () => {
              if (await pages.match(pageKey(path))) return;
              await savePage(path).catch(() => undefined);
            }),
          Promise.resolve(),
        ),
      ),
    );
  }
});

async function networkFirstPage(request) {
  const cache = await caches.open(PAGES);
  const key = pageKey(request.url);
  try {
    const response = await fetch(request);
    if (response.ok && !response.redirected) cache.put(key, response.clone());
    return response;
  } catch {
    return (await cache.match(key)) ?? (await cache.match(OFFLINE_URL)) ?? Response.error();
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
    if (inScope(url.pathname)) event.respondWith(networkFirstPage(request));
    return;
  }
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request));
    return;
  }
  if (url.pathname.startsWith('/school-app/') || request.destination === 'image' || request.destination === 'font') {
    event.respondWith(staleWhileRevalidate(request));
  }
});
