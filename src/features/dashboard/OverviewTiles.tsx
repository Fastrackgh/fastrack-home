'use client';

import { useCallback, useEffect, useState, type ComponentType } from 'react';
import { Button, Group, Skeleton, Text } from '@mantine/core';
import { CheckCheck, ClipboardList, Users, Wallet } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { dataScopeOf, hasModule, type Role } from '@/lib/rbac';
import { errorMessage } from '@/lib/api-client';
import { attendanceApi, type Register } from '@/features/attendance/api';
import { todayIso } from '@/features/calendar/dates';
import { feesApi } from '@/features/fees/api';
import { formatGhs } from '@/features/fees/money';
import { marksApi } from '@/features/results/marks-api';
import { setupApi, type CurrentTerm } from '@/features/school-setup/api';
import { studentsApi } from '@/features/students/api';
import styles from './Dashboard.module.css';

interface Metric {
  label: string;
  value: string;
  detail: string;
  tone?: 'green' | 'orange';
}

type Icon = ComponentType<{ size?: number }>;

/** One call that fills one or more tiles. */
interface TileSource {
  key: string;
  /** What the tiles show, for the failure message. */
  name: string;
  icon: Icon;
  /** How many tiles it fills, for the loading placeholders. */
  count: number;
  load: () => Promise<Metric[]>;
}

const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/**
 * The overview's live figures: each one only when the school has its module
 * and the viewer may read it, so nothing shows as a sample or a false zero.
 */
export function OverviewTiles({ term }: { term: CurrentTerm | null }) {
  const { user, can } = useAuth();
  if (!user) return null;
  const viewer = { id: user.id, role: user.role };
  const teacher = dataScopeOf(viewer.role) === 'assigned_classes';
  const on = (module: Parameters<typeof hasModule>[1]) => hasModule(user, module);

  const sources: TileSource[] = [];
  if (on('students') && can('students:read'))
    sources.push({
      key: 'pupils',
      name: 'pupils',
      icon: Users,
      count: 1,
      load: async () => [
        {
          label: teacher ? 'My pupils' : 'Active pupils',
          value: String(await studentsApi.activeCount()),
          detail: teacher ? 'In the classes you teach' : 'On the roll today',
        },
      ],
    });
  if (term && on('fees') && can('invoices:read'))
    sources.push({
      key: 'fees',
      name: 'school fees',
      icon: Wallet,
      count: 2,
      load: () => feesSummary(term),
    });
  if (on('attendance') && can('attendance:read'))
    sources.push({
      key: 'attendance',
      name: 'today’s attendance',
      icon: CheckCheck,
      count: 1,
      load: () => (teacher ? homeroomToday(viewer) : schoolToday()),
    });
  // The same rule as the Mark sheets page: the list is refused to staff who can't enter marks.
  if (term && on('results') && can('marks:enter'))
    sources.push({
      key: 'marks',
      name: 'mark sheets',
      icon: ClipboardList,
      count: 1,
      load: () => markSheetProgress(term, teacher),
    });

  if (!sources.length) return null;
  return (
    <section className={styles.kpis} aria-label="Key figures">
      {sources.map((source) => (
        <LiveTiles key={source.key} source={source} />
      ))}
    </section>
  );
}

function LiveTiles({ source }: { source: TileSource }) {
  const [metrics, setMetrics] = useState<Metric[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { load } = source;
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    let live = true;
    setMetrics(null);
    setError(null);
    load()
      .then((result) => live && setMetrics(result))
      .catch((err) => live && setError(errorMessage(err, 'Try again.')));
    return () => {
      live = false;
    };
    // `load` is rebuilt on every render; the source key and retries decide when to reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source.key, attempt]);

  const Icon = source.icon;
  if (error)
    return (
      <article className={styles.metric} role="alert">
        <Group justify="space-between" gap="xs">
          <Text size="xs" fw={600} c="#748092">
            Couldn&apos;t load {source.name}
          </Text>
          <div className={styles.metricIcon}>
            <Icon size={17} />
          </div>
        </Group>
        <Text size="xs" c="dimmed" mt="md">
          {error}
        </Text>
        <Button size="compact-xs" variant="light" color="red" mt="sm" onClick={retry}>
          Retry
        </Button>
      </article>
    );
  if (!metrics)
    return Array.from({ length: source.count }, (_, i) => (
      <article className={styles.metric} key={i} aria-busy="true">
        <Skeleton height={12} width="60%" />
        <Skeleton height={26} width="40%" mt={22} />
        <Skeleton height={10} width="80%" mt={10} />
      </article>
    ));
  return metrics.map((m) => (
    <article className={styles.metric} key={m.label}>
      <Group justify="space-between" gap="xs">
        <Text size="xs" fw={600} c="#748092">
          {m.label}
        </Text>
        <div className={styles.metricIcon}>
          <Icon size={17} />
        </div>
      </Group>
      <div className={styles.metricValue}>{m.value}</div>
      <Text
        size="10px"
        c={m.tone === 'green' ? '#168168' : m.tone === 'orange' ? '#b47731' : 'dimmed'}
      >
        {m.detail}
      </Text>
    </article>
  ));
}

async function feesSummary(term: CurrentTerm): Promise<Metric[]> {
  const s = await feesApi.invoiceSummary({ termId: term.termId });
  if (s.invoiceCount === 0)
    return [
      {
        label: 'School fees',
        value: 'No bills yet',
        detail: `Nothing billed for ${term.termLabel}`,
      },
    ];
  return [
    {
      label: 'Fees collected',
      value: formatGhs(s.collected),
      detail: `${s.collectionRate}% of ${formatGhs(s.billed)} billed · ${term.termLabel}`,
      tone: 'green',
    },
    {
      label: 'Outstanding fees',
      value: formatGhs(s.outstanding),
      detail: `${count(s.invoiceCount, 'bill')} for ${term.termLabel}`,
      tone: s.outstanding > 0 ? 'orange' : 'green',
    },
  ];
}

const attended = (r: Register) => r.counts.present + r.counts.late + r.counts.halfDay;
const marked = (r: Register) => r.students.length - r.unmarked;

const CLOSED_REASONS: Record<NonNullable<Register['schoolDay']['reason']>, string> = {
  WEEKEND: 'It’s the weekend',
  OUTSIDE_TERM: 'Today is outside the term',
  CLOSURE: 'The school is closed today',
};

const noSchool = (r: Register): Metric => ({
  label: 'Attendance today',
  value: 'No school',
  detail: r.schoolDay.closureTitle ?? CLOSED_REASONS[r.schoolDay.reason ?? 'CLOSURE'],
});

/** Today's registers across the school. */
async function schoolToday(): Promise<Metric[]> {
  const classes = await setupApi.allClasses();
  if (!classes.length)
    return [{ label: 'Attendance today', value: '—', detail: 'No classes set up yet' }];
  const today = todayIso();
  const registers = await Promise.all(classes.map((c) => attendanceApi.register(c.id, today)));
  const open = registers.filter((r) => r.schoolDay.open);
  if (!open.length) return [noSchool(registers[0])];
  const markedCount = open.reduce((n, r) => n + marked(r), 0);
  const taken = open.filter((r) => r.students.length > 0 && r.unmarked === 0).length;
  const withPupils = open.filter((r) => r.students.length > 0).length;
  if (markedCount === 0)
    return [
      {
        label: 'Attendance today',
        value: 'Not taken yet',
        detail: `0 of ${count(withPupils, 'register')} taken`,
        tone: 'orange',
      },
    ];
  return [
    {
      label: 'Present today',
      value: `${open.reduce((n, r) => n + attended(r), 0)}/${markedCount}`,
      detail: `${taken} of ${count(withPupils, 'register')} taken`,
      tone: taken === withPupils ? 'green' : 'orange',
    },
  ];
}

/** Today's register for the teacher's homeroom class; no tile if they have none. */
async function homeroomToday(viewer: { id: string; role: Role }): Promise<Metric[]> {
  const homeroom = (await setupApi.classesFor(viewer)).find((c) => c.homeroomStaffId === viewer.id);
  if (!homeroom) return [];
  const r = await attendanceApi.register(homeroom.id, todayIso());
  if (!r.schoolDay.open) return [noSchool(r)];
  if (r.unmarked > 0)
    return [
      {
        label: `${homeroom.className} register`,
        value: marked(r) ? `${marked(r)}/${r.students.length} marked` : 'Not taken yet',
        detail: `${count(r.unmarked, 'pupil')} still to mark today`,
        tone: 'orange',
      },
    ];
  return [
    {
      label: `${homeroom.className} present today`,
      value: `${attended(r)}/${r.students.length}`,
      detail: 'Register taken',
      tone: 'green',
    },
  ];
}

async function markSheetProgress(term: CurrentTerm, mine: boolean): Promise<Metric[]> {
  const sheets = await marksApi.list(term.termId, mine);
  if (!sheets.length)
    return [
      {
        label: mine ? 'My mark sheets' : 'Mark sheets',
        value: '—',
        detail: `No mark sheets for ${term.termLabel}`,
      },
    ];
  const submitted = sheets.filter(
    (s) => s.status === 'submitted' || s.status === 'approved',
  ).length;
  const started = sheets.filter((s) => s.status === 'draft').length;
  const done = submitted === sheets.length;
  return [
    {
      label: mine ? 'My mark sheets submitted' : 'Mark sheets submitted',
      value: `${submitted} of ${sheets.length}`,
      detail: done
        ? `All in for ${term.termLabel}`
        : `${started} in progress · ${sheets.length - submitted - started} not started`,
      tone: done ? 'green' : 'orange',
    },
  ];
}
