'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Badge,
  Button,
  Card,
  Group,
  Loader,
  Modal,
  Pagination,
  ScrollArea,
  SegmentedControl,
  Stack,
  Table,
  Text,
  Textarea,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { AlertCircle, ArrowLeft, Check, Inbox, X } from 'lucide-react';
import { PageHeader } from '@/features/workspace';

import { PAGE_SIZE } from '@/lib/pagination';
import { errorMessage } from '@/lib/api-client';
import {
  optionalFeeRequestsApi,
  type OptionalFeeRequestStatus,
  type StaffOptionalFeeRequest,
} from './api';

const STATUS: Record<OptionalFeeRequestStatus, { label: string; color: string }> = {
  PENDING: { label: 'Waiting', color: 'yellow' },
  APPROVED: { label: 'Approved', color: 'green' },
  DECLINED: { label: 'Declined', color: 'red' },
  CANCELLED: { label: 'Cancelled by parent', color: 'gray' },
};

const FILTERS = [
  { value: 'PENDING', label: 'Waiting' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'DECLINED', label: 'Declined' },
  { value: 'ALL', label: 'All' },
];

const dateTime = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});
const when = (value: string | null) => (value ? dateTime.format(new Date(value)) : '');

type Decision = { request: StaffOptionalFeeRequest; approve: boolean };

/**
 * Parents' requests to start or stop a student's optional services (bus,
 * feeding, ...). Approving changes the student's optional fees for the next
 * bill the school generates; bills already issued are not changed.
 */
export function OptionalFeeRequestsPage() {
  const [filter, setFilter] = useState('PENDING');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<StaffOptionalFeeRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deciding, setDeciding] = useState<Decision | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await optionalFeeRequestsApi.list({
        page,
        status: filter === 'ALL' ? null : (filter as OptionalFeeRequestStatus),
      });
      setRows(result.items);
      setTotal(result.total);
    } catch (err) {
      setError(errorMessage(err, 'Could not load requests.'));
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <PageHeader
        title="Service requests"
        subtitle="Parents asking to start or stop optional services such as the bus or feeding. Approved changes apply from the next bill."
        actions={
          <Button
            component={Link}
            href="/school-admin/fees"
            variant="default"
            leftSection={<ArrowLeft size={16} />}
          >
            Fees & Billing
          </Button>
        }
      />
      <Card withBorder radius="lg" padding="lg">
        <Group justify="space-between" mb="md" wrap="wrap">
          <SegmentedControl
            data={FILTERS}
            value={filter}
            onChange={(value) => {
              setFilter(value);
              setPage(1);
            }}
          />
          {loading && <Loader size="sm" />}
        </Group>
        <ScrollArea>
          <Table verticalSpacing="sm" miw={860} highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Student</Table.Th>
                <Table.Th>Request</Table.Th>
                <Table.Th>Parent</Table.Th>
                <Table.Th>Asked</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {error ? (
                <Table.Tr>
                  <Table.Td colSpan={6}>
                    <Stack align="center" py="xl" gap={6}>
                      <AlertCircle size={22} color="var(--mantine-color-red-6)" />
                      <Text size="sm" c="red">
                        {error}
                      </Text>
                      <Button size="xs" variant="light" color="red" onClick={() => void load()}>
                        Try again
                      </Button>
                    </Stack>
                  </Table.Td>
                </Table.Tr>
              ) : rows.length === 0 && !loading ? (
                <Table.Tr>
                  <Table.Td colSpan={6}>
                    <Stack align="center" py="xl" gap={6}>
                      <Inbox size={22} color="var(--mantine-color-gray-5)" />
                      <Text size="sm" c="dimmed">
                        {filter === 'PENDING' ? 'No requests waiting.' : 'No requests.'}
                      </Text>
                    </Stack>
                  </Table.Td>
                </Table.Tr>
              ) : (
                rows.map((request) => (
                  <RequestRow
                    key={request.id}
                    request={request}
                    onDecide={(approve) => setDeciding({ request, approve })}
                  />
                ))
              )}
            </Table.Tbody>
          </Table>
        </ScrollArea>
        {total > PAGE_SIZE && (
          <Group justify="center" mt="md">
            <Pagination total={Math.ceil(total / PAGE_SIZE)} value={page} onChange={setPage} />
          </Group>
        )}
      </Card>
      {deciding && (
        <DecisionModal
          decision={deciding}
          onClose={() => setDeciding(null)}
          onDone={() => {
            setDeciding(null);
            void load();
          }}
        />
      )}
    </>
  );
}

function RequestRow({
  request,
  onDecide,
}: {
  request: StaffOptionalFeeRequest;
  onDecide: (approve: boolean) => void;
}) {
  const status = STATUS[request.status];
  return (
    <Table.Tr>
      <Table.Td>
        <Text size="sm" fw={600}>
          {request.studentName}
        </Text>
        <Text size="xs" c="dimmed">
          {[request.studentCode, request.className].filter(Boolean).join(' · ')}
        </Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm">
          {request.action === 'OPT_IN' ? 'Start' : 'Stop'} <strong>{request.feeTypeName}</strong>
        </Text>
        {request.parentNote && (
          <Text size="xs" c="dimmed" maw={260}>
            “{request.parentNote}”
          </Text>
        )}
      </Table.Td>
      <Table.Td>
        <Text size="sm">{request.parentName}</Text>
        <Text size="xs" c="dimmed">
          {request.parentPhone ?? request.parentEmail}
        </Text>
      </Table.Td>
      <Table.Td>
        <Text size="xs">{when(request.createdAt)}</Text>
      </Table.Td>
      <Table.Td>
        <Badge variant="light" color={status.color}>
          {status.label}
        </Badge>
        {request.decidedAt && (
          <Text size="xs" c="dimmed" mt={2}>
            {request.decidedByName ? `${request.decidedByName}, ` : ''}
            {when(request.decidedAt)}
          </Text>
        )}
        {request.staffNote && (
          <Text size="xs" c="dimmed" maw={220}>
            {request.staffNote}
          </Text>
        )}
      </Table.Td>
      <Table.Td>
        {request.status === 'PENDING' && (
          <Group gap="xs" justify="flex-end" wrap="nowrap">
            <Button
              size="xs"
              color="green"
              leftSection={<Check size={14} />}
              onClick={() => onDecide(true)}
            >
              Approve
            </Button>
            <Button
              size="xs"
              variant="light"
              color="red"
              leftSection={<X size={14} />}
              onClick={() => onDecide(false)}
            >
              Decline
            </Button>
          </Group>
        )}
      </Table.Td>
    </Table.Tr>
  );
}

function DecisionModal({
  decision: { request, approve },
  onClose,
  onDone,
}: {
  decision: Decision;
  onClose: () => void;
  onDone: () => void;
}) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const service = request.feeTypeName;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const trimmed = note.trim() || undefined;
      if (approve) await optionalFeeRequestsApi.approve(request.id, trimmed);
      else await optionalFeeRequestsApi.decline(request.id, trimmed);
      notifications.show({
        message: approve
          ? `${service} ${request.action === 'OPT_IN' ? 'added for' : 'removed for'} ${request.studentName} from the next bill.`
          : 'Request declined. The parent will see your note.',
        color: approve ? 'green' : 'gray',
      });
      onDone();
    } catch (err) {
      setError(errorMessage(err, 'Could not save the decision. Try again.'));
      setBusy(false);
    }
  };

  return (
    <Modal
      opened
      onClose={onClose}
      title={approve ? 'Approve request' : 'Decline request'}
      radius="lg"
      centered
    >
      <Stack>
        <Text size="sm">
          {request.parentName} asks to {request.action === 'OPT_IN' ? 'start' : 'stop'}{' '}
          <strong>{service}</strong> for <strong>{request.studentName}</strong>.
        </Text>
        {approve && (
          <Text size="sm" c="dimmed">
            The student&apos;s optional fees change now and the next bill you generate follows them.
            Bills already issued stay the same; correct one from Fees & Billing if needed.
          </Text>
        )}
        {error && (
          <Text size="sm" c="red">
            {error}
          </Text>
        )}
        <Textarea
          label={approve ? 'Note for the parent (optional)' : 'Reason for the parent'}
          placeholder={approve ? 'For example, the bus route' : 'For example, the bus is full'}
          maxLength={500}
          autosize
          minRows={2}
          value={note}
          onChange={(event) => setNote(event.currentTarget.value)}
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Back
          </Button>
          <Button color={approve ? 'green' : 'red'} loading={busy} onClick={submit}>
            {approve ? 'Approve' : 'Decline'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
