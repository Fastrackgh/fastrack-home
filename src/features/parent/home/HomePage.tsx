'use client';

import React from 'react';
import Link from 'next/link';
import {
  Avatar,
  Badge,
  Card,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { CalendarCheck, CalendarDays, ChevronRight, FileText, Wallet } from 'lucide-react';
import { formatGhs, sumPesewas } from '@/features/fees/money';
import { useAuth } from '@/lib/auth';
import { canAccessRoute } from '@/lib/rbac';
import { typeInfo, type SchoolEvent } from '@/features/calendar/api';
import { formatSpan, monthOf, todayIso } from '@/features/calendar/dates';
import { useActiveWard } from '../ActiveWardProvider';
import { parentApi, parentAreaReady } from '../api';
import { attendanceRate, monthRange } from '../attendance/AttendancePage';
import { WithWard, notOffered } from '../components';
import { wardInitials, wardName, wardPlacement, wardStatusColor, wardStatusLabel } from '../format';
import { InstallCard } from '../pwa';
import { gradeColor } from '../reports/ReportsPage';
import type { Ward } from '../types';
import { schoolOffers } from '../types';
import { useParentQuery, type ParentQuery } from '../useParentQuery';

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
}

export function HomePage() {
  const { user } = useAuth();
  return (
    <Stack gap="lg">
      <div>
        <Text size="sm" c="dimmed">
          {greeting()}
        </Text>
        <Title order={2} fz={{ base: 24, sm: 28 }} style={{ fontFamily: 'var(--font-heading)' }}>
          {user?.firstName ?? 'Welcome'}
        </Title>
      </div>
      <WithWard>{(ward) => <WardSummary key={ward.studentId} ward={ward} />}</WithWard>
      <InstallCard />
    </Stack>
  );
}

/** A tile whose value comes from its own read, so one failing area doesn't blank the page. */
function Tile<T>({
  href,
  icon,
  label,
  query,
  value,
  detail,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  query: ParentQuery<T>;
  value: (data: T) => React.ReactNode;
  detail?: (data: T) => React.ReactNode;
}) {
  // A school that hasn't turned the area on gets no tile at all (QA-262).
  if (query.data === undefined && !query.loading && notOffered(query.error)) return null;
  return (
    <UnstyledButton component={Link} href={href}>
      <Card withBorder radius="lg" padding="md" h="100%">
        <Group justify="space-between" mb="xs" c="dimmed">
          <Group gap={6}>
            {icon}
            <Text size="xs" fw={600} tt="uppercase">
              {label}
            </Text>
          </Group>
          <ChevronRight size={16} />
        </Group>
        {query.data !== undefined ? (
          <>
            <Text fw={800} fz={22} style={{ fontFamily: 'var(--font-heading)' }}>
              {value(query.data)}
            </Text>
            {detail && (
              <Text size="xs" c="dimmed">
                {detail(query.data)}
              </Text>
            )}
          </>
        ) : query.loading ? (
          <Loader size="sm" color="fastrackRed" type="dots" />
        ) : (
          <Text size="sm" c="dimmed">
            Not available
          </Text>
        )}
      </Card>
    </UnstyledButton>
  );
}

/** The next few events on the ward's calendar that haven't finished or been cancelled. */
function ComingUp({ events }: { events: SchoolEvent[] }) {
  const today = todayIso();
  const upcoming = events
    .filter((event) => event.endDate >= today && event.status !== 'CANCELLED')
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .slice(0, 3);
  return (
    <Card withBorder radius="lg" padding="md">
      <Group gap={6} mb="sm" c="dimmed">
        <CalendarDays size={14} />
        <Text size="xs" fw={600} tt="uppercase">
          Coming up this term
        </Text>
      </Group>
      {upcoming.length === 0 ? (
        <Text size="sm" c="dimmed">
          Nothing else on the school calendar this term.
        </Text>
      ) : (
        <Stack gap="sm">
          {upcoming.map((event) => (
            <Group key={event.id} wrap="nowrap" align="flex-start" justify="space-between">
              <div style={{ minWidth: 0 }}>
                <Text size="sm" fw={600}>
                  {event.title}
                </Text>
                <Text size="xs" c="dimmed">
                  {formatSpan(event.startDate, event.endDate)}
                  {event.startTime && `, ${event.startTime}`}
                  {event.location && ` · ${event.location}`}
                </Text>
              </div>
              <Group gap={6} wrap="nowrap">
                {event.status === 'POSTPONED' && (
                  <Badge variant="light" color="yellow">
                    Postponed
                  </Badge>
                )}
                <Badge variant="light" color={typeInfo(event.type).color}>
                  {typeInfo(event.type).label}
                </Badge>
              </Group>
            </Group>
          ))}
        </Stack>
      )}
    </Card>
  );
}

function WardSummary({ ward }: { ward: Ward }) {
  const { user, can } = useAuth();
  const { wards, selectWard } = useActiveWard();
  const id = ward.studentId;
  const month = monthOf(todayIso());
  const showFees = canAccessRoute(user, 'parentFees') && schoolOffers(ward, 'fees');
  const showReports =
    parentAreaReady.reports &&
    canAccessRoute(user, 'parentReports') &&
    schoolOffers(ward, 'results');
  const showAttendance =
    parentAreaReady.attendance &&
    canAccessRoute(user, 'parentAttendance') &&
    schoolOffers(ward, 'attendance');
  const showCalendar = can('calendar:read');

  // Share the list pages' offline copies, so the tiles match what those pages show.
  const invoices = useParentQuery(showFees ? `invoices:${id}:all:1` : null, () =>
    parentApi.listInvoices(id, { page: 1 }),
  );
  const reports = useParentQuery(showReports ? `reports:${id}` : null, () =>
    parentApi.listReports(id),
  );
  const attendance = useParentQuery(showAttendance ? `attendance:${id}:${month}` : null, () =>
    parentApi.attendance(id, monthRange(month)),
  );
  const calendar = useParentQuery(showCalendar ? `calendar:${id}:current` : null, () =>
    parentApi.calendar(id),
  );
  const others = wards.filter((w) => w.studentId !== id);

  return (
    <Stack gap="md">
      <Card radius="lg" padding="lg" withBorder>
        <Group wrap="nowrap">
          <Avatar color="fastrackRed" radius="xl" size={56}>
            {wardInitials(ward)}
          </Avatar>
          <div style={{ minWidth: 0, flex: 1 }}>
            <Text fw={700} size="lg">
              {wardName(ward)}
            </Text>
            <Text size="sm" c="dimmed" truncate>
              {wardPlacement(ward)}
            </Text>
          </div>
          <Badge variant="light" color={wardStatusColor(ward.status)}>
            {wardStatusLabel(ward.status)}
          </Badge>
        </Group>
      </Card>

      <SimpleGrid
        cols={{
          base: 1,
          xs: Math.max([showFees, showAttendance, showReports].filter(Boolean).length, 1),
        }}
        spacing="sm"
      >
        {showFees && (
          <Tile
            href="/parent/fees"
            icon={<Wallet size={14} />}
            label="Fees owed"
            query={invoices}
            value={(page) => formatGhs(sumPesewas(page.items, (inv) => Math.max(inv.balance, 0)))}
            detail={(page) => {
              const next = page.items.find((inv) => inv.balance > 0);
              return next
                ? `${next.termLabel ?? next.invoiceNumber} outstanding`
                : 'All bills paid';
            }}
          />
        )}
        {showAttendance && (
          <Tile
            href="/parent/attendance"
            icon={<CalendarCheck size={14} />}
            label="Attendance"
            query={attendance}
            value={(record) => {
              const rate = attendanceRate(record);
              return rate === null ? '–' : `${rate}%`;
            }}
            detail={(record) =>
              `${record.summary.absent} absent, ${record.summary.late} late this month`
            }
          />
        )}
        {showReports && (
          <Tile
            href="/parent/reports"
            icon={<FileText size={14} />}
            label="Latest report"
            query={reports}
            value={(list) =>
              list[0] ? (
                <Group gap={8}>
                  {list[0].average != null ? `${list[0].average}%` : list[0].termLabel}
                  {list[0].overallGrade && (
                    <Badge variant="light" color={gradeColor(list[0].overallGrade)}>
                      {list[0].overallGrade}
                    </Badge>
                  )}
                </Group>
              ) : (
                '–'
              )
            }
            detail={(list) =>
              list[0] ? `${list[0].termLabel}, ${list[0].yearLabel}` : 'None published yet'
            }
          />
        )}
      </SimpleGrid>

      {calendar.data && <ComingUp events={calendar.data.events} />}

      {others.length > 0 && (
        <div>
          <Text size="sm" fw={700} mb="xs">
            Your other children
          </Text>
          <Stack gap="xs">
            {others.map((other) => (
              <UnstyledButton key={other.studentId} onClick={() => selectWard(other.studentId)}>
                <Card withBorder radius="lg" padding="sm">
                  <Group wrap="nowrap">
                    <Avatar color="gray" radius="xl" size={36}>
                      {wardInitials(other)}
                    </Avatar>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Text size="sm" fw={600}>
                        {wardName(other)}
                      </Text>
                      <Text size="xs" c="dimmed" truncate>
                        {wardPlacement(other)}
                      </Text>
                    </div>
                    <Text size="xs" c="fastrackRed" fw={600}>
                      Switch
                    </Text>
                  </Group>
                </Card>
              </UnstyledButton>
            ))}
          </Stack>
        </div>
      )}
    </Stack>
  );
}
