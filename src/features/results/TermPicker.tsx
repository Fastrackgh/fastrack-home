'use client';

import { useEffect, useState } from 'react';
import { Select } from '@mantine/core';
import { isDated, setupApi, termOption, type TermInYear } from '@/features/school-setup/api';
import { errorMessage } from '@/lib/api-client';

/** Every term of every year, choosing the current one first; `error` when they can't load. */
export function useTerms() {
  const [terms, setTerms] = useState<TermInYear[] | null>(null);
  const [termId, setTermId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setupApi
      .listTerms()
      .then((list) => {
        setTerms(list);
        // Marks and reports need a dated term, so an undated one is never the default.
        setTermId(
          (current) =>
            current ?? list.find((t) => t.isCurrent)?.termId ?? list.find(isDated)?.termId ?? null,
        );
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
  terms: TermInYear[] | null;
  termId: string | null;
  onChange: (termId: string) => void;
}) {
  return (
    <Select
      label="Term"
      data={(terms ?? []).map(termOption)}
      value={termId}
      onChange={(v) => v && onChange(v)}
      allowDeselect={false}
      radius="md"
      w={320}
    />
  );
}
