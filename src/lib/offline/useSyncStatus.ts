'use client';

import { useSyncExternalStore } from 'react';
import { syncStatus, type SyncStatus } from './syncEngine';

/** The outbox's counts and state; idle on the server and before the store opens. */
export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(syncStatus.subscribe, syncStatus.get, syncStatus.getIdle);
}
