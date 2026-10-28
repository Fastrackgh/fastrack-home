'use client';

import { useSyncExternalStore } from 'react';

/** Chrome/Edge/Android's install event, which isn't in the DOM typings yet. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type InstallMode = 'installed' | 'prompt' | 'ios' | 'unavailable';

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

// iPadOS reports itself as a Mac with touch.
const isIos = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/**
 * Holds the browser's install prompt. It is captured once per page load,
 * since the event fires early, often before any component that wants it has
 * mounted; components read it through `useSyncExternalStore`.
 */
class InstallPromptStore {
  private deferred: BeforeInstallPromptEvent | null = null;
  private readonly listeners = new Set<() => void>();

  constructor() {
    if (typeof window === 'undefined') return;
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      this.set(event as BeforeInstallPromptEvent);
    });
    window.addEventListener('appinstalled', () => this.set(null));
  }

  private set(prompt: BeforeInstallPromptEvent | null) {
    this.deferred = prompt;
    this.listeners.forEach((listener) => listener());
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /** How this browser can install the portal, if at all. */
  mode = (): InstallMode => {
    if (isStandalone()) return 'installed';
    if (this.deferred) return 'prompt';
    return isIos() ? 'ios' : 'unavailable';
  };

  install = async () => {
    if (!this.deferred) return;
    await this.deferred.prompt();
    await this.deferred.userChoice;
    this.set(null);
  };
}

const installPrompt = new InstallPromptStore();

export function useInstallMode(): { mode: InstallMode; install: () => Promise<void> } {
  const mode = useSyncExternalStore(
    installPrompt.subscribe,
    installPrompt.mode,
    () => 'unavailable' as const,
  );
  return { mode, install: installPrompt.install };
}
