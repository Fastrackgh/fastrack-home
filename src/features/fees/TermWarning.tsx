'use client';

import { Alert } from '@mantine/core';
import { AlertTriangle } from 'lucide-react';
import { todayIso } from '@/features/calendar/dates';
import { outOfTermWarning, type TermInYear } from '@/features/school-setup/api';

/** Shown under a billing form's term when today isn't in that term (QA-061). */
export function TermWarning({
  termId,
  terms,
  what,
}: {
  termId: string | null;
  terms: TermInYear[];
  /** Starts the last sentence, e.g. "These bills" or "These fees". */
  what?: string;
}) {
  const term = terms.find((t) => t.termId === termId);
  const message = outOfTermWarning(term, terms, todayIso(), what);
  if (!message) return null;
  return (
    <Alert color="orange" radius="md" icon={<AlertTriangle size={16} />} title="Not today's term">
      {message}
    </Alert>
  );
}
