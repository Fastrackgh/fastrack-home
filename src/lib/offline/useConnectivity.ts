'use client';

import { useSyncExternalStore } from 'react';
import { connectivity, type ConnectivityState } from './connectivity';

/** Server render and first paint assume online, so nothing flashes "Offline". */
const ASSUMED_ONLINE: ConnectivityState = { online: true, lastReachedAt: null, oldestShownAt: null };

export function useConnectivity(): ConnectivityState {
  return useSyncExternalStore(connectivity.subscribe, connectivity.get, () => ASSUMED_ONLINE);
}
