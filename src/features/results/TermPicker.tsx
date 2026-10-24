'use client';

import { useEffect, useState } from 'react';
import { Select } from '@mantine/core';
import { errorMessage, setupApi, type AcademicTerm } from '@/features/school-setup/api';

export type TermOption = AcademicTerm & { yearLabel: string };

/** Every term of every year, choosing the current one first; `error` when they can't load. */
export function useTerms() {
  const [terms, setTerms] = useState<TermOption[] | null>(null);
  const [termId, setTermId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setupApi
      .listYears()
      .then((years) => {
        const list = years.flatMap((y) => y.terms.map((t) => ({ ...t, yearLabel: y.yearLabel })));
        setTerms(list);
        setTermId((current) => current ?? list.find((t) => t.isCurrent)?.id ?? list[0]?.id ?? null);
      })
      .catch((err) => setError(errorMessage(err, 'Could not load the terms.')));
  }, []);
  return { terms, termId, setTermId, error };
}

export function TermPicker({
  terms,
  termId,
  onChange,
}: {
  terms: TermOption[] | null;
  termId: string | null;
  onChange: (termId: string) => void;
}) {
  return (
    <Select
      label="Term"
      data={(terms ?? []).map((t) => ({
        value: t.id,
        label: `${t.termLabel}, ${t.yearLabel}${t.isCurrent ? ' (current)' : ''}`,
      }))}
      value={termId}
      onChange={(v) => v && onChange(v)}
      allowDeselect={false}
      radius="md"
      w={280}
    />
  );
}
