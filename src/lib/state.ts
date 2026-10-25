import type { Dispatch, SetStateAction } from 'react';

/**
 * Turns an object state's setter into a one-field setter that always updates
 * from the latest state, so two quick changes (fast typing, paste, autofill)
 * can't overwrite each other. Pass the value, not the event: read
 * `e.currentTarget.value` in the handler, before React reuses the event.
 */
export function fieldSetter<T extends object>(set: Dispatch<SetStateAction<T>>) {
  return <K extends keyof T>(key: K, value: T[K]) =>
    set((current) => ({ ...current, [key]: value }));
}

/** The same, for a state that is `null` until it loads; a field change before then is ignored. */
export function nullableFieldSetter<T extends object>(set: Dispatch<SetStateAction<T | null>>) {
  return <K extends keyof T>(key: K, value: T[K]) =>
    set((current) => (current ? { ...current, [key]: value } : current));
}
