'use client';

import { useEffect } from 'react';
import { Button, Group, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { staffPagePaths } from './staffPages';

const SW_URL = '/school-sw.js';
const SW_SCOPE = '/school-admin';
const UPDATE_NOTICE_ID = 'school-app-update';

/** This release's build ID (next.config.mjs), so the worker re-saves pages after a deploy. */
const BUILD_ID = process.env.FASTRACK_BUILD_ID ?? '';

/** Asks the service worker to save every staff page of this release for offline use. */
function precachePages(worker: ServiceWorker | null | undefined) {
  worker?.postMessage({ type: 'PRECACHE_PAGES', paths: staffPagePaths(), buildId: BUILD_ID });
}

/** "Update available": reloading lets the waiting version take over. */
function offerUpdate(waiting: ServiceWorker) {
  notifications.show({
    id: UPDATE_NOTICE_ID,
    color: 'blue',
    autoClose: false,
    title: 'Update available',
    message: (
      <Group justify="space-between" gap="xs" wrap="nowrap">
        <Text size="sm">A new version of Fastrack is ready.</Text>
        <Button size="compact-xs" onClick={() => waiting.postMessage({ type: 'SKIP_WAITING' })}>
          Reload
        </Button>
      </Group>
    ),
  });
}

/**
 * Registers the staff portal's service worker (public/school-sw.js) in
 * production builds, has it save every staff page, and offers a reload when
 * a new version is waiting. In development an old registration would serve
 * stale pages over hot reload, so any existing one is removed instead.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') {
      navigator.serviceWorker
        .getRegistration(SW_SCOPE)
        .then((registration) => registration?.unregister())
        .catch(() => undefined);
      return;
    }

    let reloading = false;
    const onControllerChange = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };
    const hadController = Boolean(navigator.serviceWorker.controller);

    navigator.serviceWorker
      .register(SW_URL, { scope: SW_SCOPE })
      .then((registration) => {
        // An update that takes over reloads the page onto it; the first install doesn't.
        if (hadController) {
          navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
        }
        if (registration.waiting && hadController) offerUpdate(registration.waiting);
        registration.addEventListener('updatefound', () => {
          const installing = registration.installing;
          installing?.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              offerUpdate(installing);
            }
          });
        });
        return navigator.serviceWorker.ready;
      })
      .then((ready) => precachePages(ready.active))
      .catch(() => undefined);

    return () => navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
  }, []);
  return null;
}
