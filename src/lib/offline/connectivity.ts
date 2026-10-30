import { apiClient } from '@/lib/api-client';

/**
 * Whether the API can be reached, as the staff portal's offline features see
 * it. `navigator.onLine` alone isn't trusted (a school Wi-Fi with no internet
 * reports online): every API request reports whether it got an answer, which
 * is the real signal (`ApiError(0)` means it didn't). Going offline in the
 * browser is believed at once; coming back online waits for a request.
 */
export interface ConnectivityState {
  /** False once a request failed to reach the API, until one succeeds. */
  online: boolean;
  /** When the API last answered (this tab), or null before the first answer. */
  lastReachedAt: number | null;
  /** The oldest saved copy shown since going offline, or null if none is on screen. */
  oldestShownAt: number | null;
}

let state: ConnectivityState = {
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  lastReachedAt: null,
  oldestShownAt: null,
};
const listeners = new Set<() => void>();

function set(next: Partial<ConnectivityState>) {
  const merged = { ...state, ...next };
  if (
    merged.online === state.online &&
    merged.lastReachedAt === state.lastReachedAt &&
    merged.oldestShownAt === state.oldestShownAt
  ) {
    return;
  }
  state = merged;
  listeners.forEach((listener) => listener());
}

let started = false;

/** Starts listening to the API client and the browser (once per tab). */
export function startConnectivity() {
  if (started || typeof window === 'undefined') return;
  started = true;
  apiClient.onReachability((reachable) =>
    reachable
      ? set({ online: true, lastReachedAt: Date.now(), oldestShownAt: null })
      : set({ online: false }),
  );
  window.addEventListener('offline', () => set({ online: false }));
}

/** Records that a saved copy from `savedAt` is being shown in place of a live read. */
export function noteSavedCopyShown(savedAt: number) {
  set({
    online: false,
    oldestShownAt: state.oldestShownAt === null ? savedAt : Math.min(state.oldestShownAt, savedAt),
  });
}

export const connectivity = {
  get: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
