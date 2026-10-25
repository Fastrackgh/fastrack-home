'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Loader,
  Modal,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Text,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { CalendarDays, List, MapPin, Pencil, PlusCircle, Trash2 } from 'lucide-react';
import { PageHeader } from '@/features/workspace';
import { useAuth } from '@/lib/auth';
import { errorMessage } from '@/lib/api-client';
import {
  AUDIENCES,
  STATUSES,
  calendarApi,
  typeInfo,
  type SchoolClass,
  type SchoolDays,
  type SchoolEvent,
  type Term,
} from './api';
import { formatMonth, formatSpan, monthOf, monthsBetween, todayIso } from './dates';
import { EventModal } from './EventModal';
import { MonthGrid } from './MonthGrid';

const ALL = 'all';

type Editor = { mode: 'add'; date?: string } | { mode: 'edit'; event: SchoolEvent } | null;

/** The school's calendar for one term: events, closures and the school days they leave. */
export function CalendarPage() {
  const { can } = useAuth();
  const canManage = can('calendar:manage');

  const [terms, setTerms] = useState<Term[]>([]);
  const [termId, setTermId] = useState<string | null>(null);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [classId, setClassId] = useState<string | null>(null);
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [days, setDays] = useState<SchoolDays | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'month' | 'list'>('month');
  const [month, setMonth] = useState<string | null>(null);
  const [editor, setEditor] = useState<Editor>(null);
  const [removing, setRemoving] = useState<SchoolEvent | null>(null);
  /** Set when loading failed, so a failure never reads as an empty calendar. */
  const [loadError, setLoadError] = useState<string | null>(null);

  const term = terms.find((t) => t.termId === termId) ?? null;
  const months = useMemo(() => (term ? monthsBetween(term.startDate, term.endDate) : []), [term]);

  const loadSetup = useCallback(() => {
    setLoadError(null);
    setLoading(true);
    Promise.all([calendarApi.listTerms(), calendarApi.currentTermId(), calendarApi.listClasses()])
      .then(([allTerms, currentId, allClasses]) => {
        setTerms(allTerms);
        setClasses(allClasses);
        setTermId(currentId ?? allTerms[0]?.termId ?? null);
        if (!currentId && allTerms.length === 0) setLoading(false);
      })
      .catch((err) => {
        setLoadError(errorMessage(err, 'Could not load the calendar.'));
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadSetup();
  }, [loadSetup]);

  // Open each term on today's month when it falls inside the term, else its first month.
  useEffect(() => {
    if (!term) return;
    const today = monthOf(todayIso());
    setMonth(months.includes(today) ? today : (months[0] ?? null));
  }, [term, months]);

  const load = useCallback(async () => {
    if (!termId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const [termEvents, termDays] = await Promise.all([
        calendarApi.listEvents(termId, classId),
        calendarApi.schoolDays(termId, classId),
      ]);
      setEvents(termEvents);
      setDays(termDays);
    } catch (err) {
      setLoadError(errorMessage(err, 'Could not load the calendar.'));
    } finally {
      setLoading(false);
    }
  }, [termId, classId]);

  useEffect(() => {
    load();
  }, [load]);

  const classOptions = classes.map((c) => ({
    value: c.id,
    label: `${c.className} (${c.classCode})`,
  }));
  const termOptions = terms.map((t) => ({
    value: t.termId,
    label: `${t.yearLabel} · ${t.termLabel}${t.isCurrent ? ' (current)' : ''}`,
  }));
  const remove = async (event: SchoolEvent) => {
    try {
      await calendarApi.deleteEvent(event.id);
      notifications.show({ title: 'Event removed', message: event.title, color: 'green' });
      setRemoving(null);
      load();
    } catch (err) {
      notifications.show({
        title: 'Could not remove the event',
        message: errorMessage(err, 'Try again.'),
        color: 'red',
      });
    }
  };

  return (
    <>
      <PageHeader
        title="School calendar"
        subtitle={
          term
            ? `${term.yearLabel} · ${term.termLabel} · ${formatSpan(term.startDate, term.endDate)}`
            : 'Holidays, exams, meetings and events for each term.'
        }
        actions={
          canManage && term ? (
            <Button
              leftSection={<PlusCircle size={16} />}
              color="fastrackRed"
              radius="md"
              onClick={() => setEditor({ mode: 'add' })}
              id="btn-add-event"
            >
              Add event
            </Button>
          ) : null
        }
      />

      {loadError ? (
        <Alert color="red" title="Unable to load the calendar">
          <Stack gap="xs" align="flex-start">
            <Text size="sm">{loadError}</Text>
            <Button
              size="xs"
              variant="light"
              color="red"
              onClick={() => (terms.length ? load() : loadSetup())}
            >
              Try again
            </Button>
          </Stack>
        </Alert>
      ) : !loading && terms.length === 0 ? (
        <Card withBorder radius="lg" p="xl">
          <Text c="dimmed" ta="center">
            This school has no academic terms yet. Once a term is set up, its calendar appears here.
          </Text>
        </Card>
      ) : (
        <Stack gap="lg">
          <Group gap="sm" wrap="wrap">
            <Select
              data={termOptions}
              value={termId}
              onChange={setTermId}
              allowDeselect={false}
              radius="md"
              w={260}
              aria-label="Term"
              id="select-calendar-term"
            />
            <Select
              data={[{ value: ALL, label: 'All classes' }, ...classOptions]}
              value={classId ?? ALL}
              onChange={(v) => setClassId(v === ALL ? null : v)}
              allowDeselect={false}
              searchable
              radius="md"
              w={220}
              aria-label="Class"
              id="select-calendar-class"
            />
            <SegmentedControl
              value={view}
              onChange={(v) => setView(v as 'month' | 'list')}
              radius="md"
              data={[
                {
                  value: 'month',
                  label: (
                    <Group gap={6} wrap="nowrap">
                      <CalendarDays size={14} /> Month
                    </Group>
                  ),
                },
                {
                  value: 'list',
                  label: (
                    <Group gap={6} wrap="nowrap">
                      <List size={14} /> List
                    </Group>
                  ),
                },
              ]}
            />
          </Group>

          <SimpleGrid cols={{ base: 1, xs: 3 }} spacing="md">
            <Stat label="Weekdays in the term" value={days?.weekdays} />
            <Stat label="Holiday & mid-term days" value={days?.closedDays} />
            <Stat
              label={classId ? 'School days for this class' : 'School days for attendance'}
              value={days?.schoolDays}
              strong
            />
          </SimpleGrid>

          <Card withBorder radius="lg" p="lg" style={{ borderColor: '#e8edf3' }}>
            {loading || !term || !month ? (
              <Stack align="center" py="xl">
                <Loader size="sm" color="fastrackRed" />
              </Stack>
            ) : view === 'month' ? (
              <MonthGrid
                month={month}
                months={months}
                onMonthChange={setMonth}
                term={term}
                events={events}
                onEventClick={canManage ? (event) => setEditor({ mode: 'edit', event }) : undefined}
                onDayClick={canManage ? (date) => setEditor({ mode: 'add', date }) : undefined}
              />
            ) : (
              <EventList
                events={events}
                onEdit={canManage ? (event) => setEditor({ mode: 'edit', event }) : undefined}
                onRemove={canManage ? setRemoving : undefined}
              />
            )}
          </Card>
        </Stack>
      )}

      {editor && term && (
        <EventModal
          term={term}
          event={editor.mode === 'edit' ? editor.event : undefined}
          initialDate={editor.mode === 'add' ? editor.date : undefined}
          classOptions={classOptions}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null);
            load();
          }}
        />
      )}
      {removing && (
        <ConfirmRemove
          event={removing}
          onCancel={() => setRemoving(null)}
          onConfirm={() => remove(removing)}
        />
      )}
    </>
  );
}

function Stat({ label, value, strong }: { label: string; value?: number; strong?: boolean }) {
  return (
    <Card withBorder radius="lg" p="md" style={{ borderColor: '#e8edf3' }}>
      <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
        {label}
      </Text>
      <Text size="xl" fw={800} c={strong ? 'fastrackRed.7' : undefined}>
        {value ?? '—'}
      </Text>
    </Card>
  );
}

/** Events grouped by the month they start in. */
function EventList({
  events,
  onEdit,
  onRemove,
}: {
  events: SchoolEvent[];
  onEdit?: (event: SchoolEvent) => void;
  onRemove?: (event: SchoolEvent) => void;
}) {
  if (events.length === 0) {
    return (
      <Text size="sm" c="dimmed" ta="center" py="xl">
        No events in this term yet.
      </Text>
    );
  }
  const byMonth = new Map<string, SchoolEvent[]>();
  for (const event of events) {
    const key = monthOf(event.startDate);
    byMonth.set(key, [...(byMonth.get(key) ?? []), event]);
  }

  return (
    <Stack gap="lg">
      {[...byMonth].map(([monthKey, monthEvents]) => (
        <Stack key={monthKey} gap="xs">
          <Text fw={700} size="sm">
            {formatMonth(monthKey)}
          </Text>
          {monthEvents.map((event) => {
            const info = typeInfo(event.type);
            const status = STATUSES.find((s) => s.value === event.status);
            const audience =
              event.audience === 'CLASS'
                ? (event.className ?? 'One class')
                : AUDIENCES.find((a) => a.value === event.audience)?.label;
            return (
              <Card
                key={event.id}
                withBorder
                radius="md"
                p="sm"
                style={{ opacity: event.status === 'CANCELLED' ? 0.6 : 1 }}
              >
                <Group justify="space-between" align="flex-start" wrap="nowrap">
                  <Stack gap={4}>
                    <Group gap="xs">
                      <Text
                        fw={600}
                        size="sm"
                        td={event.status === 'CANCELLED' ? 'line-through' : undefined}
                      >
                        {event.title}
                      </Text>
                      <Badge size="sm" variant="light" color={info.color} tt="none">
                        {info.label}
                      </Badge>
                      {event.status !== 'ACTIVE' && status && (
                        <Badge size="sm" variant="outline" color={status.color} tt="none">
                          {status.label}
                        </Badge>
                      )}
                    </Group>
                    <Text size="xs" c="dimmed">
                      {formatSpan(event.startDate, event.endDate)}
                      {event.startTime ? ` · ${event.startTime}–${event.endTime}` : ' · All day'}
                      {` · ${audience}`}
                    </Text>
                    {event.location && (
                      <Group gap={4}>
                        <MapPin size={12} color="#94a3b8" />
                        <Text size="xs" c="dimmed">
                          {event.location}
                        </Text>
                      </Group>
                    )}
                    {event.description && <Text size="sm">{event.description}</Text>}
                  </Stack>
                  {onEdit && onRemove && (
                    <Group gap={4} wrap="nowrap">
                      <Button
                        size="xs"
                        variant="subtle"
                        leftSection={<Pencil size={13} />}
                        onClick={() => onEdit(event)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="xs"
                        variant="subtle"
                        color="red"
                        leftSection={<Trash2 size={13} />}
                        onClick={() => onRemove(event)}
                      >
                        Remove
                      </Button>
                    </Group>
                  )}
                </Group>
              </Card>
            );
          })}
        </Stack>
      ))}
    </Stack>
  );
}

function ConfirmRemove({
  event,
  onCancel,
  onConfirm,
}: {
  event: SchoolEvent;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [working, setWorking] = useState(false);
  return (
    <Modal opened title="Remove this event?" onClose={onCancel} radius="lg" centered>
      <Text size="sm">
        {event.title} ({formatSpan(event.startDate, event.endDate)}) will be taken off the calendar
        for everyone. To keep it visible but stop it counting, set it to postponed or cancelled
        instead.
      </Text>
      <Group justify="flex-end" mt="md">
        <Button variant="default" radius="md" onClick={onCancel} disabled={working}>
          Keep it
        </Button>
        <Button
          color="red"
          radius="md"
          loading={working}
          id="btn-confirm-remove-event"
          onClick={async () => {
            setWorking(true);
            await onConfirm();
            setWorking(false);
          }}
        >
          Remove event
        </Button>
      </Group>
    </Modal>
  );
}
