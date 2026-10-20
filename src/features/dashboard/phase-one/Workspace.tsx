'use client';
import Link from 'next/link';
import { Alert, Button, Group, Paper, SimpleGrid, Stack, Text } from '@mantine/core';
import { can, dataScopeOf } from '@/lib/rbac';
import {
  Area,
  Viewer,
  areaHref,
  areaLabels,
  canAccess,
  isPhaseArea,
  Metric,
  previewAreas,
} from '../model';
import { PhaseStore } from './usePhaseState';
import { Finance } from './Finance';
import { Enrollment } from './Enrollment';
import { SchoolLife } from './SchoolLife';
import { Academics } from './Academics';
import { billTotals, money } from './domain';
export function PhaseWorkspace({
  area,
  viewer,
  term,
  store,
}: {
  area: Area;
  viewer: Viewer;
  term: string;
  store: PhaseStore;
}) {
  if (!canAccess(viewer, area))
    return <Alert color="red">This area is not available to your role.</Alert>;
  return (
    <Paper withBorder radius="lg" p={{ base: 'sm', md: 'xl' }} mt="lg">
      {area === 'budgets' || area === 'plans' ? (
        <Finance key={`${area}-${term}`} store={store} viewer={viewer} term={term} area={area} />
      ) : area === 'enquiries' || area === 'admissions' ? (
        <Enrollment key={`${area}-${term}`} store={store} viewer={viewer} term={term} area={area} />
      ) : ['calendar', 'meals', 'gallery', 'archive', 'questions'].includes(area) ? (
        <SchoolLife
          key={`${area}-${term}`}
          store={store}
          viewer={viewer}
          term={term}
          area={area as 'calendar' | 'meals' | 'gallery' | 'archive' | 'questions'}
        />
      ) : (
        <Academics
          key={`${area}-${term}`}
          store={store}
          viewer={viewer}
          term={term}
          area={area as 'schedule' | 'grading' | 'reports' | 'gradebook'}
        />
      )}
    </Paper>
  );
}
export function PhaseShortcuts({ viewer }: { viewer: Viewer }) {
  const areas = previewAreas(viewer).filter((a) => isPhaseArea(a, viewer));
  if (!areas.length) return null;
  return (
    <Stack mt="lg" mb="lg">
      <Group justify="space-between">
        <Text fw={700}>Phase-one workflows</Text>
        <Text c="dimmed" size="xs">
          Forms, reports & school services
        </Text>
      </Group>
      <SimpleGrid cols={{ base: 2, md: 4 }}>
        {areas.map((a) => (
          <Button key={a} variant="default" component={Link} href={areaHref(viewer, a)}>
            {areaLabels[a]}
          </Button>
        ))}
      </SimpleGrid>
    </Stack>
  );
}
/**
 * School-wide summary tiles for the overview, picked by what the viewer
 * may see: finance totals for fee staff, front-office counts for admissions
 * staff, nothing for anyone scoped to their own classes or children.
 */
export function phaseMetrics(
  viewer: Viewer,
  term: string,
  store: PhaseStore,
): Metric[] | undefined {
  if (dataScopeOf(viewer.role) !== 'school') return;
  const s = store.state;
  const activeStudents: Metric = {
    label: 'Active sample students',
    value: String(s.students.filter((x) => x.status === 'Active').length),
    detail: 'Local enrollment register',
    tone: 'blue',
  };
  if (can(viewer, 'payments:read')) {
    const totals = s.bills.filter((b) => b.termId === term).map((b) => billTotals(b, s.payments));
    return [
      activeStudents,
      {
        label: 'School fees collected',
        value: money(totals.reduce((n, t) => n + t.paid, 0)),
        detail: 'Updates when payments are recorded',
        tone: 'green',
      },
      {
        label: 'Outstanding fees',
        value: money(totals.reduce((n, t) => n + t.balance, 0)),
        detail: 'Current preview records',
        tone: 'orange',
      },
      {
        label: 'Expenses this term',
        value: money(s.expenses.filter((e) => e.termId === term).reduce((n, e) => n + e.amount, 0)),
        detail: 'Selected academic term',
        tone: 'blue',
      },
    ];
  }
  if (can(viewer, 'enquiries:read')) {
    return [
      activeStudents,
      {
        label: 'Admission enquiries',
        value: String(s.enquiries.filter((e) => e.termId === term).length),
        detail: 'Admission enquiries this term',
        tone: 'green',
      },
      {
        label: 'School staff',
        value: String(s.staff.length),
        detail: 'Current preview records',
        tone: 'orange',
      },
      {
        label: 'New admissions',
        value: String(s.students.filter((x) => x.termId === term).length),
        detail: 'Selected academic term',
        tone: 'blue',
      },
    ];
  }
}
