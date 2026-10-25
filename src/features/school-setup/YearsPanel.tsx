'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Loader,
  Modal,
  Stack,
  Switch,
  Table,
  Text,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { Archive, ArchiveRestore, CalendarClock, Pencil, PlusCircle } from 'lucide-react';
import { errorMessage } from '@/lib/api-client';
import { setupApi, type AcademicTerm, type AcademicYear, type TermPattern } from './api';
import { DatesModal, type DatesValue } from './DatesModal';
import { TermPatternModal, describePattern } from './TermPatternModal';

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
  canManageTerms,
  onChanged,
}: {
  /** Add, edit, archive and restore years. */
  canManage: boolean;
  /** Set terms' dates and the school's term pattern. */
  canManageTerms: boolean;
  onChanged?: () => void;
}) {
  const [years, setYears] = useState<AcademicYear[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<Editor>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [pattern, setPattern] = useState<TermPattern | null>(null);
  const [editingPattern, setEditingPattern] = useState(false);
  const [archiving, setArchiving] = useState<AcademicYear | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setYears(await setupApi.listYears({ includeArchived: showArchived }));
    } catch (err) {
      setError(errorMessage(err, 'Could not load the academic years.'));
    }
  }, [showArchived]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    // A hint above the years; without it the panel still works.
    setupApi
      .getTermPattern()
      .then(setPattern)
      .catch(() => setPattern(null));
  }, []);

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
      const { termSequence, ...dates } = value;
      if (editor.term)
        await setupApi.updateTerm(editor.year.id, editor.term.id, {
          ...dates,
          ...(termSequence !== undefined ? { termSequence } : {}),
        });
      else await setupApi.createTerm(editor.year.id, { ...dates, termSequence: termSequence ?? 1 });
      saved(editor.term ? `${editor.term.termLabel} updated` : 'Term added');
    }
  };

  const setArchived = async (year: AcademicYear, archive: boolean) => {
    try {
      if (archive) await setupApi.archiveYear(year.id);
      else await setupApi.restoreYear(year.id);
      notifications.show({
        color: 'green',
        title: archive ? `${year.yearLabel} archived` : `${year.yearLabel} restored`,
        message: archive
          ? 'It no longer shows in lists. Restore it any time.'
          : 'It shows in lists again.',
      });
      setArchiving(null);
      load();
      onChanged?.();
    } catch (err) {
      notifications.show({
        color: 'red',
        title: archive ? 'Not archived' : 'Not restored',
        message: errorMessage(err, 'Try again.'),
      });
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
        <Group gap="sm">
          <Switch
            label="Show archived years"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.currentTarget.checked)}
            color="fastrackRed"
          />
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
      </Group>

      {pattern && (
        <Card withBorder radius="lg" p="sm">
          <Group justify="space-between">
            <Group gap="xs">
              <CalendarClock size={18} />
              <Text size="sm">
                <b>{describePattern(pattern)}.</b> New years get these periods without dates.
              </Text>
            </Group>
            {canManageTerms && (
              <Button size="xs" variant="default" onClick={() => setEditingPattern(true)}>
                Change
              </Button>
            )}
          </Group>
        </Card>
      )}

      {years.length === 0 && (
        <Card withBorder radius="lg" p="xl">
          <Text ta="center" c="dimmed">
            No academic years yet. Add the current year, then set its terms’ dates.
          </Text>
        </Card>
      )}

      {years.map((year) => {
        const archived = !!year.archivedAt;
        return (
          <Card key={year.id} withBorder radius="lg" p="md" opacity={archived ? 0.75 : 1}>
            <Group justify="space-between" mb="sm">
              <Group gap="xs">
                <Text fw={700}>{year.yearLabel}</Text>
                {year.isCurrent && (
                  <Badge color="green" variant="light">
                    Current
                  </Badge>
                )}
                {archived && (
                  <Badge color="gray" variant="light">
                    Archived
                  </Badge>
                )}
                <Text size="sm" c="dimmed">
                  {formatSpan(day(year.startDate), day(year.endDate))}
                </Text>
              </Group>
              {canManage && (
                <Group gap="xs">
                  {archived ? (
                    <Button
                      size="xs"
                      variant="default"
                      leftSection={<ArchiveRestore size={14} />}
                      onClick={() => setArchived(year, false)}
                    >
                      Restore
                    </Button>
                  ) : (
                    <>
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
                      {!year.isCurrent && (
                        <Button
                          size="xs"
                          variant="subtle"
                          color="gray"
                          leftSection={<Archive size={14} />}
                          onClick={() => setArchiving(year)}
                        >
                          Archive
                        </Button>
                      )}
                    </>
                  )}
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
                        {term.startDate && term.endDate ? (
                          <Text size="sm">
                            {formatSpan(day(term.startDate), day(term.endDate))}
                          </Text>
                        ) : (
                          <Badge color="orange" variant="light" size="sm">
                            Dates not set
                          </Badge>
                        )}
                      </Table.Td>
                      <Table.Td ta="right">
                        {canManageTerms && !archived && (
                          <Button
                            size="compact-xs"
                            variant={term.datesSet ? 'subtle' : 'light'}
                            color={term.datesSet ? undefined : 'orange'}
                            onClick={() => setEditor({ kind: 'term', year, term })}
                          >
                            {term.datesSet ? 'Edit' : 'Set dates'}
                          </Button>
                        )}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Card>
        );
      })}

      {editor?.kind === 'year' && (
        <DatesModal
          kind="year"
          title={editor.year ? `Edit ${editor.year.yearLabel}` : 'Add academic year'}
          submitLabel={editor.year ? 'Save changes' : 'Add year'}
          note={
            !editor.year && pattern
              ? `It gets ${describePattern(pattern).replace(/ a year$/, '')} without dates; set them when they're known.`
              : undefined
          }
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
          kind="term"
          title={
            editor.term
              ? `${editor.term.datesSet ? 'Edit' : 'Set the dates of'} ${editor.term.termLabel}, ${editor.year.yearLabel}`
              : `Add a term to ${editor.year.yearLabel}`
          }
          submitLabel={
            editor.term ? (editor.term.datesSet ? 'Save changes' : 'Set dates') : 'Add term'
          }
          // A period made from the pattern keeps its number; only dates and "current" change.
          withSequence={!editor.term || editor.term.datesSet}
          bounds={{ startDate: day(editor.year.startDate), endDate: day(editor.year.endDate) }}
          initial={
            editor.term
              ? {
                  startDate: editor.term.startDate ? day(editor.term.startDate) : '',
                  endDate: editor.term.endDate ? day(editor.term.endDate) : '',
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

      {editingPattern && pattern && (
        <TermPatternModal
          initial={pattern}
          onClose={() => setEditingPattern(false)}
          onSaved={(next) => {
            setPattern(next);
            setEditingPattern(false);
          }}
        />
      )}

      <Modal
        opened={!!archiving}
        onClose={() => setArchiving(null)}
        title={`Archive ${archiving?.yearLabel ?? ''}?`}
        radius="lg"
        centered
      >
        <Stack gap="md">
          <Text size="sm">
            An archived year disappears from lists and pickers and can’t be changed. A year that
            already has bills, pupils or marks can’t be archived. You can restore it later.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setArchiving(null)} radius="md">
              Cancel
            </Button>
            <Button
              color="fastrackRed"
              radius="md"
              onClick={() => archiving && setArchived(archiving, true)}
            >
              Archive
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
