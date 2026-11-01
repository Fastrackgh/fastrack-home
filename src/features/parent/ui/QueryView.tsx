'use client';

import React from 'react';
import { Center, Group, Loader, Stack, Text } from '@mantine/core';
import { CloudOff } from 'lucide-react';
import type { ParentQuery } from '../data/useParentQuery';
import { notOffered, readFailure } from '../domain/errors';
import { formatAge } from '../domain/format';
import { NotOfferedState } from './EmptyState';
import { ErrorAlert, RetryButton } from './ErrorAlert';

export function PageLoader() {
  return (
    <Center py={48}>
      <Loader color="fastrackRed" />
    </Center>
  );
}

/** Says the screen shows an offline copy, with a way to fetch it again. */
function StaleNote({ savedAt, onRefresh }: { savedAt: number; onRefresh: () => void }) {
  return (
    <Group gap={6} mb="sm" c="dimmed">
      <CloudOff size={14} />
      <Text size="xs">
        Showing a saved copy from {formatAge(savedAt)}.{' '}
        <Text span size="xs" c="fastrackRed" style={{ cursor: 'pointer' }} onClick={onRefresh}>
          Refresh
        </Text>
      </Text>
    </Group>
  );
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
    if (loading) return <PageLoader />;
    if (notOffered(error)) return <NotOfferedState />;
    return (
      <ErrorAlert title="Could not load">
        <Stack gap="xs" align="flex-start">
          <Text size="sm">{readFailure(error)}</Text>
          <RetryButton onClick={reload} />
        </Stack>
      </ErrorAlert>
    );
  }
  return (
    <>
      {stale && !loading && savedAt && <StaleNote savedAt={savedAt} onRefresh={reload} />}
      {empty?.when(data) ? empty.render() : children(data)}
    </>
  );
}
