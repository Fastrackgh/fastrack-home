'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Center, Group, Loader, Paper, Stack, Text, Title } from '@mantine/core';
import { useAuth } from '@/lib/auth';
import { landingPathFor, safeRedirectTarget } from '@/lib/rbac';
import classes from './auth.module.css';

/** The branded page around the sign-in and sign-up forms. */
export function AuthFrame({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <Box mih="100dvh" px="md" py={48} className={classes.frame}>
      <Stack maw={420} mx="auto" gap="lg">
        <Group gap={8}>
          <Box
            component="img"
            src="/parent-app/icon-192.png"
            alt=""
            w={40}
            h={40}
            className={classes.logo}
          />
          <Text fw={800} size="lg" className="font-heading">
            Fastrack{' '}
            <Text span c="fastrackRed" inherit>
              Parent
            </Text>
          </Text>
        </Group>
        <div>
          <Title order={1} fz={28}>
            {title}
          </Title>
          <Text c="dimmed" size="sm" mt={4}>
            {subtitle}
          </Text>
        </div>
        <Paper withBorder radius="lg" p="lg" shadow="sm">
          {children}
        </Paper>
      </Stack>
    </Box>
  );
}

/** Shown while a signed-in visitor is sent on. */
export function AuthPending() {
  return (
    <Center h="100dvh">
      <Loader color="fastrackRed" />
    </Center>
  );
}

/**
 * Sends a signed-in visitor on to where they were going, or to their own
 * landing page. True while that is pending, so the form isn't shown.
 */
export function useLeaveWhenSignedIn() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  useEffect(() => {
    if (isLoading || !user) return;
    const next = new URLSearchParams(window.location.search).get('next');
    router.replace(safeRedirectTarget(next, user) ?? landingPathFor(user.role));
  }, [isLoading, user, router]);
  return isLoading || user !== null;
}
