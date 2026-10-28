'use client';

import { Badge, Button, Card, Group, Text } from '@mantine/core';
import { formatDate } from '../domain/format';
import { actionLabel, nextAction, REQUEST_STATUS, servicePrice } from '../domain/optionalServices';
import type { OptionalFeeRequest, OptionalFeeRequestAction, OptionalService } from '../types';

/** One optional service: whether the ward takes it, its price, and its pending request. */
export function ServiceCard({
  service,
  disabled,
  onAsk,
  onCancel,
}: {
  service: OptionalService;
  disabled: boolean;
  onAsk: (action: OptionalFeeRequestAction) => void;
  onCancel: (request: OptionalFeeRequest) => void;
}) {
  return (
    <Card withBorder radius="lg" padding="md">
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <div style={{ minWidth: 0 }}>
          <Group gap={6}>
            <Text fw={700}>{service.name}</Text>
            <Badge size="sm" variant="light" color={service.enrolled ? 'green' : 'gray'}>
              {service.enrolled ? 'Taking' : 'Not taking'}
            </Badge>
          </Group>
          {service.description && (
            <Text size="xs" c="dimmed">
              {service.description}
            </Text>
          )}
        </div>
        <Text fw={700} size="sm" style={{ whiteSpace: 'nowrap' }}>
          {servicePrice(service)}
        </Text>
      </Group>
      {service.pendingRequest ? (
        <PendingRequest
          request={service.pendingRequest}
          serviceName={service.name}
          disabled={disabled}
          onCancel={onCancel}
        />
      ) : (
        <Button
          mt="sm"
          size="xs"
          variant="light"
          color={service.enrolled ? 'gray' : 'fastrackRed'}
          disabled={disabled}
          onClick={() => onAsk(nextAction(service))}
        >
          {service.enrolled ? 'Ask to stop' : 'Ask to start'}
        </Button>
      )}
    </Card>
  );
}

function PendingRequest({
  request,
  serviceName,
  disabled,
  onCancel,
}: {
  request: OptionalFeeRequest;
  serviceName: string;
  disabled: boolean;
  onCancel: (request: OptionalFeeRequest) => void;
}) {
  return (
    <Group justify="space-between" mt="sm" wrap="nowrap">
      <Group gap={6}>
        <Badge size="sm" variant="light" color={REQUEST_STATUS.PENDING.color}>
          {REQUEST_STATUS.PENDING.label}
        </Badge>
        <Text size="xs" c="dimmed">
          {actionLabel(request.action, serviceName.toLowerCase())}, asked{' '}
          {formatDate(request.createdAt)}
        </Text>
      </Group>
      {request.isMine && (
        <Button
          size="xs"
          variant="subtle"
          color="gray"
          disabled={disabled}
          onClick={() => onCancel(request)}
        >
          Cancel
        </Button>
      )}
    </Group>
  );
}
