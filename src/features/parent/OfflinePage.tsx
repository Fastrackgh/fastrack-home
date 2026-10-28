'use client';

import { Button, Center, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { WifiOff } from 'lucide-react';
import { parentRoutes } from './routes';

/** Served by the service worker for a page it has never saved, while offline. */
export function OfflinePage() {
  return (
    <Center mih="100dvh" px="md">
      <Stack align="center" ta="center" maw={360} gap="sm">
        <ThemeIcon size={64} radius="xl" variant="light" color="gray">
          <WifiOff size={30} />
        </ThemeIcon>
        <Title order={2}>You are offline</Title>
        <Text c="dimmed" size="sm">
          This page has not been saved on this device yet. Pages you have opened before still work
          offline. Connect to the internet to see the rest.
        </Text>
        <Button color="fastrackRed" onClick={() => window.location.reload()}>
          Try again
        </Button>
        <Button variant="subtle" color="gray" component="a" href={parentRoutes.home}>
          Go to home
        </Button>
      </Stack>
    </Center>
  );
}
