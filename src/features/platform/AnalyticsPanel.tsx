'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Loader,
  Progress,
  ScrollArea,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
} from '@mantine/core';
import { Search } from 'lucide-react';
import { ROLE_LABELS } from '@/lib/rbac';
import {
  errorMessage,
  platformApi,
  type PlatformActivity,
  type PlatformDemographics,
  type PlatformFinance,
  type SchoolComparison,
} from './api';

const ghs = new Intl.NumberFormat('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const cedis = (value: number) => `GHS ${ghs.format(value ?? 0)}`;
const shortDay = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric' });

interface Data {
  finance: PlatformFinance;
  demographics: PlatformDemographics;
  activity: PlatformActivity;
  schools: SchoolComparison[];
}

/** Platform-wide figures: money collected, pupils, users, sign-ins and each school side by side. */
export function AnalyticsPanel() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setError(null);
    try {
      const [finance, demographics, activity, schools] = await Promise.all([
        platformApi.finance(),
        platformApi.demographics(),
        platformApi.activity(),
        platformApi.comparison(),
      ]);
      setData({ finance, demographics, activity, schools });
    } catch (err) {
      setError(errorMessage(err, 'Could not load the platform analytics.'));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const schools = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.schools ?? [])
      .filter((s) => !q || s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q))
      .sort((a, b) => b.totalCollected - a.totalCollected);
  }, [data, search]);

  if (error)
    return (
      <Alert color="red" title="Unable to load analytics">
        <Stack gap="xs" align="flex-start">
          <Text size="sm">{error}</Text>
          <Button size="xs" variant="light" color="red" onClick={load}>
            Try again
          </Button>
        </Stack>
      </Alert>
    );
  if (!data) return <Loader />;

  const { finance, demographics, activity } = data;
  const peak = Math.max(1, ...activity.loginActivity7Days.map((d) => d.successCount + d.failCount));

  return (
    <Stack gap="lg">
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
        <Figure label="Billed" value={cedis(finance.totalInvoiced)} />
        <Figure label="Collected" value={cedis(finance.totalCollected)} />
        <Figure label="Outstanding" value={cedis(finance.outstandingBalance)} />
        <Figure label="Collection rate" value={`${finance.collectionRate}%`} />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
        <Card withBorder radius="md" p="md">
          <Text fw={700} mb="sm">
            Students
          </Text>
          <Text size="xl" fw={800}>
            {demographics.total}
          </Text>
          <Text size="xs" c="dimmed" mb="sm">
            {demographics.active} active · {demographics.inactive} inactive
          </Text>
          <Text size="sm">
            {demographics.gender.male} boys · {demographics.gender.female} girls
            {demographics.gender.unspecified
              ? ` · ${demographics.gender.unspecified} not recorded`
              : ''}
          </Text>
          <Text size="sm">
            {demographics.boarding.day} day · {demographics.boarding.boarding} boarding
          </Text>
        </Card>
        <Card withBorder radius="md" p="md">
          <Text fw={700} mb="sm">
            Users by role
          </Text>
          <Stack gap={4}>
            {[...activity.userRoles]
              .sort((a, b) => b.count - a.count)
              .map((r) => (
                <Group key={r.role} justify="space-between">
                  <Text size="sm">{ROLE_LABELS[r.role as keyof typeof ROLE_LABELS] ?? r.role}</Text>
                  <Text size="sm" fw={600}>
                    {r.count}
                  </Text>
                </Group>
              ))}
          </Stack>
        </Card>
        <Card withBorder radius="md" p="md">
          <Text fw={700} mb="sm">
            Sign-ins, last 7 days
          </Text>
          <Stack gap={6}>
            {activity.loginActivity7Days.map((d) => (
              <Group key={d.date} gap="xs" wrap="nowrap">
                <Text size="xs" w={52} c="dimmed">
                  {shortDay.format(new Date(d.date))}
                </Text>
                <Progress.Root style={{ flex: 1 }} size="lg">
                  <Progress.Section value={(d.successCount / peak) * 100} color="teal" />
                  <Progress.Section value={(d.failCount / peak) * 100} color="red" />
                </Progress.Root>
                <Text size="xs" w={84} ta="right" style={{ whiteSpace: 'nowrap' }}>
                  {d.successCount}
                  {d.failCount ? ` · ${d.failCount} failed` : ''}
                </Text>
              </Group>
            ))}
          </Stack>
        </Card>
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        <Card withBorder radius="md" p="md">
          <Text fw={700} mb="sm">
            Payments by method
          </Text>
          <Table verticalSpacing={4}>
            <Table.Tbody>
              {finance.paymentMethods.map((m) => (
                <Table.Tr key={m.method}>
                  <Table.Td>{m.method}</Table.Td>
                  <Table.Td ta="right">{m.count}</Table.Td>
                  <Table.Td ta="right">{cedis(m.totalAmount)}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
        <Card withBorder radius="md" p="md">
          <Text fw={700} mb="sm">
            Module adoption
          </Text>
          <Table verticalSpacing={4}>
            <Table.Tbody>
              {[...activity.moduleAdoption]
                .sort((a, b) => b.enabledCount - a.enabledCount)
                .map((m) => (
                  <Table.Tr key={m.moduleKey}>
                    <Table.Td>{m.moduleName}</Table.Td>
                    <Table.Td ta="right">{m.enabledCount} schools</Table.Td>
                  </Table.Tr>
                ))}
            </Table.Tbody>
          </Table>
        </Card>
      </SimpleGrid>

      <Card withBorder radius="md" p="md">
        <Group justify="space-between" mb="sm">
          <Text fw={700}>Schools compared</Text>
          <TextInput
            placeholder="Search schools"
            leftSection={<Search size={14} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            size="xs"
            w={220}
          />
        </Group>
        <ScrollArea h={420}>
          <Table verticalSpacing="xs" highlightOnHover stickyHeader>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>School</Table.Th>
                <Table.Th ta="right">Students</Table.Th>
                <Table.Th ta="right">Staff</Table.Th>
                <Table.Th ta="right">Collected</Table.Th>
                <Table.Th ta="right">Collection rate</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {schools.map((s) => (
                <Table.Tr key={s.id}>
                  <Table.Td>
                    <Group gap="xs">
                      <Text size="sm" fw={600}>
                        {s.name}
                      </Text>
                      {!s.isActive && (
                        <Badge size="xs" color="gray" variant="light">
                          Inactive
                        </Badge>
                      )}
                    </Group>
                    <Text size="xs" c="dimmed">
                      {s.code}
                    </Text>
                  </Table.Td>
                  <Table.Td ta="right">{s.studentsCount}</Table.Td>
                  <Table.Td ta="right">{s.staffCount}</Table.Td>
                  <Table.Td ta="right">{cedis(s.totalCollected)}</Table.Td>
                  <Table.Td ta="right">{s.collectionRate}%</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Card>
    </Stack>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <Card withBorder radius="md" p="md">
      <Text size="xs" fw={700} c="dimmed" tt="uppercase">
        {label}
      </Text>
      <Text size="xl" fw={800} mt={4}>
        {value}
      </Text>
    </Card>
  );
}
