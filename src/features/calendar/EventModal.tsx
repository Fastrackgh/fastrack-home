'use client';

import { useState } from 'react';
import {
  Alert,
  Button,
  Grid,
  Group,
  Modal,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
  Textarea,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { Info } from 'lucide-react';
import { errorMessage } from '@/lib/api-client';
import {
  AUDIENCES,
  CLOSURE_TYPES,
  EVENT_TYPES,
  STATUSES,
  calendarApi,
  type EventAudience,
  type EventInput,
  type EventStatus,
  type EventType,
  type SchoolEvent,
  type Term,
} from './api';

/**
 * Adds an event to `term`, or edits `event` when given. Rendered only while
 * open, so every use starts from a fresh form. The backend re-checks every
 * rule below; checking here first gives a clearer message.
 */
export function EventModal({
  term,
  event,
  classOptions,
  initialDate,
  onClose,
  onSaved,
}: {
  term: Term;
  event?: SchoolEvent;
  classOptions: { value: string; label: string }[];
  /** Pre-fills the dates when adding from a day on the month grid. */
  initialDate?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [type, setType] = useState<EventType>(event?.type ?? 'OTHER');
  const [title, setTitle] = useState(event?.title ?? '');
  const [description, setDescription] = useState(event?.description ?? '');
  const [startDate, setStartDate] = useState(event?.startDate ?? initialDate ?? term.startDate);
  const [endDate, setEndDate] = useState(event?.endDate ?? initialDate ?? term.startDate);
  const [allDay, setAllDay] = useState(event ? event.startTime === null : true);
  const [startTime, setStartTime] = useState(event?.startTime ?? '08:00');
  const [endTime, setEndTime] = useState(event?.endTime ?? '10:00');
  const [location, setLocation] = useState(event?.location ?? '');
  const [audience, setAudience] = useState<EventAudience>(event?.audience ?? 'WHOLE_SCHOOL');
  const [classId, setClassId] = useState<string | null>(event?.classId ?? null);
  const [status, setStatus] = useState<EventStatus>(event?.status ?? 'ACTIVE');
  const [saving, setSaving] = useState(false);

  const isClosure = CLOSURE_TYPES.includes(type);
  const audienceOptions = isClosure
    ? AUDIENCES.filter((a) => a.value === 'WHOLE_SCHOOL' || a.value === 'CLASS')
    : AUDIENCES;

  const chooseType = (next: EventType) => {
    setType(next);
    // A closure is for the school or a class; it lasts whole days.
    if (CLOSURE_TYPES.includes(next)) {
      if (audience === 'STAFF' || audience === 'PARENTS') setAudience('WHOLE_SCHOOL');
      setAllDay(true);
    }
  };

  const problem = (): string | null => {
    if (!title.trim()) return 'Give the event a title.';
    if (!startDate || !endDate) return 'Enter the start and end dates.';
    if (endDate < startDate) return 'The end date must be on or after the start date.';
    if (startDate < term.startDate || endDate > term.endDate)
      return `Dates must fall within ${term.termLabel} (${term.startDate} to ${term.endDate}).`;
    if (!allDay && (!startTime || !endTime)) return 'Enter both times, or make it all-day.';
    if (!allDay && endTime <= startTime) return 'The end time must be after the start time.';
    if (audience === 'CLASS' && !classId) return 'Choose the class.';
    return null;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const message = problem();
    if (message) {
      notifications.show({ title: 'Check the form', message, color: 'red' });
      return;
    }
    const input: EventInput = {
      type,
      title: title.trim(),
      description: description.trim() || null,
      startDate,
      endDate,
      startTime: allDay ? null : startTime,
      endTime: allDay ? null : endTime,
      location: location.trim() || null,
      audience,
      classId: audience === 'CLASS' ? classId : null,
      status,
    };
    setSaving(true);
    try {
      if (event) await calendarApi.updateEvent(event.id, input);
      else await calendarApi.createEvent(term.termId, input);
      notifications.show({
        title: event ? 'Event updated' : 'Event added',
        message: input.title,
        color: 'green',
      });
      onSaved();
    } catch (err) {
      notifications.show({
        title: 'Could not save the event',
        message: errorMessage(err, 'Try again.'),
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      opened
      onClose={onClose}
      title={`${event ? 'Edit event' : 'Add event'} · ${term.yearLabel} ${term.termLabel}`}
      size="lg"
      radius="lg"
      centered
    >
      <form onSubmit={submit}>
        <Stack gap="md">
          <Grid gutter="sm">
            <Grid.Col span={{ base: 12, sm: 5 }}>
              <Select
                label="Type"
                data={EVENT_TYPES.map(({ value, label }) => ({ value, label }))}
                value={type}
                onChange={(v) => v && chooseType(v as EventType)}
                allowDeselect={false}
                radius="md"
                id="select-event-type"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 7 }}>
              <TextInput
                label="Title"
                placeholder="e.g. Inter-house sports"
                value={title}
                onChange={(e) => setTitle(e.currentTarget.value)}
                maxLength={150}
                required
                radius="md"
                id="input-event-title"
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <TextInput
                label="Start date"
                type="date"
                min={term.startDate}
                max={term.endDate}
                value={startDate}
                onChange={(e) => {
                  const next = e.currentTarget.value;
                  setStartDate(next);
                  if (endDate < next) setEndDate(next);
                }}
                required
                radius="md"
                id="input-event-start"
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <TextInput
                label="End date"
                type="date"
                min={startDate || term.startDate}
                max={term.endDate}
                value={endDate}
                onChange={(e) => setEndDate(e.currentTarget.value)}
                required
                radius="md"
                id="input-event-end"
              />
            </Grid.Col>
          </Grid>

          <Switch
            label="All day"
            checked={allDay}
            onChange={(e) => setAllDay(e.currentTarget.checked)}
            disabled={isClosure}
            color="fastrackRed"
          />
          {!allDay && (
            <Grid gutter="sm">
              <Grid.Col span={6}>
                <TextInput
                  label="Start time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.currentTarget.value)}
                  radius="md"
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <TextInput
                  label="End time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.currentTarget.value)}
                  radius="md"
                />
              </Grid.Col>
            </Grid>
          )}

          <Grid gutter="sm">
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Select
                label="For"
                data={audienceOptions}
                value={audience}
                onChange={(v) => v && setAudience(v as EventAudience)}
                allowDeselect={false}
                radius="md"
                id="select-event-audience"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              {audience === 'CLASS' ? (
                <Select
                  label="Class"
                  placeholder="Choose a class"
                  data={classOptions}
                  value={classId}
                  onChange={setClassId}
                  searchable
                  required
                  radius="md"
                  id="select-event-class"
                />
              ) : (
                <TextInput
                  label="Location"
                  placeholder="e.g. Main hall"
                  value={location}
                  onChange={(e) => setLocation(e.currentTarget.value)}
                  maxLength={150}
                  radius="md"
                />
              )}
            </Grid.Col>
            {audience === 'CLASS' && (
              <Grid.Col span={12}>
                <TextInput
                  label="Location"
                  placeholder="e.g. National Museum, Accra"
                  value={location}
                  onChange={(e) => setLocation(e.currentTarget.value)}
                  maxLength={150}
                  radius="md"
                />
              </Grid.Col>
            )}
          </Grid>

          <Textarea
            label="Details for families and staff"
            placeholder="Instructions, what to bring, pick-up times (optional)"
            value={description}
            onChange={(e) => setDescription(e.currentTarget.value)}
            autosize
            minRows={2}
            maxLength={2000}
            radius="md"
          />

          {event && (
            <Select
              label="Status"
              data={STATUSES.map(({ value, label }) => ({ value, label }))}
              value={status}
              onChange={(v) => v && setStatus(v as EventStatus)}
              allowDeselect={false}
              radius="md"
              id="select-event-status"
            />
          )}

          {isClosure && (
            <Alert icon={<Info size={16} />} color="blue" radius="md">
              <Text size="xs">
                While active, this closure removes its weekdays from the school days used for
                attendance{audience === 'CLASS' ? ', for the chosen class only' : ''}. Postponed or
                cancelled closures do not.
              </Text>
            </Alert>
          )}
          {audience === 'STAFF' && (
            <Text size="xs" c="dimmed">
              Parents never see staff-only events.
            </Text>
          )}

          <Group justify="flex-end">
            <Button variant="default" onClick={onClose} radius="md" disabled={saving}>
              Cancel
            </Button>
            <Button
              type="submit"
              color="fastrackRed"
              loading={saving}
              radius="md"
              id="btn-save-event"
            >
              {event ? 'Save changes' : 'Add event'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
