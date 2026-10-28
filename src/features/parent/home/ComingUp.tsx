'use client';

import { Badge, Card, Group, Stack, Text } from '@mantine/core';
import { CalendarDays } from 'lucide-react';
import { typeInfo, type SchoolEvent } from '@/features/calendar/api';
import { formatSpan, todayIso } from '@/features/calendar/dates';
import { upcomingEvents } from '../domain/calendar';

/** The next few events on the ward's school calendar this term. */
export function ComingUp({ events }: { events: SchoolEvent[] }) {
  const upcoming = upcomingEvents(events, todayIso());
  return (
    <Card withBorder radius="lg" padding="md">
      <Group gap={6} mb="sm" c="dimmed">
        <CalendarDays size={14} />
        <Text size="xs" fw={600} tt="uppercase">
          Coming up this term
        </Text>
      </Group>
      {upcoming.length === 0 ? (
        <Text size="sm" c="dimmed">
          Nothing else on the school calendar this term.
        </Text>
      ) : (
        <Stack gap="sm">
          {upcoming.map((event) => (
            <EventRow key={event.id} event={event} />
          ))}
        </Stack>
      )}
    </Card>
  );
}

function EventRow({ event }: { event: SchoolEvent }) {
  const type = typeInfo(event.type);
  return (
    <Group wrap="nowrap" align="flex-start" justify="space-between">
      <div style={{ minWidth: 0 }}>
        <Text size="sm" fw={600}>
          {event.title}
        </Text>
        <Text size="xs" c="dimmed">
          {formatSpan(event.startDate, event.endDate)}
          {event.startTime && `, ${event.startTime}`}
          {event.location && ` · ${event.location}`}
        </Text>
      </div>
      <Group gap={6} wrap="nowrap">
        {event.status === 'POSTPONED' && (
          <Badge variant="light" color="yellow">
            Postponed
          </Badge>
        )}
        <Badge variant="light" color={type.color}>
          {type.label}
        </Badge>
      </Group>
    </Group>
  );
}
