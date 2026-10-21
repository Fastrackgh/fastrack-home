'use client';

import { useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Modal,
  Stack,
  Text,
  Textarea,
  Title,
} from '@mantine/core';
import { useNetwork } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { AlertCircle, Bus, Info } from 'lucide-react';
import { errorMessage } from '@/features/fees/notify';
import { formatGhs } from '@/features/fees/money';
import { parentApi } from '../api';
import { EmptyState, QueryView } from '../components';
import { formatDate } from '../format';
import type {
  OptionalFeeRequest,
  OptionalFeeRequestAction,
  OptionalFeeRequestStatus,
  OptionalService,
  Ward,
} from '../types';
import { useParentQuery } from '../useParentQuery';

const REQUEST_STATUS: Record<OptionalFeeRequestStatus, { label: string; color: string }> = {
  PENDING: { label: 'Waiting for school', color: 'yellow' },
  APPROVED: { label: 'Approved', color: 'green' },
  DECLINED: { label: 'Declined', color: 'red' },
  CANCELLED: { label: 'Cancelled', color: 'gray' },
};

const actionLabel = (action: OptionalFeeRequestAction, name: string) =>
  action === 'OPT_IN' ? `Start ${name}` : `Stop ${name}`;

/**
 * Optional services (bus, feeding, ...) the ward's school offers. Parents can't
 * change a bill; they ask, the school approves, and the change shows on the
 * next bill the school creates.
 */
export function OptionalServices({ ward }: { ward: Ward }) {
  const services = useParentQuery(`optional-services:${ward.studentId}`, () =>
    parentApi.listOptionalServices(ward.studentId),
  );
  const history = useParentQuery(`optional-fee-requests:${ward.studentId}`, () =>
    parentApi.listOptionalFeeRequests(ward.studentId),
  );
  const [asking, setAsking] = useState<{
    service: OptionalService;
    action: OptionalFeeRequestAction;
  } | null>(null);
  const { online } = useNetwork();

  const refresh = () => {
    services.reload();
    history.reload();
  };

  const cancel = async (request: OptionalFeeRequest) => {
    try {
      await parentApi.cancelOptionalFeeRequest(ward.studentId, request.id);
      notifications.show({ message: 'Request cancelled.', color: 'gray' });
    } catch (err) {
      notifications.show({
        title: 'Could not cancel',
        message: errorMessage(err, 'Try again.'),
        color: 'red',
      });
    }
    refresh();
  };

  return (
    <Stack gap="md">
      <Alert color="blue" variant="light" radius="md" icon={<Info size={16} />}>
        Ask the school to start or stop a service. Once the school approves, the change shows on the
        next bill. Bills already issued stay the same.
      </Alert>
      <QueryView
        query={services}
        empty={{
          when: (result) => result.services.length === 0,
          render: () => (
            <EmptyState
              icon={<Bus size={22} />}
              title="No optional services"
              message="The school has not listed any optional services yet."
            />
          ),
        }}
      >
        {(result) => (
          <Stack gap="sm">
            {(result.termLabel || result.className) && (
              <Text size="xs" c="dimmed">
                Prices for {[result.className, result.termLabel].filter(Boolean).join(', ')}
              </Text>
            )}
            {!result.canRequest && (
              <Alert color="yellow" radius="md" icon={<AlertCircle size={16} />}>
                The school isn&apos;t taking requests right now.
              </Alert>
            )}
            {result.services.map((service) => (
              <ServiceCard
                key={service.feeTypeId}
                service={service}
                disabled={!result.canRequest || !online}
                onAsk={(action) => setAsking({ service, action })}
                onCancel={cancel}
              />
            ))}
          </Stack>
        )}
      </QueryView>

      <QueryView query={history}>
        {(requests) => {
          const decided = requests.filter((r) => r.status !== 'PENDING');
          if (decided.length === 0) return null;
          return (
            <Stack gap="xs" mt="sm">
              <Title order={4} fz="md">
                Past requests
              </Title>
              {decided.slice(0, 10).map((request) => (
                <HistoryRow key={request.id} request={request} />
              ))}
            </Stack>
          );
        }}
      </QueryView>

      {asking && (
        <RequestModal
          ward={ward}
          service={asking.service}
          action={asking.action}
          onClose={() => setAsking(null)}
          onSent={() => {
            setAsking(null);
            refresh();
          }}
        />
      )}
    </Stack>
  );
}

function ServiceCard({
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
  const pending = service.pendingRequest;
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
          {service.amount === null ? 'Price not set' : `${formatGhs(service.amount)} / term`}
        </Text>
      </Group>
      {pending ? (
        <Group justify="space-between" mt="sm" wrap="nowrap">
          <Group gap={6}>
            <Badge size="sm" variant="light" color={REQUEST_STATUS.PENDING.color}>
              {REQUEST_STATUS.PENDING.label}
            </Badge>
            <Text size="xs" c="dimmed">
              {actionLabel(pending.action, service.name.toLowerCase())}, asked{' '}
              {formatDate(pending.createdAt)}
            </Text>
          </Group>
          {pending.isMine && (
            <Button
              size="xs"
              variant="subtle"
              color="gray"
              disabled={disabled}
              onClick={() => onCancel(pending)}
            >
              Cancel
            </Button>
          )}
        </Group>
      ) : (
        <Button
          mt="sm"
          size="xs"
          variant="light"
          color={service.enrolled ? 'gray' : 'fastrackRed'}
          disabled={disabled}
          onClick={() => onAsk(service.enrolled ? 'OPT_OUT' : 'OPT_IN')}
        >
          {service.enrolled ? 'Ask to stop' : 'Ask to start'}
        </Button>
      )}
    </Card>
  );
}

function HistoryRow({ request }: { request: OptionalFeeRequest }) {
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

function RequestModal({
  ward,
  service,
  action,
  onClose,
  onSent,
}: {
  ward: Ward;
  service: OptionalService;
  action: OptionalFeeRequestAction;
  onClose: () => void;
  onSent: () => void;
}) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      await parentApi.requestOptionalService(ward.studentId, {
        feeTypeId: service.feeTypeId,
        action,
        note: note.trim() || undefined,
      });
      notifications.show({
        message: 'Request sent. The school will review it.',
        color: 'green',
      });
      onSent();
    } catch (err) {
      setError(errorMessage(err, 'Could not send the request. Try again.'));
      setBusy(false);
    }
  };

  return (
    <Modal
      opened
      onClose={onClose}
      title={action === 'OPT_IN' ? `Start ${service.name}` : `Stop ${service.name}`}
      radius="lg"
      centered
    >
      <Stack>
        <Text size="sm" c="dimmed">
          {action === 'OPT_IN'
            ? `Once the school approves, ${service.name}${
                service.amount !== null ? ` (${formatGhs(service.amount)} a term)` : ''
              } is added from the next bill.`
            : `Once the school approves, ${service.name} is left off the next bill.`}
        </Text>
        {error && (
          <Alert color="red" radius="md" icon={<AlertCircle size={16} />}>
            {error}
          </Alert>
        )}
        <Textarea
          label="Note for the school (optional)"
          placeholder={
            action === 'OPT_IN' ? 'For example, the pick-up area' : 'For example, the reason'
          }
          maxLength={500}
          autosize
          minRows={2}
          value={note}
          onChange={(event) => setNote(event.currentTarget.value)}
        />
        <Button color="fastrackRed" loading={busy} onClick={send}>
          Send request
        </Button>
      </Stack>
    </Modal>
  );
}
