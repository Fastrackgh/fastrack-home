'use client';

import { useState } from 'react';
import { ActionIcon, Card, Group, Text } from '@mantine/core';
import { CalendarCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { addMonths, formatMonth, monthOf, todayIso } from '@/features/calendar/dates';
import { parentAreaReady } from '../config';
import { useAttendance } from '../data/queries';
import { wardName } from '../domain/wards';
import type { Ward } from '../types';
import { ComingSoon, PageTitle, QueryView, WithWard } from '../ui';
import { MonthGrid } from './MonthGrid';

export function AttendancePage() {
  if (!parentAreaReady.attendance) {
    return (
      <>
        <PageTitle title="Attendance" />
        <ComingSoon icon={<CalendarCheck size={22} />} area="Attendance records" />
      </>
    );
  }
  return (
    <WithWard module="attendance">
      {(ward) => <WardAttendance key={ward.studentId} ward={ward} />}
    </WithWard>
  );
}

function WardAttendance({ ward }: { ward: Ward }) {
  const thisMonth = monthOf(todayIso());
  const [month, setMonth] = useState(thisMonth);
  const query = useAttendance(ward.studentId, month);

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
