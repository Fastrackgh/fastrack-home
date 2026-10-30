'use client';

import { Button, Center, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { WifiOff } from 'lucide-react';
import { APP_ROUTES } from '@/lib/rbac';

/** Served by the staff service worker for a page it has never saved, while offline. */
export function OfflinePage() {
  return (
    <Center mih="100dvh" px="md">
      <Stack align="center" ta="center" maw={380} gap="sm">
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
        <Button variant="subtle" color="gray" component="a" href={APP_ROUTES.dashboard.path}>
          Go to overview
        </Button>
      </Stack>
    </Center>
  );
}
