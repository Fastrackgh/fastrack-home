'use client';

import { ActionIcon, Box, Group, Text, Tooltip, UnstyledButton } from '@mantine/core';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { typeInfo, type SchoolEvent, type Term } from './api';
import { formatMonth, isWeekend, monthWeeks, todayIso } from './dates';
import classes from './MonthGrid.module.css';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MAX_PER_DAY = 3;

export function MonthGrid({
  month,
  months,
  onMonthChange,
  term,
  events,
  onEventClick,
  onDayClick,
}: {
  /** First day of the month shown, YYYY-MM-01. */
  month: string;
  /** The months the term spans; navigation stays inside them. */
  months: string[];
  onMonthChange: (month: string) => void;
  term: Term;
  events: SchoolEvent[];
  /** Both absent when the viewer may not change events. */
  onEventClick?: (event: SchoolEvent) => void;
  onDayClick?: (day: string) => void;
}) {
  const index = months.indexOf(month);
  const today = todayIso();
  const inMonth = (day: string) => day.slice(0, 7) === month.slice(0, 7);
  const inTerm = (day: string) => day >= term.startDate && day <= term.endDate;

  return (
    <Box>
      <Group justify="space-between" mb="sm">
        <ActionIcon
          variant="subtle"
          aria-label="Previous month"
          disabled={index <= 0}
          onClick={() => onMonthChange(months[index - 1])}
        >
          <ChevronLeft size={18} />
        </ActionIcon>
        <Text fw={700}>{formatMonth(month)}</Text>
        <ActionIcon
          variant="subtle"
          aria-label="Next month"
          disabled={index >= months.length - 1}
          onClick={() => onMonthChange(months[index + 1])}
        >
          <ChevronRight size={18} />
        </ActionIcon>
      </Group>

      <div className={classes.scroller}>
        <div className={classes.grid} role="grid" aria-label={formatMonth(month)}>
          {WEEKDAYS.map((d) => (
            <div key={d} className={classes.weekday} role="columnheader">
              {d}
            </div>
          ))}
          {monthWeeks(month)
            .flat()
            .map((day) => {
              const dayEvents = events.filter((e) => e.startDate <= day && day <= e.endDate);
              const addable = onDayClick && inTerm(day) && inMonth(day);
              return (
                <div
                  key={day}
                  role="gridcell"
                  className={classes.day}
                  data-outside={!inMonth(day) || undefined}
                  data-off-term={!inTerm(day) || undefined}
                  data-weekend={isWeekend(day) || undefined}
                  data-today={day === today || undefined}
                >
                  {addable ? (
                    <Tooltip label="Add an event on this day" withArrow openDelay={400}>
                      <UnstyledButton className={classes.dayNumber} onClick={() => onDayClick(day)}>
                        {Number(day.slice(8))}
                      </UnstyledButton>
                    </Tooltip>
                  ) : (
                    <span className={classes.dayNumber}>{Number(day.slice(8))}</span>
                  )}
                  {inMonth(day) &&
                    dayEvents.slice(0, MAX_PER_DAY).map((event) => {
                      const chip = {
                        className: classes.chip,
                        'data-color': typeInfo(event.type).color,
                        'data-status': event.status,
                        title: event.title,
                        children: `${event.startTime && event.startDate === day ? `${event.startTime} ` : ''}${event.title}`,
                      };
                      return onEventClick ? (
                        <UnstyledButton
                          key={event.id}
                          {...chip}
                          onClick={() => onEventClick(event)}
                        />
                      ) : (
                        <span key={event.id} {...chip} />
                      );
                    })}
                  {inMonth(day) && dayEvents.length > MAX_PER_DAY && (
                    <Text size="xs" c="dimmed" px={4}>
                      +{dayEvents.length - MAX_PER_DAY} more
                    </Text>
                  )}
                </div>
              );
            })}
        </div>
      </div>
    </Box>
  );
}
