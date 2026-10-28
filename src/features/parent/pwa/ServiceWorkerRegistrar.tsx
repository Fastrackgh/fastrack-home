'use client';

import { useEffect } from 'react';

const SW_URL = '/parent-sw.js';
const SW_SCOPE = '/parent';

/**
 * Registers the parent portal's service worker in production builds. In
 * development an old registration would serve stale pages over hot reload,
 * so any existing one is removed instead.
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
    navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE }).catch(() => undefined);
  }, []);
  return null;
}
