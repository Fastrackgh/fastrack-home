'use client';

import React from 'react';
import { Box, Group, SimpleGrid, Stack, Text } from '@mantine/core';
import { isWeekend, monthOf, monthWeeks, todayIso } from '@/features/calendar/dates';
import { attendanceRate, dayDescription, MARKS, WEEKDAY_INITIALS } from '../domain/attendance';
import { formatPercent } from '../domain/format';
import type { AttendanceDay, AttendanceRecord } from '../types';
import { StatCard } from '../ui';
import classes from './attendance.module.css';

/** One month of the register, a legend, and the month's totals. */
export function MonthGrid({ month, record }: { month: string; record: AttendanceRecord }) {
  const marks = new Map(record.days.map((day) => [day.date, day]));
  const today = todayIso();
  const { summary } = record;

  return (
    <Stack gap="md">
      <SimpleGrid cols={7} spacing={4}>
        {WEEKDAY_INITIALS.map((day, index) => (
          <Text key={index} size="xs" c="dimmed" ta="center" fw={600}>
            {day}
          </Text>
        ))}
        {monthWeeks(month)
          .flat()
          .map((date) => (
            <DayCell
              key={date}
              date={date}
              day={marks.get(date)}
              inMonth={monthOf(date) === month}
              isToday={date === today}
            />
          ))}
      </SimpleGrid>
      <Legend />
      <SimpleGrid cols={{ base: 2, xs: 4 }} spacing="xs">
        <StatCard centered label="Attendance" value={formatPercent(attendanceRate(record))} />
        <StatCard centered label="Present" value={summary.present} />
        <StatCard centered label="Late" value={summary.late} />
        <StatCard centered label="Absent" value={summary.absent} />
      </SimpleGrid>
      {summary.unmarked > 0 && (
        <Text size="xs" c="dimmed" ta="center">
          {summary.unmarked} school {summary.unmarked === 1 ? 'day has' : 'days have'} not been
          marked yet.
        </Text>
      )}
    </Stack>
  );
}

function DayCell({
  date,
  day,
  inMonth,
  isToday,
}: {
  date: string;
  day: AttendanceDay | undefined;
  inMonth: boolean;
  isToday: boolean;
}) {
  const color = day?.status ? MARKS[day.status].color : null;
  const style: React.CSSProperties = {
    color: color
      ? `var(--mantine-color-${color}-8)`
      : isWeekend(date)
        ? 'var(--mantine-color-dimmed)'
        : undefined,
    background: color && inMonth ? `var(--mantine-color-${color}-light)` : undefined,
  };
  return (
    <Box
      title={dayDescription(day)}
      className={classes.day}
      data-today={isToday || undefined}
      data-outside={!inMonth || undefined}
      style={style}
    >
      {Number(date.slice(8))}
    </Box>
  );
}

function Legend() {
  return (
    <Group gap="md" justify="center">
      {Object.entries(MARKS).map(([mark, { label, color }]) => (
        <Group key={mark} gap={6}>
          <Box
            className={classes.swatch}
            style={{ background: `var(--mantine-color-${color}-6)` }}
          />
          <Text size="xs">{label}</Text>
        </Group>
      ))}
    </Group>
  );
}
