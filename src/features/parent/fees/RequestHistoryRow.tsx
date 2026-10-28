'use client';

import { Badge, Card, Group, Text } from '@mantine/core';
import { formatDate } from '../domain/format';
import { actionLabel, REQUEST_STATUS } from '../domain/optionalServices';
import type { OptionalFeeRequest } from '../types';

/** A request the school has answered, with its note. */
export function RequestHistoryRow({ request }: { request: OptionalFeeRequest }) {
  const status = REQUEST_STATUS[request.status];
  return (
    <Card withBorder radius="md" padding="sm">
      <Group justify="space-between" wrap="nowrap">
        <Text size="sm" fw={600} truncate>
          {actionLabel(request.action, request.feeTypeName.toLowerCase())}
        </Text>
        <Badge size="sm" variant="light" color={status.color}>
          {status.label}
        </Badge>
      </Group>
      <Text size="xs" c="dimmed">
        Asked {formatDate(request.createdAt)}
        {request.decidedAt ? ` · Decided ${formatDate(request.decidedAt)}` : ''}
      </Text>
      {request.staffNote && (
        <Text size="xs" mt={4}>
          School: {request.staffNote}
        </Text>
      )}
    </Card>
  );
}
