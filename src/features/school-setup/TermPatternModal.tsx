'use client';

import { useState } from 'react';
import {
  Alert,
  Button,
  Group,
  Modal,
  NumberInput,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { errorMessage } from '@/lib/api-client';
import { setupApi, type TermPattern } from './api';

/** "3 terms", "2 semesters" or "One period for the whole year". */
export function describePattern(pattern: TermPattern) {
  if (pattern.wholeYear) return 'One period for the whole year';
  const name = pattern.periodName.toLowerCase();
  return `${pattern.periodCount} ${pattern.periodCount === 1 ? name : `${name}s`} a year`;
}

/** How the school divides a year; new years get these periods, undated. */
export function TermPatternModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: TermPattern;
  onClose: () => void;
  onSaved: (pattern: TermPattern) => void;
}) {
  const [wholeYear, setWholeYear] = useState(initial.wholeYear);
  const [periodName, setPeriodName] = useState(initial.periodName);
  const [periodCount, setPeriodCount] = useState<number | string>(initial.periodCount);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const name = periodName.trim();
  const count = Number(periodCount);
  const invalid = !wholeYear && (!name || name.length > 30 || !(count >= 1 && count <= 6));
  const preview: TermPattern = { wholeYear, periodName: name || 'Term', periodCount: count || 1 };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (invalid) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await setupApi.setTermPattern({
        wholeYear,
        periodName: name,
        periodCount: count,
      });
      notifications.show({
        color: 'green',
        title: 'Term pattern saved',
        message: describePattern(saved),
      });
      onSaved(saved);
    } catch (err) {
      setError(errorMessage(err, 'Try again.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal opened onClose={onClose} title="How the school divides a year" radius="lg" centered>
      <form onSubmit={save}>
        <Stack gap="md">
          {error && <Alert color="red">{error}</Alert>}
          <SegmentedControl
            fullWidth
            value={wholeYear ? 'whole' : 'periods'}
            onChange={(v) => setWholeYear(v === 'whole')}
            data={[
              { value: 'periods', label: 'Terms or semesters' },
              { value: 'whole', label: 'The whole year' },
            ]}
          />
          {!wholeYear && (
            <Group grow align="flex-start">
              <TextInput
                label="Each period is called"
                description="Term, Semester, Trimester…"
                value={periodName}
                onChange={(e) => setPeriodName(e.currentTarget.value)}
                maxLength={30}
                required
                radius="md"
              />
              <NumberInput
                label="Periods a year"
                description="From 1 to 6"
                min={1}
                max={6}
                value={periodCount}
                onChange={setPeriodCount}
                required
                radius="md"
              />
            </Group>
          )}
          <Text size="sm" c="dimmed">
            {wholeYear
              ? 'Each new year gets one period, “Whole year”, with the year’s own dates.'
              : `Each new year gets ${Array.from(
                  { length: preview.periodCount },
                  (_, i) => `${preview.periodName} ${i + 1}`,
                ).join(', ')}, without dates; you set each one’s dates when they’re known.`}{' '}
            Years you already have keep their periods.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose} radius="md" disabled={saving}>
              Cancel
            </Button>
            <Button
              type="submit"
              color="fastrackRed"
              loading={saving}
              disabled={invalid}
              radius="md"
            >
              Save
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
