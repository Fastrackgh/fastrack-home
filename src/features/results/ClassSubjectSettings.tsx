'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Group,
  Loader,
  Modal,
  SegmentedControl,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { Plus } from 'lucide-react';
import {
  setupApi,
  type AcademicYear,
  type SchoolClass,
  type Subject,
} from '@/features/school-setup/api';
import { errorMessage } from '@/lib/api-client';
import {
  resultsApi,
  type PolicyRow,
  type Preset,
  type Scale,
  type Scheme,
  type Settings,
} from './api';
import {
  isNarrow,
  NARROW_SCOPES,
  narrowProblem,
  targetName,
  withoutRow,
  withRow,
} from './policy-model';
import { weightsProblem, type PresetEdit } from './setup-model';
import { WeightsCard } from './WeightsCard';

const INHERIT = '';
const NEW = '__new__';

/**
 * One class's, one subject's (in every class) or one class subject's own
 * weighting or grades, under the school's and departments' setup. A setting
 * left on "the level above" inherits; re-running the setup wizard keeps these.
 */
export function ClassSubjectSettings({
  year,
  rows,
  schemes,
  scales,
  settings,
  onChanged,
}: {
  year: AcademicYear;
  rows: PolicyRow[];
  schemes: Scheme[];
  scales: Scale[];
  settings: Settings;
  onChanged: () => void;
}) {
  const [classes, setClasses] = useState<SchoolClass[] | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [editing, setEditing] = useState<PolicyRow | 'new' | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([setupApi.allClasses(), setupApi.listSubjects()])
      .then(([c, s]) => {
        setClasses(c);
        setSubjects(s);
      })
      .catch(() => setClasses([]));
  }, []);

  const className = (id: string) => classes?.find((c) => c.id === id)?.className;
  const subjectName = (id: string) => subjects.find((s) => s.id === id)?.subjectName;
  const schemeName = (familyId: string | null) =>
    familyId ? (schemes.find((s) => s.familyId === familyId)?.name ?? 'Unknown') : null;
  const scaleName = (familyId: string | null) =>
    familyId ? (scales.find((s) => s.familyId === familyId)?.name ?? 'Unknown') : null;
  const narrow = rows.filter(isNarrow);

  const remove = async (row: PolicyRow) => {
    setBusy(true);
    try {
      await resultsApi.replacePolicy(year.id, withoutRow(rows, row));
      notifications.show({
        color: 'green',
        title: 'Setting removed',
        message: `${targetName(row, className, subjectName)} now follows the level above.`,
      });
      onChanged();
    } catch (err) {
      notifications.show({
        color: 'red',
        title: 'Not removed',
        message: errorMessage(err, 'Could not remove the setting.'),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card withBorder radius="lg" p="lg">
      <Group justify="space-between" mb="xs">
        <div>
          <Text fw={700}>Class and subject settings</Text>
          <Text size="sm" c="dimmed">
            Give one class, or one subject, its own weighting or grades, for example JHS 3 with its
            mocks. Anything not set here follows the department or the whole school.
          </Text>
        </div>
        <Button
          variant="light"
          radius="md"
          leftSection={<Plus size={14} />}
          onClick={() => setEditing('new')}
          disabled={!classes}
        >
          Add a setting
        </Button>
      </Group>
      {!classes ? (
        <Loader size="sm" />
      ) : narrow.length === 0 ? (
        <Text size="sm" c="dimmed">
          No class or subject has its own setting yet.
        </Text>
      ) : (
        <Table verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Applies to</Table.Th>
              <Table.Th>Weights</Table.Th>
              <Table.Th>Grades</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {narrow.map((row) => (
              <Table.Tr key={`${row.scope}:${row.classId}:${row.subjectId}`}>
                <Table.Td fw={600}>{targetName(row, className, subjectName)}</Table.Td>
                <Table.Td c={row.schemeFamilyId ? undefined : 'dimmed'}>
                  {schemeName(row.schemeFamilyId) ?? 'From the level above'}
                </Table.Td>
                <Table.Td c={row.scaleFamilyId ? undefined : 'dimmed'}>
                  {scaleName(row.scaleFamilyId) ?? 'From the level above'}
                </Table.Td>
                <Table.Td>
                  <Group gap="xs" justify="flex-end" wrap="nowrap">
                    <Button size="compact-xs" variant="subtle" onClick={() => setEditing(row)}>
                      Change
                    </Button>
                    <Button
                      size="compact-xs"
                      variant="subtle"
                      color="red"
                      loading={busy}
                      onClick={() => remove(row)}
                    >
                      Remove
                    </Button>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
      {editing && classes && (
        <SettingModal
          year={year}
          rows={rows}
          existing={editing === 'new' ? null : editing}
          classes={classes}
          subjects={subjects.filter((s) => s.isActive)}
          schemes={schemes}
          scales={scales}
          settings={settings}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            onChanged();
          }}
        />
      )}
    </Card>
  );
}

function SettingModal({
  year,
  rows,
  existing,
  classes,
  subjects,
  schemes,
  scales,
  settings,
  onClose,
  onSaved,
}: {
  year: AcademicYear;
  rows: PolicyRow[];
  existing: PolicyRow | null;
  classes: SchoolClass[];
  subjects: Subject[];
  schemes: Scheme[];
  scales: Scale[];
  settings: Settings;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [row, setRow] = useState<PolicyRow>(
    existing ?? {
      scope: 'class',
      classId: null,
      subjectId: null,
      schemeFamilyId: null,
      scaleFamilyId: null,
    },
  );
  const [weighting, setWeighting] = useState<string>(existing?.schemeFamilyId ?? INHERIT);
  const [baseId, setBaseId] = useState<string | null>(null);
  const [draft, setDraft] = useState<PresetEdit | null>(null);
  const [draftName, setDraftName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const base = schemes.find((s) => s.familyId === baseId) ?? null;
  // The new weighting is edited like a wizard preset: the base's parts, any scale of its mode for the example.
  const basePreset: Preset | null = useMemo(() => {
    if (!base) return null;
    const scale = scales.find((s) => s.mode === base.mode);
    return {
      key: '',
      name: base.name,
      description: '',
      suggestedForDepartmentCodes: [],
      scheme: { name: base.name, mode: base.mode, components: base.components },
      scale: scale ?? { name: '', mode: base.mode, bands: [] },
      settings: {},
      subjects: [],
    };
  }, [base, scales]);

  const startFrom = (familyId: string | null) => {
    setBaseId(familyId);
    const from = schemes.find((s) => s.familyId === familyId);
    setDraft(
      from
        ? {
            components: from.components.map((c) => ({ ...c })),
            bands: scales.find((s) => s.mode === from.mode)?.bands ?? [],
          }
        : null,
    );
    setDraftName('');
  };

  const showsClass = row.scope === 'class' || row.scope === 'class_subject';
  const showsSubject = row.scope === 'subject' || row.scope === 'class_subject';
  const planned: PolicyRow = {
    ...row,
    classId: showsClass ? row.classId : null,
    subjectId: showsSubject ? row.subjectId : null,
    schemeFamilyId: weighting === NEW ? (baseId ?? null) : weighting || null,
  };
  const problem =
    narrowProblem(planned, rows, !!existing) ??
    (weighting === NEW && !draft ? 'Choose the weighting to start from.' : null) ??
    (weighting === NEW && draft && base ? weightsProblem(draft, base.mode) : null);

  const save = async () => {
    if (problem) return;
    setSaving(true);
    setError(null);
    try {
      let schemeFamilyId = planned.schemeFamilyId;
      if (weighting === NEW && draft && base) {
        const name =
          draftName.trim() || draft.components.map((c) => `${c.label} ${c.weight}`).join(' / ');
        schemeFamilyId = (
          await resultsApi.createScheme({ name, mode: base.mode, components: draft.components })
        ).familyId;
      }
      await resultsApi.replacePolicy(year.id, withRow(rows, { ...planned, schemeFamilyId }));
      notifications.show({
        color: 'green',
        title: 'Setting saved',
        message: 'Mark sheets opened from now use it.',
      });
      onSaved();
    } catch (err) {
      setError(errorMessage(err, 'Could not save the setting.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      opened
      onClose={onClose}
      title={existing ? 'Change a setting' : 'Add a setting'}
      radius="lg"
      size={weighting === NEW ? 'xl' : 'md'}
      centered
    >
      <Stack gap="md">
        {error && <Alert color="red">{error}</Alert>}
        <SegmentedControl
          data={NARROW_SCOPES}
          value={row.scope}
          onChange={(scope) => setRow({ ...row, scope: scope as PolicyRow['scope'] })}
          disabled={!!existing}
          fullWidth
        />
        {showsClass && (
          <Select
            label="Class"
            data={classes.map((c) => ({ value: c.id, label: c.className }))}
            value={row.classId ?? null}
            onChange={(classId) => setRow({ ...row, classId })}
            disabled={!!existing}
            searchable
            radius="md"
          />
        )}
        {showsSubject && (
          <Select
            label="Subject"
            data={subjects.map((s) => ({ value: s.id, label: s.subjectName }))}
            value={row.subjectId ?? null}
            onChange={(subjectId) => setRow({ ...row, subjectId })}
            disabled={!!existing}
            searchable
            radius="md"
          />
        )}
        <Select
          label="Weights"
          description="How the marks add up, e.g. with a Mocks part"
          data={[
            { value: INHERIT, label: 'From the level above' },
            ...schemes.map((s) => ({ value: s.familyId, label: s.name })),
            { value: NEW, label: 'Make a new weighting…' },
          ]}
          value={weighting}
          onChange={(v) => setWeighting(v ?? INHERIT)}
          allowDeselect={false}
          radius="md"
        />
        {weighting === NEW && (
          <>
            <Select
              label="Start from"
              data={schemes
                .filter((s) => s.mode === 'numeric')
                .map((s) => ({ value: s.familyId, label: s.name }))}
              value={baseId}
              onChange={startFrom}
              radius="md"
            />
            {draft && basePreset && (
              <>
                <TextInput
                  label="Name"
                  placeholder={draft.components.map((c) => `${c.label} ${c.weight}`).join(' / ')}
                  value={draftName}
                  onChange={(e) => setDraftName(e.currentTarget.value)}
                  maxLength={100}
                  radius="md"
                />
                <WeightsCard
                  title="Parts"
                  preset={basePreset}
                  edit={draft}
                  settings={settings}
                  onChange={setDraft}
                />
              </>
            )}
          </>
        )}
        <Select
          label="Grades"
          data={[
            { value: INHERIT, label: 'From the level above' },
            ...scales.map((s) => ({ value: s.familyId, label: s.name })),
          ]}
          value={row.scaleFamilyId ?? INHERIT}
          onChange={(v) => setRow({ ...row, scaleFamilyId: v || null })}
          allowDeselect={false}
          radius="md"
        />
        {problem && (
          <Text size="sm" c="dimmed">
            {problem}
          </Text>
        )}
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose} radius="md">
            Cancel
          </Button>
          <Button onClick={save} loading={saving} disabled={!!problem} radius="md">
            Save
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
