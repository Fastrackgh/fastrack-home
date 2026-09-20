'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Group,
  RingProgress,
  ScrollArea,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  Progress,
} from '@mantine/core';
import { CalendarDays, Check, Save, TrendingDown, TrendingUp, X } from 'lucide-react';
import { DashboardShell } from '@/components/organisms';

type Mark = 'present' | 'absent' | 'late';

const roster = [
  { id: 'FTS-0001', name: 'Kwame Mensah', grade: 'JHS 1' },
  { id: 'FTS-0002', name: 'Abena Owusu', grade: 'JHS 1' },
  { id: 'FTS-0003', name: 'Yaw Boateng', grade: 'JHS 2' },
  { id: 'FTS-0004', name: 'Akua Danso', grade: 'JHS 2' },
  { id: 'FTS-0005', name: 'Kofi Asante', grade: 'SHS 1' },
  { id: 'FTS-0006', name: 'Efua Appiah', grade: 'SHS 1' },
  { id: 'FTS-0007', name: 'Kojo Antwi', grade: 'SHS 2' },
  { id: 'FTS-0008', name: 'Ama Serwaa', grade: 'SHS 2' },
  { id: 'FTS-0009', name: 'Nana Yaa Kyerewaa', grade: 'JHS 1' },
  { id: 'FTS-0010', name: 'Kweku Nyarko', grade: 'SHS 1' },
];

const weeklyTrend = [
  { day: 'Mon', rate: 96 },
  { day: 'Tue', rate: 97 },
  { day: 'Wed', rate: 95 },
  { day: 'Thu', rate: 98 },
  { day: 'Fri', rate: 93 },
];

const gradeRates = [
  { grade: 'JHS 1', rate: 96 },
  { grade: 'JHS 2', rate: 93 },
  { grade: 'SHS 1', rate: 88 },
  { grade: 'SHS 2', rate: 91 },
];

export default function AttendancePage() {
  const [marks, setMarks] = useState<Record<string, Mark>>(() =>
    Object.fromEntries(roster.map((s, i) => [s.id, (['present', 'present', 'late', 'present', 'present', 'present', 'absent', 'present', 'present', 'late'] as Mark[])[i]]))
  );
  const [query, setQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      roster.filter((s) => {
        const matchesQuery =
          query.trim() === '' || `${s.name} ${s.id}`.toLowerCase().includes(query.trim().toLowerCase());
        const matchesGrade = !gradeFilter || gradeFilter === 'All grades' || s.grade === gradeFilter;
        return matchesQuery && matchesGrade;
      }),
    [query, gradeFilter]
  );

  const counts = useMemo(() => {
    const present = Object.values(marks).filter((m) => m === 'present').length;
    const absent = Object.values(marks).filter((m) => m === 'absent').length;
    const late = Object.values(marks).filter((m) => m === 'late').length;
    const rate = roster.length > 0 ? Math.round(((present + late) / roster.length) * 100) : 0;
    return { present, absent, late, rate };
  }, [marks]);

  const setMark = (id: string, mark: Mark) =>
    setMarks((prev) => ({ ...prev, [id]: mark }));

  return (
    <DashboardShell
      active="attendance"
      title="Attendance"
      subtitle="Record and review daily attendance by class."
      actions={
        <>
          <Button variant="default" radius="md" leftSection={<CalendarDays size={15} />}>
            Mon, 8 Sep 2026
          </Button>
          <Button radius="md" color="fastrackRed" leftSection={<Save size={15} />}>
            Save Register
          </Button>
        </>
      }
    >
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
        {[
          { title: 'Attendance Rate', value: `${counts.rate}%`, icon: TrendingUp, color: '#0d9488', tint: 'rgba(13, 148, 136, 0.1)' },
          { title: 'Present', value: `${counts.present}`, icon: Check, color: '#16a34a', tint: 'rgba(22, 163, 74, 0.1)' },
          { title: 'Absent', value: `${counts.absent}`, icon: X, color: '#e01a2b', tint: 'rgba(224, 26, 43, 0.1)' },
          { title: 'Late', value: `${counts.late}`, icon: TrendingDown, color: '#ea580c', tint: 'rgba(234, 88, 12, 0.1)' },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.06 }}
            >
              <Card radius="lg" p="lg" withBorder style={{ borderColor: '#e8edf3', height: '100%' }}>
                <Box
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    background: stat.tint,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon size={20} color={stat.color} />
                </Box>
                <Text fw={800} size="1.6rem" mt="md" style={{ fontFamily: 'var(--font-heading)' }}>
                  {stat.value}
                </Text>
                <Text size="sm" c="dimmed">
                  {stat.title}
                </Text>
              </Card>
            </motion.div>
          );
        })}
      </SimpleGrid>

      <Group grow preventGrowOverflow={false} gap="md" align="stretch" visibleFrom="md">
        <Card withBorder radius="lg" p="lg" style={{ borderColor: '#e8edf3' }}>
          <Title order={5} mb="md">
            This Week
          </Title>
          <Group justify="space-between" align="flex-end" h={90}>
            {weeklyTrend.map((d) => (
              <Box key={d.day} w={54}>
                <Text size="xs" fw={700} ta="center" mb={4}>
                  {d.rate}%
                </Text>
                <Box
                  style={{
                    height: Math.round(d.rate / 2),
                    borderRadius: '6px 6px 0 0',
                    background: d.rate >= 95 ? '#16a34a' : d.rate >= 90 ? '#ea580c' : '#e01a2b',
                  }}
                />
                <Text size="xs" c="dimmed" ta="center" mt={4}>
                  {d.day}
                </Text>
              </Box>
            ))}
          </Group>
        </Card>

        <Card withBorder radius="lg" p="lg" style={{ borderColor: '#e8edf3' }}>
          <Title order={5} mb="md">
            By Grade
          </Title>
          <Stack gap="sm">
            {gradeRates.map((g) => (
              <Box key={g.grade}>
                <Group justify="space-between" mb={4}>
                  <Text size="sm" fw={600}>
                    {g.grade}
                  </Text>
                  <Text size="xs" fw={600}>
                    {g.rate}%
                  </Text>
                </Group>
                <Progress
                  value={g.rate}
                  radius="xl"
                  color={g.rate >= 95 ? 'green' : g.rate >= 90 ? 'orange' : 'red'}
                />
              </Box>
            ))}
          </Stack>
        </Card>
      </Group>

      <Card withBorder radius="lg" p="lg" style={{ borderColor: '#e8edf3' }}>
        <Group justify="space-between" mb="md" wrap="wrap">
          <Group gap="sm" wrap="wrap">
            <Select
              placeholder="Class"
              data={['All grades', 'JHS 1', 'JHS 2', 'SHS 1', 'SHS 2']}
              value={gradeFilter}
              onChange={setGradeFilter}
              radius="md"
              w={150}
            />
            <TextInput
              placeholder="Search student…"
              value={query}
              onChange={(e) => setQuery(e.currentTarget.value)}
              radius="md"
              w={240}
            />
          </Group>
          <RingProgress
            size={72}
            thickness={8}
            roundCaps
            sections={[{ value: counts.rate, color: counts.rate >= 95 ? 'green' : 'orange' }]}
            label={
              <Text ta="center" fw={800} size="sm">
                {counts.rate}%
              </Text>
            }
          />
        </Group>

        <ScrollArea>
          <Table verticalSpacing="sm" horizontalSpacing="md" style={{ minWidth: 620 }}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Student</Table.Th>
                <Table.Th>ID</Table.Th>
                <Table.Th>Class</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Mark</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filtered.map((student) => {
                const mark = marks[student.id];
                return (
                  <Table.Tr key={student.id}>
                    <Table.Td>
                      <Group gap="sm" wrap="nowrap">
                        <Avatar radius="xl" size={32} color="fastrackRed">
                          {student.name
                            .split(' ')
                            .map((p) => p[0])
                            .slice(0, 2)
                            .join('')}
                        </Avatar>
                        <Text fw={600} size="sm">
                          {student.name}
                        </Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {student.id}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light" color="gray" radius="sm" tt="none">
                        {student.grade}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        variant="light"
                        radius="sm"
                        tt="none"
                        color={mark === 'present' ? 'green' : mark === 'late' ? 'orange' : 'red'}
                      >
                        {mark === 'present' ? 'Present' : mark === 'late' ? 'Late' : 'Absent'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <SegmentedControl
                        size="xs"
                        radius="md"
                        value={mark}
                        onChange={(v) => setMark(student.id, v as Mark)}
                        data={[
                          { label: 'Present', value: 'present' },
                          { label: 'Late', value: 'late' },
                          { label: 'Absent', value: 'absent' },
                        ]}
                      />
                    </Table.Td>
                  </Table.Tr>
                );
              })}
              {filtered.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={5}>
                    <Text size="sm" c="dimmed" ta="center" py="xl">
                      No students match your filters.
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ) : null}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Card>
    </DashboardShell>
  );
}
