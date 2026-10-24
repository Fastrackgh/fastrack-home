'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Collapse,
  Group,
  Loader,
  Modal,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { ArrowLeft, ArrowUpCircle, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';
import { errorMessage } from '@/features/fees/notify';
import { setupApi, type AcademicTerm } from '@/features/school-setup/api';
import { PageHeader } from '@/features/workspace';
import { APP_ROUTES } from '@/lib/rbac';
import {
  promotionsApi,
  type PromotionClass,
  type PromotionClassRun,
  type PromotionResult,
} from './api';

const pupils = (n: number) => `${n} ${n === 1 ? 'pupil' : 'pupils'}`;
/** The verb that agrees with a count: "1 stays", "2 stay". */
const agree = (n: number, one: string, many: string) => (n === 1 ? one : many);

const SKIP = 'skip';
const GRADUATE = 'graduate';

/** Per class: the target (a class id, GRADUATE, SKIP, or null until chosen) and who repeats. */
interface Plan {
  target: string | null;
  kept: Set<string>;
}

interface TermOption extends AcademicTerm {
  yearLabel: string;
}

const defaultTarget = (c: PromotionClass): string | null => {
  if (c.pupilCount === 0) return SKIP;
  if (c.suggestion.action === 'graduate') return GRADUATE;
  if (c.suggestion.action === 'promote') return c.suggestion.toClass?.id ?? null;
  return null;
};

/** Every term in date order, so "next term" is simply the one after the current. */
const flattenTerms = (years: Awaited<ReturnType<typeof setupApi.listYears>>): TermOption[] =>
  years
    .flatMap((year) => year.terms.map((term) => ({ ...term, yearLabel: year.yearLabel })))
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

export function PromotionsPage() {
  const [classes, setClasses] = useState<PromotionClass[] | null>(null);
  const [terms, setTerms] = useState<TermOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [plans, setPlans] = useState<Record<string, Plan>>({});
  const [termId, setTermId] = useState<string | null>(null);
  const [exitDate, setExitDate] = useState('');
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [running, setRunning] = useState(false);
  // `left` holds the classes set to "Don't move": they aren't sent, so the
  // backend's `kept` leaves their pupils out (QA-249).
  const [result, setResult] = useState<
    (PromotionResult & { left: { classId: string; className: string; pupils: number }[] }) | null
  >(null);

  const load = useCallback(async () => {
    setError(null);
    setClasses(null);
    try {
      const [preview, years] = await Promise.all([promotionsApi.preview(), setupApi.listYears()]);
      const allTerms = flattenTerms(years);
      const current = allTerms.findIndex((t) => t.isCurrent);
      setClasses(preview);
      setTerms(allTerms);
      setPlans(
        Object.fromEntries(
          preview.map((c) => [c.classId, { target: defaultTarget(c), kept: new Set() }]),
        ),
      );
      // The next term after the current one; with no current or no next term, the user picks.
      setTermId(current >= 0 && allTerms[current + 1] ? allTerms[current + 1].id : null);
    } catch (err) {
      setError(errorMessage(err, 'Could not load the classes.'));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setPlan = (classId: string, change: Partial<Plan>) =>
    setPlans((current) => ({ ...current, [classId]: { ...current[classId], ...change } }));

  const togglePupil = (classId: string, pupilId: string) => {
    const kept = new Set(plans[classId].kept);
    if (kept.has(pupilId)) kept.delete(pupilId);
    else kept.add(pupilId);
    setPlan(classId, { kept });
  };

  const summary = useMemo(() => {
    let promoted = 0;
    let graduated = 0;
    let stay = 0;
    const unchosen: string[] = [];
    for (const c of classes ?? []) {
      const plan = plans[c.classId];
      if (!plan) continue;
      const moving = c.pupils.length - plan.kept.size;
      if (plan.target === null) unchosen.push(c.className);
      else if (plan.target === SKIP) stay += c.pupils.length;
      else {
        stay += plan.kept.size;
        if (plan.target === GRADUATE) graduated += moving;
        else promoted += moving;
      }
    }
    return { promoted, graduated, stay, unchosen };
  }, [classes, plans]);

  const runs: PromotionClassRun[] = (classes ?? []).flatMap((c) => {
    const plan = plans[c.classId];
    if (!plan || plan.target === null || plan.target === SKIP) return [];
    const exceptStudentIds = [...plan.kept];
    return [
      {
        fromClassId: c.classId,
        ...(plan.target === GRADUATE ? { graduate: true as const } : { toClassId: plan.target }),
        ...(exceptStudentIds.length ? { exceptStudentIds } : {}),
      },
    ];
  });

  const problem = !termId
    ? 'Pick the term pupils start in their new class.'
    : summary.unchosen.length
      ? `Choose where ${summary.unchosen.join(', ')} moves to.`
      : summary.promoted + summary.graduated === 0
        ? 'No pupils are set to move.'
        : null;

  const run = async () => {
    if (!termId) return;
    setRunning(true);
    try {
      const done = await promotionsApi.run({
        termId,
        ...(exitDate ? { exitDate } : {}),
        classes: runs,
      });
      const left = (classes ?? [])
        .filter((c) => c.pupils.length > 0 && plans[c.classId]?.target === SKIP)
        .map((c) => ({ classId: c.classId, className: c.className, pupils: c.pupils.length }));
      const stayed = done.kept + left.reduce((sum, c) => sum + c.pupils, 0);
      setResult({ ...done, kept: stayed, left });
      setConfirming(false);
      notifications.show({
        title: 'Classes moved up',
        message: `${done.promoted} moved up, ${done.graduated} graduated, ${stayed} stayed.`,
        color: 'green',
      });
    } catch (err) {
      // All or nothing: a failed run has moved nobody.
      notifications.show({
        title: 'Nothing was moved',
        message: errorMessage(err, 'Try again.'),
        color: 'red',
      });
    } finally {
      setRunning(false);
    }
  };

  const termLabel = (id: string | null) => {
    const term = terms.find((t) => t.id === id);
    return term ? `${term.termLabel}, ${term.yearLabel}` : '';
  };

  const back = (
    <Button
      component={Link}
      href={APP_ROUTES.students.path}
      variant="default"
      radius="md"
      leftSection={<ArrowLeft size={16} />}
    >
      Students
    </Button>
  );

  if (result) {
    return (
      <>
        <PageHeader title="Move classes up" actions={back} />
        <Alert color="green" radius="md" title="Done" mb="md">
          {pupils(result.promoted)} moved up, {result.graduated} graduated and {result.kept} stayed
          in their class. They start in {termLabel(result.termId) || 'the new term'}.
        </Alert>
        <Card withBorder radius="lg" p={0}>
          <Table verticalSpacing="sm" horizontalSpacing="md">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>From</Table.Th>
                <Table.Th>To</Table.Th>
                <Table.Th ta="right">Moved</Table.Th>
                <Table.Th ta="right">Stayed</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {result.classes.map((c) => (
                <Table.Tr key={c.fromClassId}>
                  <Table.Td>{c.fromClassName}</Table.Td>
                  <Table.Td>{c.graduated ? 'Graduated' : c.toClassName}</Table.Td>
                  <Table.Td ta="right">{c.moved}</Table.Td>
                  <Table.Td ta="right">{c.kept}</Table.Td>
                </Table.Tr>
              ))}
              {result.left.map((c) => (
                <Table.Tr key={c.classId}>
                  <Table.Td>{c.className}</Table.Td>
                  <Table.Td c="dimmed">Not moved</Table.Td>
                  <Table.Td ta="right">0</Table.Td>
                  <Table.Td ta="right">{c.pupils}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
        <Group mt="md">
          <Button
            variant="default"
            radius="md"
            onClick={() => {
              setResult(null);
              load();
            }}
          >
            Back to the classes
          </Button>
        </Group>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Move classes up"
        subtitle="Promote whole classes to the next class, keep repeaters back, and graduate the top class."
        actions={
          <>
            {back}
            <Button
              variant="default"
              radius="md"
              leftSection={<RefreshCw size={16} />}
              onClick={load}
              disabled={running}
            >
              Refresh
            </Button>
          </>
        }
      />

      {error ? (
        <Alert color="red" title="Unable to load the classes">
          <Stack gap="xs" align="flex-start">
            <Text size="sm">{error}</Text>
            <Button size="xs" variant="light" color="red" onClick={load}>
              Try again
            </Button>
          </Stack>
        </Alert>
      ) : !classes ? (
        <Loader />
      ) : classes.length === 0 ? (
        <Alert color="blue" radius="md">
          This school has no classes yet. Add them under School setup first.
        </Alert>
      ) : (
        <Stack gap="md">
          <Card withBorder radius="lg">
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <Select
                label="Start in term"
                description="The term pupils begin in their new class"
                placeholder="Pick a term"
                data={terms.map((t) => ({
                  value: t.id,
                  label: `${t.termLabel}, ${t.yearLabel}${t.isCurrent ? ' (current)' : ''}`,
                }))}
                value={termId}
                onChange={setTermId}
                required
                radius="md"
              />
              <TextInput
                type="date"
                label="Leaving date"
                description="Optional. Recorded for pupils who graduate."
                value={exitDate}
                onChange={(e) => setExitDate(e.currentTarget.value)}
                radius="md"
              />
            </SimpleGrid>
          </Card>

          <Card withBorder radius="lg" p={0}>
            <Table verticalSpacing="sm" horizontalSpacing="md">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th w={40} />
                  <Table.Th>Class</Table.Th>
                  <Table.Th>Pupils moving</Table.Th>
                  <Table.Th w={300}>Moves to</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {classes.map((c) => (
                  <ClassRows
                    key={c.classId}
                    schoolClass={c}
                    allClasses={classes}
                    plan={plans[c.classId]}
                    expanded={open.has(c.classId)}
                    disabled={running}
                    onToggle={() =>
                      setOpen((current) => {
                        const next = new Set(current);
                        if (next.has(c.classId)) next.delete(c.classId);
                        else next.add(c.classId);
                        return next;
                      })
                    }
                    onTarget={(target) => setPlan(c.classId, { target })}
                    onPupil={(pupilId) => togglePupil(c.classId, pupilId)}
                  />
                ))}
              </Table.Tbody>
            </Table>
          </Card>

          <Group justify="space-between">
            <Text size="sm" c={problem ? 'red' : 'dimmed'}>
              {problem ??
                `${pupils(summary.promoted)} ${agree(summary.promoted, 'moves', 'move')} up, ${summary.graduated} ${agree(summary.graduated, 'graduates', 'graduate')}, ${summary.stay} ${agree(summary.stay, 'stays', 'stay')}.`}
            </Text>
            <Button
              color="fastrackRed"
              radius="md"
              leftSection={<ArrowUpCircle size={16} />}
              disabled={!!problem || running}
              onClick={() => setConfirming(true)}
            >
              Review and move
            </Button>
          </Group>
        </Stack>
      )}

      <Modal
        opened={confirming}
        onClose={() => !running && setConfirming(false)}
        closeOnClickOutside={!running}
        closeOnEscape={!running}
        withCloseButton={!running}
        title="Move these classes up?"
        radius="lg"
        centered
      >
        <Stack gap="sm">
          <Text size="sm">
            <b>{pupils(summary.promoted)}</b> {agree(summary.promoted, 'moves', 'move')} up,{' '}
            <b>{summary.graduated}</b>{' '}
            {agree(summary.graduated, 'graduates and leaves', 'graduate and leave')} the school, and{' '}
            <b>{summary.stay}</b> {agree(summary.stay, 'stays', 'stay')} in their class. They start
            in {termLabel(termId)}.
          </Text>
          <Stack gap={4}>
            {(classes ?? []).map((c) => {
              const plan = plans[c.classId];
              if (!plan || plan.target === null) return null;
              // Name the classes left where they are, not only count their pupils.
              if (plan.target === SKIP)
                return c.pupils.length ? (
                  <Text key={c.classId} size="xs" c="dimmed">
                    {c.className}: doesn&apos;t move ({pupils(c.pupils.length)}{' '}
                    {agree(c.pupils.length, 'stays', 'stay')})
                  </Text>
                ) : null;
              const to =
                plan.target === GRADUATE
                  ? 'Graduates'
                  : (classes ?? []).find((x) => x.classId === plan.target)?.className;
              return (
                <Text key={c.classId} size="xs" c="dimmed">
                  {c.className} → {to}: {c.pupils.length - plan.kept.size}{' '}
                  {agree(c.pupils.length - plan.kept.size, 'moves', 'move')}
                  {plan.kept.size
                    ? `, ${plan.kept.size} ${agree(plan.kept.size, 'stays', 'stay')}`
                    : ''}
                </Text>
              );
            })}
          </Stack>
          <Text size="xs" c="dimmed">
            This changes every listed pupil&apos;s class at once. Bills for the new term follow the
            new class.
          </Text>
          <Group justify="flex-end" mt="xs">
            <Button
              variant="default"
              radius="md"
              disabled={running}
              onClick={() => setConfirming(false)}
            >
              Cancel
            </Button>
            <Button color="fastrackRed" radius="md" loading={running} onClick={run}>
              Move {pupils(summary.promoted + summary.graduated)}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}

function ClassRows({
  schoolClass: c,
  allClasses,
  plan,
  expanded,
  disabled,
  onToggle,
  onTarget,
  onPupil,
}: {
  schoolClass: PromotionClass;
  allClasses: PromotionClass[];
  plan: Plan | undefined;
  expanded: boolean;
  disabled: boolean;
  onToggle: () => void;
  onTarget: (target: string | null) => void;
  onPupil: (pupilId: string) => void;
}) {
  if (!plan) return null;
  const empty = c.pupils.length === 0;
  const suggested = new Set(c.suggestion.options.map((o) => o.id));
  // Suggested classes first, then every other class except this one.
  const others = allClasses.filter((x) => x.classId !== c.classId && !suggested.has(x.classId));
  const data = [
    ...(c.suggestion.options.length
      ? [
          {
            group: c.suggestion.action === 'choose' ? 'Next classes' : 'Next class',
            items: c.suggestion.options.map((o) => ({ value: o.id, label: o.className })),
          },
        ]
      : []),
    {
      group: 'Other',
      items: [
        { value: GRADUATE, label: 'Graduates (leaves the school)' },
        { value: SKIP, label: "Don't move" },
        ...others.map((x) => ({ value: x.classId, label: x.className })),
      ],
    },
  ];
  const moving = plan.target === SKIP ? 0 : c.pupils.length - plan.kept.size;

  return (
    <>
      <Table.Tr>
        <Table.Td>
          {!empty && (
            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={onToggle}
              aria-label={expanded ? `Hide ${c.className} pupils` : `Show ${c.className} pupils`}
            >
              {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </ActionIcon>
          )}
        </Table.Td>
        <Table.Td>
          <Text size="sm" fw={600}>
            {c.className}
          </Text>
          <Text size="xs" c="dimmed">
            {c.classCode}
            {c.departmentName ? ` · ${c.departmentName}` : ''}
          </Text>
        </Table.Td>
        <Table.Td>
          {empty ? (
            <Text size="sm" c="dimmed">
              No pupils
            </Text>
          ) : (
            <Group gap={6}>
              <Text size="sm">
                {moving} of {c.pupils.length}
              </Text>
              {plan.kept.size > 0 && plan.target !== SKIP && (
                <Badge size="sm" variant="light" color="orange">
                  {plan.kept.size} repeating
                </Badge>
              )}
            </Group>
          )}
        </Table.Td>
        <Table.Td>
          {empty ? (
            <Text size="sm" c="dimmed">
              —
            </Text>
          ) : (
            <Select
              aria-label={`${c.className} moves to`}
              placeholder="Choose the next class"
              data={data}
              value={plan.target}
              onChange={onTarget}
              error={plan.target === null ? 'Choose where this class goes' : undefined}
              disabled={disabled}
              allowDeselect={false}
              radius="md"
              size="xs"
            />
          )}
        </Table.Td>
      </Table.Tr>
      {!empty && (
        <Table.Tr style={{ display: expanded ? undefined : 'none' }}>
          <Table.Td />
          <Table.Td colSpan={3}>
            <Collapse in={expanded}>
              <Text size="xs" c="dimmed" mb={6}>
                Untick pupils who repeat the year and stay in {c.className}.
              </Text>
              <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing={6}>
                {c.pupils.map((p) => (
                  <Checkbox
                    key={p.id}
                    size="xs"
                    label={`${p.fullName} (${p.studentCode})`}
                    checked={!plan.kept.has(p.id)}
                    onChange={() => onPupil(p.id)}
                    disabled={disabled || plan.target === SKIP}
                  />
                ))}
              </SimpleGrid>
            </Collapse>
          </Table.Td>
        </Table.Tr>
      )}
    </>
  );
}
