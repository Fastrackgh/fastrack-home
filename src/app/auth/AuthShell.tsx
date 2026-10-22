'use client';

import React from 'react';
import { Box, Card, Stack, Text, Title } from '@mantine/core';
import { BrandLogo } from '@/components/atoms';

/** Login pages for each audience; a `?portal=parent` link returns to the parent one. */
export const SIGN_IN_PATHS = {
  staff: '/school-admin/login',
  parent: '/parent/login',
} as const;

export type Portal = keyof typeof SIGN_IN_PATHS;

export const portalFrom = (value: string | null): Portal =>
  value === 'parent' ? 'parent' : 'staff';

/** The centred card the account pages (setup, forgot, reset password) share. */
export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <Box
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: '#f8fafc',
      }}
    >
      {title ? (
        <Card withBorder radius="lg" padding="xl" w="100%" maw={420}>
          <Stack gap="md">
            <BrandLogo />
            <Box>
              <Title order={3} style={{ fontFamily: 'var(--font-heading)' }}>
                {title}
              </Title>
              {subtitle && (
                <Text size="sm" c="dimmed">
                  {subtitle}
                </Text>
              )}
            </Box>
            {children}
          </Stack>
        </Card>
      ) : (
        children
      )}
    </Box>
  );
}
