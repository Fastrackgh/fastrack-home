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
 * Each release has its own static cache. When the registrar reports a new
 * build ID, every page is saved again from the new release, and once that
 * has fully succeeded the older releases' files are removed (OFF-1).
 * API calls go to another origin and are never touched here; their offline
 * copies live in each user's IndexedDB (src/lib/offline), deleted at sign-out.
 * Pages hold no personal data (they render on the client), so caching them
 * is safe on a shared device.
 */
const VERSION = 'v1';
const PAGES = `school-pages-${VERSION}`;
const STATIC_PREFIX = `school-static-${VERSION}-`;
const ASSETS = `school-assets-${VERSION}`;
/** Holds the build ID whose pages are saved. */
const META = `school-meta-${VERSION}`;
const BUILD_KEY = '/__school-sw/build';
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

/** The build whose pages are saved ('' before the first), and one being saved now. */
let savedBuild = null;
let incomingBuild = null;

async function readSavedBuild() {
  if (savedBuild === null) {
    const stored = await (await caches.open(META)).match(BUILD_KEY);
    savedBuild = stored ? await stored.text() : '';
  }
  return savedBuild;
}

/** Where static files are written: the release being saved, else the saved one. */
async function staticCacheName() {
  return `${STATIC_PREFIX}${incomingBuild ?? ((await readSavedBuild()) || 'initial')}`;
}

/**
 * Keeps a page's HTML, but only once every script and style it names is on
 * the device. A page whose files didn't all download is not kept, so the
 * saved copy it would replace (with its own files) still works offline (OFF-2).
 */
async function keepPage(key, response) {
  const html = await response.clone().text();
  const urls = [...new Set([...html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+)"/g)].map((m) => m[1]))];
  const staticCache = await caches.open(await staticCacheName());
  const saved = await Promise.all(
    urls.map(async (url) => {
      if (await staticCache.match(url)) return true;
      // A file another release's cache holds is copied, since that cache may be pruned.
      const elsewhere = await caches.match(url);
      const saving = elsewhere ? staticCache.put(url, elsewhere) : staticCache.add(url);
      return saving.then(
        () => true,
        () => false,
      );
    }),
  );
  if (!saved.every(Boolean)) return false;
  await (await caches.open(PAGES)).put(key, response);
  return true;
}

/** Saves a page with its files. True when saved (or a redirect, which isn't kept). */
async function savePage(path) {
  try {
    const response = await fetch(path, { cache: 'reload', credentials: 'same-origin' });
    if (response.redirected) return true;
    if (!response.ok) return false;
    return await keepPage(pageKey(path), response);
  } catch {
    return false;
  }
}

/**
 * Saves the staff pages for `build`. For the build already saved, only pages
 * missing so far are fetched (visits keep the rest fresh). For a new build,
 * every page is saved again, one at a time so this doesn't compete with the
 * screen in use; only when all succeed does the build become the saved one
 * and the older releases' static files go. An offline or failed run keeps
 * them, so saved pages always have their files.
 */
async function savePages(paths, build) {
  const previous = await readSavedBuild();
  const isNew = Boolean(build) && build !== previous;
  if (isNew) incomingBuild = build;
  const pages = await caches.open(PAGES);
  let complete = true;
  for (const path of [OFFLINE_URL, ...paths]) {
    if (!isNew && (await pages.match(pageKey(path)))) continue;
    if (!(await savePage(path))) complete = false;
  }
  if (!isNew) return;
  incomingBuild = null;
  if (!complete) return;
  await (await caches.open(META)).put(BUILD_KEY, new Response(build));
  savedBuild = build;
  const current = await staticCacheName();
  const keys = await caches.keys();
  await Promise.all(
    keys.filter((key) => key.startsWith('school-static-') && key !== current).map((key) => caches.delete(key)),
  );
}

/** Page loads in several tabs each ask; runs go one after another. */
let saving = Promise.resolve();

async function precache() {
  const assets = await caches.open(ASSETS);
  await assets.addAll(PRECACHE_ASSETS).catch(() => undefined);
  await savePage(OFFLINE_URL);
}

self.addEventListener('install', (event) => {
  // The first install takes over at once; an update waits for the page's "Reload" (registrar).
  event.waitUntil(precache().then(() => (self.registration.active ? undefined : self.skipWaiting())));
});

self.addEventListener('activate', (event) => {
  const keep = (key) => [PAGES, ASSETS, META].includes(key) || key.startsWith(STATIC_PREFIX);
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key.startsWith('school-') && !keep(key)).map((key) => caches.delete(key))),
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
    const build = typeof message.buildId === 'string' ? message.buildId : '';
    saving = saving.then(() => savePages(paths, build)).catch(() => undefined);
    event.waitUntil(saving);
  }
});

async function networkFirstPage(event) {
  const cache = await caches.open(PAGES);
  const key = pageKey(event.request.url);
  try {
    const response = await fetch(event.request);
    if (response.ok && !response.redirected) {
      // Kept in the background, and only with all its files (keepPage).
      event.waitUntil(keepPage(key, response.clone()).catch(() => false));
    }
    return response;
  } catch {
    return (await cache.match(key)) ?? (await cache.match(OFFLINE_URL)) ?? Response.error();
  }
}

/** Static files are looked up in every release's cache, so pages of any saved release work. */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) (await caches.open(await staticCacheName())).put(request, response.clone());
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
    if (inScope(url.pathname)) event.respondWith(networkFirstPage(event));
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
