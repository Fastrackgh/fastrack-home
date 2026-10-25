'use client';

import { useCallback, useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Group, Loader, Stack, Table, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { Pencil, PlusCircle } from 'lucide-react';
import { errorMessage } from '@/lib/api-client';
import { setupApi, type AcademicTerm, type AcademicYear } from './api';
import { DatesModal, type DatesValue } from './DatesModal';

type Editor =
  | { kind: 'year'; year?: AcademicYear }
  | { kind: 'term'; year: AcademicYear; term?: AcademicTerm }
  | null;

const day = (iso: string) => iso.slice(0, 10);

const dated = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});
/** "1 Sept 2026 – 31 Jul 2027": years and terms span calendar years. */
const formatSpan = (start: string, end: string) =>
  `${dated.format(new Date(`${start}T00:00:00Z`))} – ${dated.format(new Date(`${end}T00:00:00Z`))}`;

/** Academic years and their terms; the current ones drive billing and the calendar. */
export function YearsPanel({
  canManage,
  onChanged,
}: {
  canManage: boolean;
  onChanged?: () => void;
}) {
  const [years, setYears] = useState<AcademicYear[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<Editor>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setYears(await setupApi.listYears());
    } catch (err) {
      setError(errorMessage(err, 'Could not load the academic years.'));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saved = (message: string) => {
    notifications.show({ title: message, message: 'Saved.', color: 'green' });
    setEditor(null);
    load();
    onChanged?.();
  };

  const submit = async (value: DatesValue) => {
    if (!editor) return;
    if (editor.kind === 'year') {
      if (editor.year) await setupApi.updateYear(editor.year.id, value);
      else await setupApi.createYear(value);
      saved(editor.year ? 'Academic year updated' : 'Academic year added');
    } else {
      const input = { ...value, termSequence: value.termSequence ?? 1 };
      if (editor.term) await setupApi.updateTerm(editor.year.id, editor.term.id, input);
      else await setupApi.createTerm(editor.year.id, input);
      saved(editor.term ? 'Term updated' : 'Term added');
    }
  };

  if (error)
    return (
      <Alert color="red" title="Unable to load academic years">
        <Stack gap="xs" align="flex-start">
          <Text size="sm">{error}</Text>
          <Button size="xs" variant="light" color="red" onClick={load}>
            Try again
          </Button>
        </Stack>
      </Alert>
    );
  if (!years) return <Loader />;

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Text size="sm" c="dimmed">
          The current year and term are where bills, attendance and the calendar open.
        </Text>
        {canManage && (
          <Button
            leftSection={<PlusCircle size={16} />}
            color="fastrackRed"
            radius="md"
            onClick={() => setEditor({ kind: 'year' })}
          >
            Add academic year
          </Button>
        )}
      </Group>

      {years.length === 0 && (
        <Card withBorder radius="lg" p="xl">
          <Text ta="center" c="dimmed">
            No academic years yet. Add the current year, then its terms.
          </Text>
        </Card>
      )}

      {years.map((year) => (
        <Card key={year.id} withBorder radius="lg" p="md">
          <Group justify="space-between" mb="sm">
            <Group gap="xs">
              <Text fw={700}>{year.yearLabel}</Text>
              {year.isCurrent && (
                <Badge color="green" variant="light">
                  Current
                </Badge>
              )}
              <Text size="sm" c="dimmed">
                {formatSpan(day(year.startDate), day(year.endDate))}
              </Text>
            </Group>
            {canManage && (
              <Group gap="xs">
                <Button
                  size="xs"
                  variant="default"
                  leftSection={<Pencil size={14} />}
                  onClick={() => setEditor({ kind: 'year', year })}
                >
                  Edit year
                </Button>
                <Button
                  size="xs"
                  variant="light"
                  color="fastrackRed"
                  leftSection={<PlusCircle size={14} />}
                  onClick={() => setEditor({ kind: 'term', year })}
                >
                  Add term
                </Button>
              </Group>
            )}
          </Group>
          {year.terms.length === 0 ? (
            <Text size="sm" c="dimmed">
              No terms yet.
            </Text>
          ) : (
            <Table verticalSpacing="xs">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Term</Table.Th>
                  <Table.Th>Dates</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {year.terms.map((term) => (
                  <Table.Tr key={term.id}>
                    <Table.Td>
                      <Group gap="xs">
                        <Text size="sm" fw={500}>
                          {term.termLabel}
                        </Text>
                        {term.isCurrent && (
                          <Badge color="green" variant="light" size="sm">
                            Current
                          </Badge>
                        )}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{formatSpan(day(term.startDate), day(term.endDate))}</Text>
                    </Table.Td>
                    <Table.Td ta="right">
                      {canManage && (
                        <Button
                          size="compact-xs"
                          variant="subtle"
                          onClick={() => setEditor({ kind: 'term', year, term })}
                        >
                          Edit
                        </Button>
                      )}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Card>
      ))}

      {editor?.kind === 'year' && (
        <DatesModal
          title={editor.year ? `Edit ${editor.year.yearLabel}` : 'Add academic year'}
          submitLabel={editor.year ? 'Save changes' : 'Add year'}
          initial={
            editor.year && {
              startDate: day(editor.year.startDate),
              endDate: day(editor.year.endDate),
              isCurrent: editor.year.isCurrent,
            }
          }
          onClose={() => setEditor(null)}
          onSubmit={submit}
        />
      )}
      {editor?.kind === 'term' && (
        <DatesModal
          title={
            editor.term
              ? `Edit ${editor.term.termLabel}, ${editor.year.yearLabel}`
              : `Add a term to ${editor.year.yearLabel}`
          }
          submitLabel={editor.term ? 'Save changes' : 'Add term'}
          withSequence
          bounds={{ startDate: day(editor.year.startDate), endDate: day(editor.year.endDate) }}
          initial={
            editor.term
              ? {
                  startDate: day(editor.term.startDate),
                  endDate: day(editor.term.endDate),
                  isCurrent: editor.term.isCurrent,
                  termSequence: editor.term.termSequence,
                }
              : {
                  startDate: '',
                  endDate: '',
                  termSequence: Math.max(0, ...editor.year.terms.map((t) => t.termSequence)) + 1,
                }
          }
          onClose={() => setEditor(null)}
          onSubmit={submit}
        />
      )}
    </Stack>
  );
}
