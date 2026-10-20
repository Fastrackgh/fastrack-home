'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { Button, Group, List, Modal, Paper, Text, ThemeIcon } from '@mantine/core';
import { Download, Share, Smartphone, SquarePlus } from 'lucide-react';

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

/** Chrome/Edge/Android's install event, which isn't in the DOM typings yet. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Captured once per page load: the event fires early, often before any
// component that wants it has mounted.
let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notify();
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

// iPadOS reports itself as a Mac with touch.
const isIos = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

type InstallMode = 'installed' | 'prompt' | 'ios' | 'unavailable';

/** How this browser can install the portal, if at all. */
export function useInstallMode(): { mode: InstallMode; install: () => Promise<void> } {
  const mode = useSyncExternalStore<InstallMode>(
    subscribe,
    () => {
      if (isStandalone()) return 'installed';
      if (deferredPrompt) return 'prompt';
      return isIos() ? 'ios' : 'unavailable';
    },
    () => 'unavailable',
  );
  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    notify();
  };
  return { mode, install };
}

const DISMISS_KEY = 'fastrack_parent_install_dismissed';

/** A card offering to install the app; hidden once installed, unsupported or dismissed. */
export function InstallCard({ dismissible = true }: { dismissible?: boolean }) {
  const { mode, install } = useInstallMode();
  const [dismissed, setDismissed] = useState(true);
  const [iosHelp, setIosHelp] = useState(false);

  useEffect(() => {
    try {
      setDismissed(dismissible && localStorage.getItem(DISMISS_KEY) === '1');
    } catch {
      setDismissed(false);
    }
  }, [dismissible]);

  if (dismissed || mode === 'installed' || mode === 'unavailable') return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // Shown again next visit.
    }
  };

  return (
    <>
      <Paper withBorder radius="lg" p="md">
        <Group wrap="nowrap" align="flex-start">
          <ThemeIcon size={40} radius="md" variant="light" color="fastrackRed">
            <Smartphone size={20} />
          </ThemeIcon>
          <div style={{ flex: 1 }}>
            <Text fw={700} size="sm">
              Install the Fastrack app
            </Text>
            <Text size="xs" c="dimmed">
              Open fees and reports from your home screen, even with a weak connection.
            </Text>
            <Group gap="xs" mt="sm">
              <Button
                size="xs"
                color="fastrackRed"
                leftSection={<Download size={14} />}
                onClick={mode === 'ios' ? () => setIosHelp(true) : install}
              >
                Install
              </Button>
              {dismissible && (
                <Button size="xs" variant="subtle" color="gray" onClick={dismiss}>
                  Not now
                </Button>
              )}
            </Group>
          </div>
        </Group>
      </Paper>
      <Modal
        opened={iosHelp}
        onClose={() => setIosHelp(false)}
        title="Add to Home Screen"
        radius="lg"
      >
        <List spacing="sm" size="sm" center>
          <List.Item icon={<Share size={16} />}>Tap the Share button in Safari.</List.Item>
          <List.Item icon={<SquarePlus size={16} />}>Choose “Add to Home Screen”.</List.Item>
          <List.Item icon={<Smartphone size={16} />}>
            Tap “Add”. Fastrack opens from your home screen like an app.
          </List.Item>
        </List>
      </Modal>
    </>
  );
}
