'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Loader,
  Modal,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { ClipboardCheck, Plus } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { setupApi, type SchoolClass } from '@/features/school-setup/api';
import { PageHeader } from '@/features/workspace';
import { APP_ROUTES } from '@/lib/rbac';
import { errorMessage } from '@/lib/api-client';
import { resultsApi } from './api';
import { assessmentsApi, papersMessage, type Assessment } from './assessments-api';
import { TermPicker, useTerms } from './TermPicker';

export const mockResultsHref = (id: string) =>
  `${APP_ROUTES.mocks.path}/view?${new URLSearchParams({ id })}`;

/**
 * Mock exams (and other standalone assessments) for a term: each one puts a
 * paper on every subject's mark sheet for one class, has its own results, and
 * is published to parents on its own, without a term report.
 */
export function MockExamsPage() {
  const { can } = useAuth();
  const isHead = can('reports:approve');
  const { terms, termId, setTermId, error: termsError } = useTerms();
  const [mocks, setMocks] = useState<Assessment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    if (!termId) return;
    setError(null);
    setMocks(null);
    try {
      setMocks(await assessmentsApi.list(termId));
    } catch (err) {
      setError(errorMessage(err, 'Could not load the mock exams.'));
    }
  }, [termId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <PageHeader
        title="Mock exams"
        subtitle="One paper per subject for a class, with results you publish to parents on their own."
      />
      <Group justify="space-between" mb="md" align="flex-end">
        <TermPicker terms={terms} termId={termId} onChange={setTermId} />
        {isHead && (
          <Button
            leftSection={<Plus size={16} />}
            color="fastrackRed"
            radius="md"
            onClick={() => setCreating(true)}
            disabled={!termId}
          >
            New mock
          </Button>
        )}
      </Group>
      {error || termsError ? (
        <Alert color="red" title="Unable to load the mock exams">
          <Stack gap="xs" align="flex-start">
            <Text size="sm">{error ?? termsError}</Text>
            <Button size="xs" variant="light" color="red" onClick={load}>
              Try again
            </Button>
          </Stack>
        </Alert>
      ) : !mocks ? (
        <Loader />
      ) : mocks.length === 0 ? (
        <Stack align="center" py="xl" gap="xs">
          <ClipboardCheck size={28} />
          <Text c="dimmed" ta="center" maw={460}>
            No mock exams this term.{' '}
            {isHead
              ? 'Create one to put its paper on every subject of a class; teachers enter the marks on their mark sheets.'
              : 'A head creates them; their papers then appear on your mark sheets.'}
          </Text>
        </Stack>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
          {mocks.map((mock) => (
            <Card
              key={mock.id}
              withBorder
              radius="lg"
              p="md"
              component={Link}
              href={mockResultsHref(mock.id)}
            >
              <Group justify="space-between" align="flex-start" wrap="nowrap">
                <div style={{ minWidth: 0 }}>
                  <Text fw={700}>{mock.title}</Text>
                  <Text size="sm" c="dimmed">
                    {mock.className}
                    {mock.takenOn ? ` · ${mock.takenOn}` : ''} · out of {mock.maxRaw}
                  </Text>
                </div>
                <Badge variant="light" color={mock.status === 'published' ? 'green' : 'gray'}>
                  {mock.status === 'published'
                    ? mock.revision > 1
                      ? 'Republished'
                      : 'Published'
                    : 'Draft'}
                </Badge>
              </Group>
            </Card>
          ))}
        </SimpleGrid>
      )}
      {creating && termId && (
        <NewMockModal
          termId={termId}
          existing={mocks ?? []}
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            load();
          }}
        />
      )}
    </>
  );
}

function NewMockModal({
  termId,
  existing,
  onClose,
  onCreated,
}: {
  termId: string;
  existing: Assessment[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [parts, setParts] = useState<{ value: string; label: string }[]>([]);
  const [classId, setClassId] = useState<string | null>(null);
  const [componentKey, setComponentKey] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [maxRaw, setMaxRaw] = useState<number | string>(100);
  const [takenOn, setTakenOn] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([setupApi.allClasses(), resultsApi.listSchemes()])
      .then(([c, schemes]) => {
        setClasses(c);
        // Parts that take several papers, from every weighting; Mocks first.
        const byKey = new Map<string, string>();
        for (const s of schemes)
          for (const p of s.components)
            if (p.entry === 'items' && !byKey.has(p.key)) byKey.set(p.key, p.label);
        const list = [...byKey].map(([value, label]) => ({ value, label }));
        list.sort((a, b) => Number(b.value === 'mocks') - Number(a.value === 'mocks'));
        setParts(list);
        setComponentKey(list[0]?.value ?? null);
      })
      .catch((err) => setError(errorMessage(err, 'Could not load the classes.')));
  }, []);

  // "Mock 1", "Mock 2", … per class.
  const suggested = useMemo(() => {
    if (!classId) return '';
    const n = existing.filter((m) => m.classId === classId).length;
    return `Mock ${n + 1}`;
  }, [classId, existing]);

  const save = async () => {
    if (!classId || !componentKey) return;
    setSaving(true);
    setError(null);
    try {
      const res = await assessmentsApi.create({
        termId,
        classId,
        componentKey,
        title: title.trim() || suggested,
        maxRaw: Number(maxRaw),
        takenOn: takenOn || undefined,
      });
      const notable = res.skipped.length > 0 || res.partsAdded.length > 0;
      notifications.show({
        color: res.skipped.length ? 'orange' : 'green',
        title: `${res.assessment.title} created for ${res.assessment.className}`,
        message: papersMessage(res),
        autoClose: notable ? false : undefined,
      });
      onCreated();
    } catch (err) {
      setError(errorMessage(err, 'Could not create the mock.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal opened onClose={onClose} title="New mock exam" radius="lg" centered>
      <Stack gap="md">
        {error && <Alert color="red">{error}</Alert>}
        <Select
          label="Class"
          description="Only this class sits it"
          data={classes.map((c) => ({ value: c.id, label: c.className }))}
          value={classId}
          onChange={setClassId}
          searchable
          radius="md"
        />
        <Select
          label="Goes in"
          description="The part of each subject's weighting its papers sit in. At 0% it doesn't change term results."
          data={parts}
          value={componentKey}
          onChange={setComponentKey}
          allowDeselect={false}
          radius="md"
        />
        <TextInput
          label="Name"
          placeholder={suggested || 'Mock 1'}
          value={title}
          onChange={(e) => setTitle(e.currentTarget.value)}
          maxLength={60}
          radius="md"
        />
        <NumberInput
          label="Each paper is marked out of"
          value={maxRaw}
          onChange={setMaxRaw}
          min={1}
          max={1000}
          radius="md"
        />
        <TextInput
          label="Date written"
          type="date"
          value={takenOn}
          onChange={(e) => setTakenOn(e.currentTarget.value)}
          radius="md"
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose} radius="md">
            Cancel
          </Button>
          <Button
            color="fastrackRed"
            onClick={save}
            loading={saving}
            disabled={!classId || !componentKey || !(Number(maxRaw) > 0)}
            radius="md"
          >
            Create
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
