'use client';

import React from 'react';
import Link from 'next/link';
import {
  Alert,
  Button,
  Center,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { AlertCircle, CloudOff, UserPlus } from 'lucide-react';
import { ApiError } from '@/lib/api-client';
import { errorMessage } from '@/features/fees/notify';
import { useActiveWard } from './ActiveWardProvider';
import { formatAge } from './format';
import type { Ward } from './types';
import type { ParentQuery } from './useParentQuery';

export function PageTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <Group justify="space-between" align="flex-end" wrap="nowrap" mb="md">
      <div>
        <Title order={2} fz={{ base: 22, sm: 26 }} style={{ fontFamily: 'var(--font-heading)' }}>
          {title}
        </Title>
        {subtitle && (
          <Text size="sm" c="dimmed" mt={2}>
            {subtitle}
          </Text>
        )}
      </div>
      {action}
    </Group>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  message?: string;
  action?: React.ReactNode;
}) {
  return (
    <Paper withBorder radius="lg" p="xl">
      <Stack align="center" gap="xs" ta="center">
        <ThemeIcon size={48} radius="xl" variant="light" color="gray">
          {icon}
        </ThemeIcon>
        <Text fw={700}>{title}</Text>
        {message && (
          <Text size="sm" c="dimmed" maw={360}>
            {message}
          </Text>
        )}
        {action}
      </Stack>
    </Paper>
  );
}

/** Why a read failed, in words a parent can act on. */
export function readFailure(error: unknown): string {
  if (error instanceof ApiError && error.statusCode === 404) {
    return 'This is not available yet. Your school may not have published it.';
  }
  if (error instanceof ApiError && error.statusCode === 403) {
    return 'Your school has not turned this on for parents.';
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return 'You are offline. Connect to the internet and try again.';
  }
  return errorMessage(error, 'Something went wrong. Try again.');
}

/**
 * Renders a query's data, with a loader before anything is known, an error
 * with retry when nothing could be shown, and a note when showing an offline copy.
 */
export function QueryView<T>({
  query,
  children,
  empty,
}: {
  query: ParentQuery<T>;
  children: (data: T) => React.ReactNode;
  /** Shown instead of `children` when this returns true for the data. */
  empty?: { when: (data: T) => boolean; render: () => React.ReactNode };
}) {
  const { data, error, loading, stale, savedAt, reload } = query;
  if (data === undefined) {
    if (loading) {
      return (
        <Center py={48}>
          <Loader color="fastrackRed" />
        </Center>
      );
    }
    return (
      <Alert color="red" radius="md" icon={<AlertCircle size={16} />} title="Could not load">
        <Stack gap="xs" align="flex-start">
          <Text size="sm">{readFailure(error)}</Text>
          <Button size="xs" variant="light" color="red" onClick={reload}>
            Try again
          </Button>
        </Stack>
      </Alert>
    );
  }
  return (
    <>
      {stale && !loading && savedAt && (
        <Group gap={6} mb="sm" c="dimmed">
          <CloudOff size={14} />
          <Text size="xs">
            Showing a saved copy from {formatAge(savedAt)}.{' '}
            <Text span size="xs" c="fastrackRed" style={{ cursor: 'pointer' }} onClick={reload}>
              Refresh
            </Text>
          </Text>
        </Group>
      )}
      {empty?.when(data) ? empty.render() : children(data)}
    </>
  );
}

/** Renders `children` for the selected child, or asks the parent to link one. */
export function WithWard({ children }: { children: (ward: Ward) => React.ReactNode }) {
  const { activeWard, query } = useActiveWard();
  return (
    <QueryView
      query={query}
      empty={{
        when: () => activeWard === null,
        render: () => (
          <EmptyState
            icon={<UserPlus size={22} />}
            title="Link your child"
            message="Add your child with the student code from the school. We will send a code to the guardian phone or email on file to confirm."
            action={
              <Button component={Link} href="/parent/wards/link" color="fastrackRed" mt="xs">
                Link a child
              </Button>
            }
          />
        ),
      }}
    >
      {() => (activeWard ? children(activeWard) : null)}
    </QueryView>
  );
}
