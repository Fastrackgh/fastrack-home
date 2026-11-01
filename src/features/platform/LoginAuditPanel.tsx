'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Group,
  Loader,
  Pagination,
  ScrollArea,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { Search } from 'lucide-react';
import { ROLE_LABELS } from '@/lib/rbac';
import { PAGE_SIZE, type Page } from '@/lib/pagination';
import { errorMessage } from '@/lib/api-client';
import { platformApi, type LoginLog, type LoginLogFilters } from './api';

const when = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

/** Every sign-in attempt on the platform, newest first, for spotting misuse. */
export function LoginAuditPanel() {
  const [page, setPage] = useState(1);
  const [email, setEmail] = useState('');
  const [debouncedEmail] = useDebouncedValue(email, 300);
  const [role, setRole] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<LoginLogFilters['isSuccess']>(null);
  const [result, setResult] = useState<Page<LoginLog> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setResult(await platformApi.listLogins(page, { email: debouncedEmail, role, isSuccess }));
    } catch (err) {
      setError(errorMessage(err, 'Could not load the sign-in log.'));
    }
  }, [page, debouncedEmail, role, isSuccess]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => setPage(1), [debouncedEmail, role, isSuccess]);

  return (
    <Stack gap="md">
      <Group gap="sm">
        <TextInput
          placeholder="Email"
          leftSection={<Search size={16} />}
          value={email}
          onChange={(e) => setEmail(e.currentTarget.value)}
          radius="md"
          w={260}
        />
        <Select
          placeholder="Any role"
          data={Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }))}
          value={role}
          onChange={setRole}
          clearable
          radius="md"
          w={200}
        />
        <Select
          placeholder="Any result"
          data={[
            { value: 'true', label: 'Signed in' },
            { value: 'false', label: 'Failed' },
          ]}
          value={isSuccess}
          onChange={(v) => setIsSuccess(v as LoginLogFilters['isSuccess'])}
          clearable
          radius="md"
          w={160}
        />
      </Group>

      {error ? (
        <Alert color="red" title="Unable to load the sign-in log">
          <Stack gap="xs" align="flex-start">
            <Text size="sm">{error}</Text>
            <Button size="xs" variant="light" color="red" onClick={load}>
              Try again
            </Button>
          </Stack>
        </Alert>
      ) : !result ? (
        <Loader />
      ) : (
        <ScrollArea>
          <Table verticalSpacing="xs" highlightOnHover style={{ minWidth: 860 }}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>When</Table.Th>
                <Table.Th>Who</Table.Th>
                <Table.Th>School</Table.Th>
                <Table.Th>Result</Table.Th>
                <Table.Th>From</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {result.items.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={5}>
                    <Text c="dimmed" ta="center" py="lg">
                      No sign-ins match these filters.
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                result.items.map((log) => (
                  <Table.Tr key={log.id}>
                    <Table.Td>
                      <Text size="sm">{when.format(new Date(log.createdAt))}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={500}>
                        {log.userName ?? log.userEmail ?? 'Unknown account'}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {[
                          log.userName ? log.userEmail : null,
                          log.role
                            ? (ROLE_LABELS[log.role as keyof typeof ROLE_LABELS] ?? log.role)
                            : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c={log.schoolName ? undefined : 'dimmed'}>
                        {log.schoolName ?? '—'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={log.isSuccess ? 'teal' : 'red'} variant="light">
                        {log.isSuccess ? 'Signed in' : 'Failed'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text
                        size="xs"
                        c="dimmed"
                        lineClamp={1}
                        maw={260}
                        title={log.userAgent ?? ''}
                      >
                        {log.ipAddress ?? '—'}
                        {log.userAgent ? ` · ${log.userAgent}` : ''}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      )}

      {result && result.total > PAGE_SIZE && (
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            {result.total} sign-in attempts
          </Text>
          <Pagination
            total={Math.ceil(result.total / PAGE_SIZE)}
            value={page}
            onChange={setPage}
            color="fastrackRed"
          />
        </Group>
      )}
    </Stack>
  );
}
