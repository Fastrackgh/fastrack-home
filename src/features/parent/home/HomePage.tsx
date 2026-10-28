'use client';

import { Badge, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { CalendarCheck, FileText, Wallet } from 'lucide-react';
import { formatGhs } from '@/features/fees/money';
import { monthOf, todayIso } from '@/features/calendar/dates';
import { useAuth } from '@/lib/auth';
import { useActiveWard } from '../data/ActiveWardProvider';
import { useAttendance, useCurrentCalendar, useInvoices, useReports } from '../data/queries';
import { hasAreaData } from '../domain/areas';
import { attendanceRate } from '../domain/attendance';
import { formatPercent, greeting } from '../domain/format';
import { totalOwed } from '../domain/invoices';
import { gradeColor } from '../domain/reports';
import { InstallCard } from '../pwa';
import { parentRoutes } from '../routes';
import type { ParentInvoice, TermReport, Ward } from '../types';
import { WithWard } from '../ui';
import { ComingUp } from './ComingUp';
import { SummaryTile } from './SummaryTile';
import { OtherWards, WardHeader } from './WardCards';

export function HomePage() {
  const { user } = useAuth();
  return (
    <Stack gap="lg">
      <div>
        <Text size="sm" c="dimmed">
          {greeting()}
        </Text>
        <Title order={2} fz={{ base: 24, sm: 28 }}>
          {user?.firstName ?? 'Welcome'}
        </Title>
      </div>
      <WithWard>{(ward) => <WardSummary key={ward.studentId} ward={ward} />}</WithWard>
      <InstallCard />
    </Stack>
  );
}

function WardSummary({ ward }: { ward: Ward }) {
  const { user, can } = useAuth();
  const { wards, selectWard } = useActiveWard();
  const id = ward.studentId;
  const show = {
    fees: hasAreaData(user, ward, 'fees'),
    reports: hasAreaData(user, ward, 'reports'),
    attendance: hasAreaData(user, ward, 'attendance'),
    calendar: can('calendar:read'),
  };

  // These share the list pages' offline copies, so the tiles match those pages.
  const invoices = useInvoices(id, { page: 1, enabled: show.fees });
  const reports = useReports(id, { enabled: show.reports });
  const attendance = useAttendance(id, monthOf(todayIso()), { enabled: show.attendance });
  const calendar = useCurrentCalendar(id, { enabled: show.calendar });
  const tileCount = [show.fees, show.attendance, show.reports].filter(Boolean).length;

  return (
    <Stack gap="md">
      <WardHeader ward={ward} />

      <SimpleGrid cols={{ base: 1, xs: Math.max(tileCount, 1) }} spacing="sm">
        {show.fees && (
          <SummaryTile
            href={parentRoutes.fees}
            icon={<Wallet size={14} />}
            label="Fees owed"
            query={invoices}
            value={(page) => formatGhs(totalOwed(page.items))}
            detail={(page) => feesDetail(page.items)}
          />
        )}
        {show.attendance && (
          <SummaryTile
            href={parentRoutes.attendance}
            icon={<CalendarCheck size={14} />}
            label="Attendance"
            query={attendance}
            value={(record) => formatPercent(attendanceRate(record))}
            detail={({ summary }) => `${summary.absent} absent, ${summary.late} late this month`}
          />
        )}
        {show.reports && (
          <SummaryTile
            href={parentRoutes.reports}
            icon={<FileText size={14} />}
            label="Latest report"
            query={reports}
            value={(list) => <LatestReport report={list[0]} />}
            detail={(list) =>
              list[0] ? `${list[0].termLabel}, ${list[0].yearLabel}` : 'None published yet'
            }
          />
        )}
      </SimpleGrid>

      {calendar.data && <ComingUp events={calendar.data.events} />}

      <OtherWards wards={wards.filter((w) => w.studentId !== id)} onSelect={selectWard} />
    </Stack>
  );
}

/** Which bill still owes, or that everything is paid. */
function feesDetail(invoices: ParentInvoice[]) {
  const next = invoices.find((invoice) => invoice.balance > 0);
  return next ? `${next.termLabel ?? next.invoiceNumber} outstanding` : 'All bills paid';
}

function LatestReport({ report }: { report: TermReport | undefined }) {
  if (!report) return '–';
  return (
    <Group gap={8}>
      {report.average != null ? `${report.average}%` : report.termLabel}
      {report.overallGrade && (
        <Badge variant="light" color={gradeColor(report.overallGrade)}>
          {report.overallGrade}
        </Badge>
      )}
    </Group>
  );
}
