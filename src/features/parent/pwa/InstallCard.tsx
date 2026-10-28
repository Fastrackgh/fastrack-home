'use client';

import { useEffect, useState } from 'react';
import { Button, Group, List, Modal, Paper, Text, ThemeIcon } from '@mantine/core';
import { Download, Share, Smartphone, SquarePlus } from 'lucide-react';
import { useInstallMode } from './installPrompt';

const DISMISS_KEY = 'fastrack_parent_install_dismissed';

/** Remembers that the parent said "Not now", on this device. */
function useDismissed(dismissible: boolean) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(dismissible && localStorage.getItem(DISMISS_KEY) === '1');
    } catch {
      setDismissed(false);
    }
  }, [dismissible]);

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // Shown again next visit.
    }
  };

  return { dismissed, dismiss };
}

/** A card offering to install the app; hidden once installed, unsupported or dismissed. */
export function InstallCard({ dismissible = true }: { dismissible?: boolean }) {
  const { mode, install } = useInstallMode();
  const { dismissed, dismiss } = useDismissed(dismissible);
  const [iosHelp, setIosHelp] = useState(false);

  if (dismissed || mode === 'installed' || mode === 'unavailable') return null;

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
      <IosInstallHelp opened={iosHelp} onClose={() => setIosHelp(false)} />
    </>
  );
}

/** Safari has no install prompt, so it gets the steps instead. */
function IosInstallHelp({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  return (
    <Modal opened={opened} onClose={onClose} title="Add to Home Screen" radius="lg">
      <List spacing="sm" size="sm" center>
        <List.Item icon={<Share size={16} />}>Tap the Share button in Safari.</List.Item>
        <List.Item icon={<SquarePlus size={16} />}>Choose “Add to Home Screen”.</List.Item>
        <List.Item icon={<Smartphone size={16} />}>
          Tap “Add”. Fastrack opens from your home screen like an app.
        </List.Item>
      </List>
    </Modal>
  );
}
