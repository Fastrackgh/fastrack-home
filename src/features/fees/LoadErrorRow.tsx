'use client';

import { Button, Stack, Table, Text } from '@mantine/core';
import { AlertCircle } from 'lucide-react';

/** A table row saying the list failed to load, with a retry, so a failure never reads as empty. */
export function LoadErrorRow({
  colSpan,
  message,
  onRetry,
}: {
  colSpan: number;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <Table.Tr>
      <Table.Td colSpan={colSpan}>
        <Stack align="center" py="xl" gap={6}>
          <AlertCircle size={22} color="var(--mantine-color-red-6)" />
          <Text size="sm" c="red">
            {message}
          </Text>
          {onRetry && (
            <Button size="xs" variant="light" color="red" onClick={onRetry}>
              Try again
            </Button>
          )}
        </Stack>
      </Table.Td>
    </Table.Tr>
  );
}
