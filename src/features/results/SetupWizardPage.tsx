'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Group,
  Loader,
  NumberInput,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Stepper,
  Switch,
  Table,
  Text,
  TextInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { CheckCircle2, Scale as ScaleIcon } from 'lucide-react';
import {
  errorMessage,
  setupApi,
  type AcademicYear,
  type Department,
} from '@/features/school-setup/api';
import { PageHeader } from '@/features/workspace';
import { APP_ROUTES } from '@/lib/rbac';
import {
  DEFAULT_SETTINGS,
  resultsApi,
  type ApplyResult,
  type Band,
  type Component,
  type PolicyRow,
  type Preset,
  type Scale,
  type Scheme,
  type Settings,
  type Visibility,
} from './api';
import {
  bandsProblem,
  editFrom,
  evenSplit,
  overridesFor,
  sampleResult,
  tryScore,
  weightTotal,
  weightsProblem,
  type PresetEdit,
} from './setup-model';

const SAME = '__same__';

const VISIBILITY: { value: Visibility; label: string }[] = [
  { value: 'show', label: 'Show to parents' },
  { value: 'staff_only', label: 'Staff only' },
  { value: 'hide', label: "Don't work out" },
];

interface Existing {
  rows: PolicyRow[];
  schemes: Scheme[];
  scales: Scale[];
}

/**
 * Sets up how a school's results are worked out: a preset for the school and
 * for each department, its weights and grade bands, and how positions and
 * rounding work. The backend copies the presets into the school's own
 * schemes and scales, which can be changed later.
 */
export function SetupWizardPage() {
  const [year, setYear] = useState<AcademicYear | null | undefined>(undefined);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [presets, setPresets] = useState<Preset[] | null>(null);
  const [existing, setExisting] = useState<Existing | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rerun, setRerun] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const [years, depts, list] = await Promise.all([
        setupApi.listYears(),
        setupApi.listDepartments(),
        resultsApi.listPresets(),
      ]);
      const current = years.find((y) => y.isCurrent) ?? null;
      setDepartments(depts);
      setPresets(list);
      if (current) {
        const [rows, schemes, scales] = await Promise.all([
          resultsApi.getPolicy(current.id),
          resultsApi.listSchemes(),
          resultsApi.listScales(),
        ]);
        setExisting(rows.length ? { rows, schemes, scales } : null);
      }
      setYear(current);
    } catch (err) {
      setLoadError(errorMessage(err, 'Could not load the grading setup.'));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <PageHeader
        title="Grading setup"
        subtitle="How marks become totals, grades and positions on your term reports."
      />
      {loadError ? (
        <Alert color="red" title="Unable to load the grading setup">
          <Stack gap="xs" align="flex-start">
            <Text size="sm">{loadError}</Text>
            <Button size="xs" variant="light" color="red" onClick={load}>
              Try again
            </Button>
          </Stack>
        </Alert>
      ) : year === undefined || !presets ? (
        <Loader />
      ) : year === null ? (
        <Alert color="yellow" title="No current academic year">
          <Text size="sm">
            Grading is set up per academic year. Add this year and mark it current in{' '}
            <Link href={`${APP_ROUTES.setup.path}`}>School setup</Link> first.
          </Text>
        </Alert>
      ) : existing && !rerun ? (
        <CurrentSetup
          year={year}
          departments={departments}
          existing={existing}
          onRerun={() => setRerun(true)}
        />
      ) : (
        <Wizard
          year={year}
          departments={departments}
          presets={presets}
          onDone={() => {
            setRerun(false);
            load();
          }}
        />
      )}
    </>
  );
}

function CurrentSetup({
  year,
  departments,
  existing,
  onRerun,
}: {
  year: AcademicYear;
  departments: Department[];
  existing: Existing;
  onRerun: () => void;
}) {
  const scheme = (familyId: string | null) =>
    familyId ? (existing.schemes.find((s) => s.familyId === familyId)?.name ?? 'Unknown') : null;
  const scale = (familyId: string | null) =>
    familyId ? (existing.scales.find((s) => s.familyId === familyId)?.name ?? 'Unknown') : null;
  const school = existing.rows.find((r) => r.scope === 'school');
  const others = existing.rows.filter((r) => r.scope !== 'school');
  const where = (row: PolicyRow) =>
    row.scope === 'department'
      ? (departments.find((d) => d.id === row.departmentId)?.name ?? 'A department')
      : row.scope === 'class'
        ? 'A class'
        : row.scope === 'subject'
          ? 'A subject in every class'
          : 'A subject in one class';
  return (
    <Stack gap="md">
      <Alert color="green" icon={<CheckCircle2 size={18} />} title={`Set up for ${year.yearLabel}`}>
        <Text size="sm">
          New academic years copy this setup unless you change it for that year.
        </Text>
      </Alert>
      <Card withBorder radius="lg" p={0}>
        <Table verticalSpacing="sm" horizontalSpacing="md">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Applies to</Table.Th>
              <Table.Th>Weights</Table.Th>
              <Table.Th>Grades</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {school && (
              <Table.Tr>
                <Table.Td fw={600}>The whole school</Table.Td>
                <Table.Td>{scheme(school.schemeFamilyId)}</Table.Td>
                <Table.Td>{scale(school.scaleFamilyId)}</Table.Td>
              </Table.Tr>
            )}
            {others.map((row, i) => (
              <Table.Tr key={i}>
                <Table.Td>{where(row)}</Table.Td>
                <Table.Td c={row.schemeFamilyId ? undefined : 'dimmed'}>
                  {scheme(row.schemeFamilyId) ?? 'Same as above'}
                </Table.Td>
                <Table.Td c={row.scaleFamilyId ? undefined : 'dimmed'}>
                  {scale(row.scaleFamilyId) ?? 'Same as above'}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>
      <Group>
        <Button variant="light" color="fastrackRed" radius="md" onClick={onRerun}>
          Run setup again
        </Button>
      </Group>
    </Stack>
  );
}

function Wizard({
  year,
  departments,
  presets,
  onDone,
}: {
  year: AcademicYear;
  departments: Department[];
  presets: Preset[];
  onDone: () => void;
}) {
  const suggested = (codes: string[]) =>
    presets.find((p) => codes.some((c) => p.suggestedForDepartmentCodes.includes(c)))?.key;
  // The school default follows the department with the most classes.
  const biggest = [...departments].sort((a, b) => b.classCount - a.classCount)[0];
  const [step, setStep] = useState(0);
  const [defaultKey, setDefaultKey] = useState<string>(
    (biggest && suggested([biggest.code])) ?? presets[0]?.key ?? '',
  );
  const [deptKeys, setDeptKeys] = useState<Record<string, string>>(() =>
    Object.fromEntries(departments.map((d) => [d.id, suggested([d.code]) ?? SAME])),
  );
  const [edits, setEdits] = useState<Record<string, PresetEdit>>(() =>
    Object.fromEntries(presets.map((p) => [p.key, editFrom(p)])),
  );
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [settingsTouched, setSettingsTouched] = useState(false);
  const [addSubjects, setAddSubjects] = useState(true);
  const [applying, setApplying] = useState(false);
  const [done, setDone] = useState<ApplyResult | null>(null);

  const keyFor = (deptId: string) =>
    deptKeys[deptId] === SAME || !deptKeys[deptId] ? defaultKey : deptKeys[deptId];
  const used = useMemo(() => {
    const keys = new Set([defaultKey, ...departments.map((d) => keyFor(d.id))]);
    return presets.filter((p) => keys.has(p.key));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultKey, deptKeys, departments, presets]);
  const preset = (key: string) => presets.find((p) => p.key === key)!;

  // Settings start from the presets until the school changes them itself.
  useEffect(() => {
    if (settingsTouched) return;
    const fromDefault = preset(defaultKey)?.settings ?? {};
    const aggregate = used.map((p) => p.settings.aggregate).find(Boolean) ?? null;
    setSettings({ ...DEFAULT_SETTINGS, ...fromDefault, aggregate });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultKey, used, settingsTouched]);

  const changeSettings = (change: Partial<Settings>) => {
    setSettingsTouched(true);
    setSettings((s) => ({ ...s, ...change }));
  };
  const setEdit = (key: string, edit: PresetEdit) => setEdits((all) => ({ ...all, [key]: edit }));

  const problems = (kind: 'weights' | 'bands') =>
    used.flatMap((p) => {
      const problem =
        kind === 'weights'
          ? weightsProblem(edits[p.key], p.scheme.mode)
          : bandsProblem(edits[p.key], p.scale.mode);
      return problem ? [`${p.name}: ${problem}`] : [];
    });
  const stepProblems = step === 1 ? problems('weights') : step === 2 ? problems('bands') : [];

  const apply = async () => {
    setApplying(true);
    try {
      const result = await resultsApi.apply({
        academicYearId: year.id,
        defaultPresetKey: defaultKey,
        defaultOverrides: overridesFor(preset(defaultKey), edits[defaultKey]),
        departments: departments
          // A department on the same preset as the school already gets it from the school row.
          .filter((d) => deptKeys[d.id] && deptKeys[d.id] !== SAME && deptKeys[d.id] !== defaultKey)
          .map((d) => ({
            departmentId: d.id,
            presetKey: deptKeys[d.id],
            overrides: overridesFor(preset(deptKeys[d.id]), edits[deptKeys[d.id]]),
          })),
        settings,
        subjects: addSubjects,
      });
      setDone(result);
      notifications.show({ title: 'Grading set up', message: year.yearLabel, color: 'green' });
    } catch (err) {
      notifications.show({
        title: 'Could not set up grading',
        message: errorMessage(err, 'Try again.'),
        color: 'red',
        autoClose: false,
      });
    } finally {
      setApplying(false);
    }
  };

  if (done)
    return (
      <Stack gap="md">
        <Alert color="green" icon={<CheckCircle2 size={18} />} title="Grading is set up">
          <Stack gap={4}>
            <Text size="sm">
              {done.schemesCreated} weighting{done.schemesCreated === 1 ? '' : 's'} and{' '}
              {done.scalesCreated} grade scale{done.scalesCreated === 1 ? '' : 's'} created for{' '}
              {year.yearLabel}.
            </Text>
            {addSubjects && (
              <Text size="sm">
                Subjects: {done.subjects.created} added to your list ({done.subjects.existing}{' '}
                already there), and {done.classSubjects.added} given to classes.
              </Text>
            )}
          </Stack>
        </Alert>
        <Group>
          <Button component={Link} href={`${APP_ROUTES.setup.path}`} variant="light" radius="md">
            Check each class&apos;s subjects
          </Button>
          <Button color="fastrackRed" radius="md" onClick={onDone}>
            Done
          </Button>
        </Group>
      </Stack>
    );

  return (
    <Stack gap="lg">
      <Stepper
        active={step}
        onStepClick={setStep}
        color="fastrackRed"
        size="sm"
        allowNextStepsSelect={false}
      >
        <Stepper.Step label="Presets" description="School and departments" />
        <Stepper.Step label="Weights" description="How marks add up" />
        <Stepper.Step label="Grades" description="Where each grade starts" />
        <Stepper.Step label="Positions" description="And rounding" />
        <Stepper.Step label="Review" />
      </Stepper>

      {step === 0 && (
        <PresetsStep
          presets={presets}
          departments={departments}
          defaultKey={defaultKey}
          setDefaultKey={setDefaultKey}
          deptKeys={deptKeys}
          setDeptKey={(deptId, key) => setDeptKeys((all) => ({ ...all, [deptId]: key }))}
        />
      )}
      {step === 1 &&
        used.map((p) => (
          <WeightsCard
            key={p.key}
            preset={p}
            edit={edits[p.key]}
            settings={settings}
            onChange={(edit) => setEdit(p.key, edit)}
          />
        ))}
      {step === 2 &&
        used.map((p) => (
          <BandsCard
            key={p.key}
            preset={p}
            edit={edits[p.key]}
            decimals={settings.scoreDecimals}
            onChange={(edit) => setEdit(p.key, edit)}
          />
        ))}
      {step === 3 && (
        <SettingsStep
          settings={settings}
          onChange={changeSettings}
          aggregateUsed={used.some((p) => p.settings.aggregate)}
        />
      )}
      {step === 4 && (
        <ReviewStep
          year={year}
          departments={departments}
          defaultPreset={preset(defaultKey)}
          deptPreset={(id) =>
            deptKeys[id] && deptKeys[id] !== SAME && deptKeys[id] !== defaultKey
              ? preset(deptKeys[id])
              : null
          }
          edits={edits}
          settings={settings}
          addSubjects={addSubjects}
          setAddSubjects={setAddSubjects}
        />
      )}

      {stepProblems.length > 0 && (
        <Alert color="red" title="Fix these to go on">
          {stepProblems.map((p) => (
            <Text key={p} size="sm">
              {p}
            </Text>
          ))}
        </Alert>
      )}

      <Group justify="space-between">
        <Button
          variant="default"
          radius="md"
          disabled={step === 0 || applying}
          onClick={() => setStep((s) => s - 1)}
        >
          Back
        </Button>
        {step < 4 ? (
          <Button
            color="fastrackRed"
            radius="md"
            disabled={stepProblems.length > 0 || !defaultKey}
            onClick={() => setStep((s) => s + 1)}
          >
            Next
          </Button>
        ) : (
          <Button color="fastrackRed" radius="md" loading={applying} onClick={apply}>
            Set up grading
          </Button>
        )}
      </Group>
    </Stack>
  );
}

function PresetsStep({
  presets,
  departments,
  defaultKey,
  setDefaultKey,
  deptKeys,
  setDeptKey,
}: {
  presets: Preset[];
  departments: Department[];
  defaultKey: string;
  setDefaultKey: (key: string) => void;
  deptKeys: Record<string, string>;
  setDeptKey: (deptId: string, key: string) => void;
}) {
  const options = presets.map((p) => ({ value: p.key, label: p.name }));
  const chosen = presets.find((p) => p.key === defaultKey);
  return (
    <Stack gap="md">
      <Card withBorder radius="lg" p="lg">
        <Stack gap="xs">
          <Select
            label="For the whole school"
            description="Used wherever a department below doesn't choose its own"
            data={options}
            value={defaultKey}
            onChange={(v) => v && setDefaultKey(v)}
            allowDeselect={false}
            radius="md"
            maw={420}
          />
          {chosen && (
            <Text size="sm" c="dimmed">
              {chosen.description}
            </Text>
          )}
        </Stack>
      </Card>
      {departments.length > 0 && (
        <Card withBorder radius="lg" p={0}>
          <Table verticalSpacing="sm" horizontalSpacing="md">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Department</Table.Th>
                <Table.Th>Uses</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {departments.map((d) => {
                const suggestion = presets.find((p) =>
                  p.suggestedForDepartmentCodes.includes(d.code),
                );
                return (
                  <Table.Tr key={d.id}>
                    <Table.Td>
                      <Text size="sm" fw={600}>
                        {d.name}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {d.classCount} class{d.classCount === 1 ? '' : 'es'}
                        {suggestion ? ` · suggested: ${suggestion.name}` : ''}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Select
                        aria-label={`Preset for ${d.name}`}
                        data={[{ value: SAME, label: 'Same as the whole school' }, ...options]}
                        value={deptKeys[d.id] ?? SAME}
                        onChange={(v) => setDeptKey(d.id, v ?? SAME)}
                        allowDeselect={false}
                        radius="md"
                        maw={360}
                      />
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </Card>
      )}
      <Text size="xs" c="dimmed">
        Presets are starting points. You can change their weights and grades in the next steps, and
        set a single class or subject differently later.
      </Text>
    </Stack>
  );
}

function WeightsCard({
  preset,
  edit,
  settings,
  onChange,
}: {
  preset: Preset;
  edit: PresetEdit;
  settings: Settings;
  onChange: (edit: PresetEdit) => void;
}) {
  const update = (i: number, change: Partial<Component>) =>
    onChange({
      ...edit,
      components: edit.components.map((c, j) => (j === i ? { ...c, ...change } : c)),
    });
  if (preset.scheme.mode === 'descriptor')
    return (
      <Card withBorder radius="lg" p="lg">
        <Text fw={700}>{preset.name}</Text>
        <Text size="sm" c="dimmed" mb="sm">
          Rated in words, with no marks to add up. Teachers rate each of these:
        </Text>
        <Group gap="xs">
          {edit.components.map((c) => (
            <Badge key={c.key} variant="light" color="gray">
              {c.label}
            </Badge>
          ))}
        </Group>
      </Card>
    );
  const total = weightTotal(edit.components);
  const sample = sampleResult(edit, settings);
  return (
    <Card withBorder radius="lg" p="lg">
      <Group justify="space-between" mb="sm">
        <Text fw={700}>{preset.name}</Text>
        <Group gap="xs">
          <Badge color={total === 100 ? 'green' : 'red'} variant="light">
            Total {total} / 100
          </Badge>
          <Button
            size="compact-xs"
            variant="subtle"
            onClick={() => onChange({ ...edit, components: evenSplit(edit.components) })}
          >
            Split evenly
          </Button>
        </Group>
      </Group>
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        <Table verticalSpacing="xs">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Part</Table.Th>
              <Table.Th w={110}>Weight</Table.Th>
              <Table.Th w={130}>Count</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {edit.components.map((c, i) => (
              <Table.Tr key={c.key}>
                <Table.Td>
                  <TextInput
                    aria-label={`Name of ${c.label}`}
                    value={c.label}
                    onChange={(e) => update(i, { label: e.currentTarget.value })}
                    size="xs"
                    radius="md"
                  />
                </Table.Td>
                <Table.Td>
                  <NumberInput
                    aria-label={`Weight of ${c.label}`}
                    value={c.weight}
                    onChange={(v) => update(i, { weight: Number(v) || 0 })}
                    min={0}
                    max={100}
                    decimalScale={2}
                    suffix="%"
                    size="xs"
                    radius="md"
                  />
                </Table.Td>
                <Table.Td>
                  {c.entry === 'items' ? (
                    <NumberInput
                      aria-label={`Best tests counted for ${c.label}`}
                      value={c.bestOf ?? ''}
                      onChange={(v) => update(i, { bestOf: v === '' ? null : Number(v) })}
                      min={1}
                      allowDecimal={false}
                      placeholder="All tests"
                      prefix={c.bestOf ? 'Best ' : undefined}
                      size="xs"
                      radius="md"
                    />
                  ) : (
                    <Text size="xs" c="dimmed">
                      One paper
                    </Text>
                  )}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        <Card bg="var(--mantine-color-default-hover)" radius="md" p="md">
          <Text size="xs" fw={700} tt="uppercase" c="dimmed" mb={6}>
            Worked example
          </Text>
          {total === 100 ? (
            <Stack gap={4}>
              {edit.components.map((c, i) => (
                <Text key={c.key} size="sm">
                  {c.label}:{' '}
                  {c.entry === 'items'
                    ? `tests 6, 8, 7, 9 out of 10${c.bestOf ? `, best ${c.bestOf}` : ''}`
                    : '61 out of 80'}{' '}
                  → <b>{sample.result.componentScores[i]?.score ?? '—'}</b> of {c.weight}
                </Text>
              ))}
              <Text size="sm" fw={700}>
                Total {sample.result.total} → grade {sample.result.grade ?? '—'}
              </Text>
            </Stack>
          ) : (
            <Text size="sm" c="dimmed">
              Shown once the weights add up to 100.
            </Text>
          )}
        </Card>
      </SimpleGrid>
    </Card>
  );
}

function BandsCard({
  preset,
  edit,
  decimals,
  onChange,
}: {
  preset: Preset;
  edit: PresetEdit;
  decimals: number;
  onChange: (edit: PresetEdit) => void;
}) {
  const [trial, setTrial] = useState<number | string>(79.5);
  const numeric = preset.scale.mode === 'numeric';
  const hasPoints = edit.bands.some((b) => b.points != null);
  const update = (i: number, change: Partial<Band>) =>
    onChange({ ...edit, bands: edit.bands.map((b, j) => (j === i ? { ...b, ...change } : b)) });
  const tried = numeric && trial !== '' ? tryScore(Number(trial), edit, decimals) : null;
  return (
    <Card withBorder radius="lg" p="lg">
      <Group justify="space-between" mb="sm" align="flex-end">
        <Text fw={700}>{preset.name}</Text>
        {numeric && (
          <Group gap="xs" align="flex-end">
            <NumberInput
              label="Try a score"
              value={trial}
              onChange={setTrial}
              min={0}
              max={100}
              decimalScale={2}
              size="xs"
              radius="md"
              w={110}
            />
            {tried && (
              <Text size="sm" pb={4}>
                prints <b>{tried.printed}</b> → <b>{tried.grade ?? '—'}</b>
              </Text>
            )}
          </Group>
        )}
      </Group>
      <Table verticalSpacing="xs">
        <Table.Thead>
          <Table.Tr>
            <Table.Th w={110}>Grade</Table.Th>
            {numeric && <Table.Th w={120}>From</Table.Th>}
            <Table.Th>Remark</Table.Th>
            {hasPoints && <Table.Th w={100}>Points</Table.Th>}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {edit.bands.map((b, i) => {
            const last = i === edit.bands.length - 1;
            return (
              <Table.Tr key={i}>
                <Table.Td>
                  <TextInput
                    aria-label={`Grade ${i + 1} label`}
                    value={b.label}
                    onChange={(e) => update(i, { label: e.currentTarget.value })}
                    maxLength={10}
                    size="xs"
                    radius="md"
                  />
                </Table.Td>
                {numeric && (
                  <Table.Td>
                    <NumberInput
                      aria-label={`Where ${b.label} starts`}
                      value={b.minScore ?? 0}
                      onChange={(v) => update(i, { minScore: Number(v) || 0 })}
                      min={0}
                      max={100}
                      decimalScale={2}
                      disabled={last}
                      size="xs"
                      radius="md"
                    />
                  </Table.Td>
                )}
                <Table.Td>
                  <TextInput
                    aria-label={`Remark for ${b.label}`}
                    value={b.remark}
                    onChange={(e) => update(i, { remark: e.currentTarget.value })}
                    maxLength={60}
                    size="xs"
                    radius="md"
                  />
                </Table.Td>
                {hasPoints && (
                  <Table.Td>
                    <NumberInput
                      aria-label={`Points for ${b.label}`}
                      value={b.points ?? ''}
                      onChange={(v) => update(i, { points: v === '' ? null : Number(v) })}
                      size="xs"
                      radius="md"
                    />
                  </Table.Td>
                )}
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
      {numeric && (
        <Text size="xs" c="dimmed" mt="xs">
          A grade covers its starting score up to the next grade&apos;s. Totals are rounded first,
          so with whole numbers 79.5 prints as 80.
        </Text>
      )}
    </Card>
  );
}

function SettingsStep({
  settings,
  onChange,
  aggregateUsed,
}: {
  settings: Settings;
  onChange: (change: Partial<Settings>) => void;
  aggregateUsed: boolean;
}) {
  return (
    <Card withBorder radius="lg" p="lg">
      <Stack gap="lg">
        <Stack gap={4}>
          <Text fw={600} size="sm">
            Position in class
          </Text>
          <SegmentedControl
            data={VISIBILITY}
            value={settings.classPositionVisibility}
            onChange={(v) => onChange({ classPositionVisibility: v as Visibility })}
            color="fastrackRed"
            radius="md"
          />
        </Stack>
        <Stack gap={4}>
          <Text fw={600} size="sm">
            Position in each subject
          </Text>
          <SegmentedControl
            data={VISIBILITY}
            value={settings.subjectPositionVisibility}
            onChange={(v) => onChange({ subjectPositionVisibility: v as Visibility })}
            color="fastrackRed"
            radius="md"
          />
        </Stack>
        <SimpleGrid cols={{ base: 1, sm: 3 }}>
          <Select
            label="Scores and totals"
            data={[
              { value: '0', label: 'Whole numbers (80)' },
              { value: '1', label: 'One decimal (79.5)' },
              { value: '2', label: 'Two decimals (79.45)' },
            ]}
            value={String(settings.scoreDecimals)}
            onChange={(v) => onChange({ scoreDecimals: Number(v ?? 0) })}
            allowDeselect={false}
            radius="md"
          />
          <Select
            label="Average"
            data={[
              { value: '0', label: 'Whole number' },
              { value: '1', label: 'One decimal' },
              { value: '2', label: 'Two decimals' },
            ]}
            value={String(settings.averageDecimals)}
            onChange={(v) => onChange({ averageDecimals: Number(v ?? 1) })}
            allowDeselect={false}
            radius="md"
          />
          <Select
            label="Rank pupils by"
            data={[
              { value: 'average', label: 'Average' },
              { value: 'total', label: 'Total' },
              ...(aggregateUsed || settings.rankBy === 'aggregate'
                ? [{ value: 'aggregate', label: 'Aggregate (lower is better)' }]
                : []),
            ]}
            value={settings.rankBy}
            onChange={(v) => onChange({ rankBy: (v as Settings['rankBy']) ?? 'average' })}
            allowDeselect={false}
            radius="md"
          />
        </SimpleGrid>
        <Switch
          label="A pupil absent from a test or exam scores 0"
          description="Turned off, an absence is skipped, and the rest of the subject counts for more"
          checked={settings.absentCountsAsZero}
          onChange={(e) => onChange({ absentCountsAsZero: e.currentTarget.checked })}
          color="fastrackRed"
        />
        {aggregateUsed && (
          <NumberInput
            label="Aggregate: best other subjects counted"
            description="Added to the subjects marked “Always counted” in each class, BECE style"
            value={settings.aggregate?.bestOtherCount ?? 2}
            onChange={(v) => onChange({ aggregate: { bestOtherCount: Number(v) || 0 } })}
            min={0}
            max={10}
            allowDecimal={false}
            radius="md"
            maw={320}
          />
        )}
      </Stack>
    </Card>
  );
}

function ReviewStep({
  year,
  departments,
  defaultPreset,
  deptPreset,
  edits,
  settings,
  addSubjects,
  setAddSubjects,
}: {
  year: AcademicYear;
  departments: Department[];
  defaultPreset: Preset;
  deptPreset: (deptId: string) => Preset | null;
  edits: Record<string, PresetEdit>;
  settings: Settings;
  addSubjects: boolean;
  setAddSubjects: (on: boolean) => void;
}) {
  const describe = (p: Preset) => {
    const edit = edits[p.key];
    const changed = overridesFor(p, edit) ? ' (changed)' : '';
    if (p.scheme.mode === 'descriptor') return `${p.name}${changed}: rated in words`;
    const parts = edit.components.map((c) => `${c.label} ${c.weight}%`).join(', ');
    const top = edit.bands[0];
    return `${p.name}${changed}: ${parts}; ${top?.label} from ${top?.minScore}`;
  };
  const visibility = (v: Visibility) => VISIBILITY.find((o) => o.value === v)?.label;
  return (
    <Card withBorder radius="lg" p="lg">
      <Stack gap="sm">
        <Group gap="xs">
          <ScaleIcon size={16} />
          <Text fw={700}>For {year.yearLabel}</Text>
        </Group>
        <Text size="sm">
          <b>Whole school:</b> {describe(defaultPreset)}
        </Text>
        {departments.map((d) => {
          const p = deptPreset(d.id);
          return (
            <Text key={d.id} size="sm">
              <b>{d.name}:</b> {p ? describe(p) : 'same as the whole school'}
            </Text>
          );
        })}
        <Text size="sm">
          <b>Positions:</b> class — {visibility(settings.classPositionVisibility)}; subjects —{' '}
          {visibility(settings.subjectPositionVisibility)}. Ranked by {settings.rankBy}.
        </Text>
        <Text size="sm">
          <b>Rounding:</b> scores to {settings.scoreDecimals} decimal place
          {settings.scoreDecimals === 1 ? '' : 's'}, averages to {settings.averageDecimals}.
        </Text>
        <Checkbox
          mt="sm"
          label="Also add each preset's usual subjects to its department's classes"
          description="Subjects you already have are kept; nothing is removed"
          checked={addSubjects}
          onChange={(e) => setAddSubjects(e.currentTarget.checked)}
          color="fastrackRed"
        />
        <Text size="xs" c="dimmed">
          Next year starts with this setup unless you change it. Mark sheets already started keep
          the weights they began with.
        </Text>
      </Stack>
    </Card>
  );
}
