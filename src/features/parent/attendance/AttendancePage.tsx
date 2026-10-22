'use client';

import { useState } from 'react';
import { ActionIcon, Box, Card, Group, SimpleGrid, Stack, Text } from '@mantine/core';
import { CalendarCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  addDays,
  addMonths,
  formatMonth,
  isWeekend,
  monthOf,
  monthWeeks,
  todayIso,
} from '@/features/calendar/dates';
import { parentApi, parentAreaReady } from '../api';
import { ComingSoon, PageTitle, QueryView, WithWard } from '../components';
import { percent, wardName } from '../format';
import type { AttendanceMark, AttendanceRecord, Ward } from '../types';
import { useParentQuery } from '../useParentQuery';

export const MARKS: Record<AttendanceMark, { label: string; color: string }> = {
  present: { label: 'Present', color: 'green' },
  late: { label: 'Late', color: 'orange' },
  half_day: { label: 'Half day', color: 'yellow' },
  absent: { label: 'Absent', color: 'red' },
  excused: { label: 'Excused', color: 'blue' },
};

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** First and last day of the month starting `monthIso`. */
export const monthRange = (monthIso: string) => ({
  from: monthIso,
  to: addDays(addMonths(monthIso, 1), -1),
});

/**
 * Share of marked school days a child was in school; late arrivals and half
 * days count as attended, and days not yet marked or excused are left out.
 */
export const attendanceRate = ({ summary }: AttendanceRecord) =>
  percent(
    summary.present + summary.late + summary.halfDay,
    summary.schoolDays - summary.excused - summary.unmarked,
  );

export function AttendancePage() {
  if (!parentAreaReady.attendance) {
    return (
      <>
        <PageTitle title="Attendance" />
        <ComingSoon icon={<CalendarCheck size={22} />} area="Attendance records" />
      </>
    );
  }
  return <WithWard>{(ward) => <WardAttendance key={ward.studentId} ward={ward} />}</WithWard>;
}

function WardAttendance({ ward }: { ward: Ward }) {
  const thisMonth = monthOf(todayIso());
  const [month, setMonth] = useState(thisMonth);
  const query = useParentQuery(`attendance:${ward.studentId}:${month}`, () =>
    parentApi.attendance(ward.studentId, monthRange(month)),
  );

  return (
    <>
      <PageTitle title="Attendance" subtitle={`Daily register for ${wardName(ward)}`} />
      <Card withBorder radius="lg" padding="md">
        <Group justify="space-between" mb="md">
          <ActionIcon
            variant="subtle"
            color="gray"
            aria-label="Previous month"
            onClick={() => setMonth(addMonths(month, -1))}
          >
            <ChevronLeft size={18} />
          </ActionIcon>
          <Text fw={700}>{formatMonth(month)}</Text>
          <ActionIcon
            variant="subtle"
            color="gray"
            aria-label="Next month"
            disabled={month >= thisMonth}
            onClick={() => setMonth(addMonths(month, 1))}
          >
            <ChevronRight size={18} />
          </ActionIcon>
        </Group>
        <QueryView query={query}>
          {(record) => <MonthGrid month={month} record={record} />}
        </QueryView>
      </Card>
    </>
  );
}

function MonthGrid({ month, record }: { month: string; record: AttendanceRecord }) {
  const marks = new Map(record.days.map((day) => [day.date, day]));
  const today = todayIso();
  const rate = attendanceRate(record);

  return (
    <Stack gap="md">
      <SimpleGrid cols={7} spacing={4}>
        {WEEKDAYS.map((day, index) => (
          <Text key={index} size="xs" c="dimmed" ta="center" fw={600}>
            {day}
          </Text>
        ))}
        {monthWeeks(month)
          .flat()
          .map((date) => {
            const inMonth = monthOf(date) === month;
            const day = marks.get(date);
            const mark = day?.status;
            const color = mark ? MARKS[mark].color : null;
            return (
              <Box
                key={date}
                title={
                  mark
                    ? [
                        MARKS[mark].label,
                        day?.arrivalTime && `arrived ${day.arrivalTime}`,
                        day?.note,
                      ]
                        .filter(Boolean)
                        .join(' · ')
                    : undefined
                }
                style={{
                  aspectRatio: '1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: date === today ? 800 : 500,
                  opacity: inMonth ? 1 : 0.25,
                  color: color
                    ? `var(--mantine-color-${color}-8)`
                    : isWeekend(date)
                      ? 'var(--mantine-color-dimmed)'
                      : undefined,
                  background: color && inMonth ? `var(--mantine-color-${color}-light)` : undefined,
                  outline:
                    date === today ? '2px solid var(--mantine-color-fastrackRed-5)' : undefined,
                }}
              >
                {Number(date.slice(8))}
              </Box>
            );
          })}
      </SimpleGrid>
      <Group gap="md" justify="center">
        {Object.entries(MARKS).map(([mark, { label, color }]) => (
          <Group key={mark} gap={6}>
            <Box
              w={10}
              h={10}
              style={{ borderRadius: 3, background: `var(--mantine-color-${color}-6)` }}
            />
            <Text size="xs">{label}</Text>
          </Group>
        ))}
      </Group>
      <SimpleGrid cols={{ base: 2, xs: 4 }} spacing="xs">
        <Summary label="Attendance" value={rate === null ? '–' : `${rate}%`} />
        <Summary label="Present" value={record.summary.present} />
        <Summary label="Late" value={record.summary.late} />
        <Summary label="Absent" value={record.summary.absent} />
      </SimpleGrid>
      {record.summary.unmarked > 0 && (
        <Text size="xs" c="dimmed" ta="center">
          {record.summary.unmarked} school {record.summary.unmarked === 1 ? 'day has' : 'days have'}{' '}
          not been marked yet.
        </Text>
      )}
    </Stack>
  );
}

function Summary({ label, value }: { label: string; value: string | number }) {
  return (
    <Card withBorder radius="md" padding="xs" ta="center">
      <Text fw={800} size="lg">
        {value}
      </Text>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
    </Card>
  );
}
