'use client';

import { useEffect, useRef, useState } from 'react';
import { Select, type SelectProps } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { feesApi, type StudentOption } from './api';

export interface PickedStudent {
  value: string;
  label: string;
}

/** "Ama Mensah (FIS/STD/2026/014) • Basic 4". */
export const studentLabel = (s: StudentOption) =>
  [`${s.fullName} (${s.studentCode || 'no code'})`, s.className].filter(Boolean).join(' • ');

/**
 * A pupil picker that asks the server as the user types, so a school of any
 * size can pick any pupil (QA-030). Its value is the enrolment id, which the
 * payments filter needs and the other fee endpoints accept. The chosen pupil
 * stays listed while new results load, so its name never disappears.
 */
export function StudentPicker({
  value,
  onChange,
  ...props
}: Omit<
  SelectProps,
  'data' | 'value' | 'onChange' | 'searchable' | 'searchValue' | 'onSearchChange' | 'filter'
> & {
  value: string | null;
  onChange: (value: string | null, picked: PickedStudent | null) => void;
}) {
  const [search, setSearch] = useState('');
  const [query] = useDebouncedValue(search.trim(), 300);
  const [results, setResults] = useState<PickedStudent[]>([]);
  const [picked, setPicked] = useState<PickedStudent | null>(null);
  const [loading, setLoading] = useState(false);
  const latest = useRef(0);

  useEffect(() => {
    // Typing the chosen pupil's own label (Mantine does on select) isn't a new search.
    if (picked && query === picked.label) return;
    const request = ++latest.current;
    setLoading(true);
    feesApi
      .searchStudents(query)
      .then((list) => {
        // An older, slower answer must not replace a newer one.
        if (request === latest.current)
          setResults(list.map((s) => ({ value: s.id, label: studentLabel(s) })));
      })
      .catch(() => request === latest.current && setResults([]))
      .finally(() => request === latest.current && setLoading(false));
  }, [query, picked]);

  const data =
    picked && !results.some((r) => r.value === picked.value) ? [picked, ...results] : results;

  return (
    <Select
      {...props}
      data={data}
      value={value}
      onChange={(next) => {
        const option = data.find((o) => o.value === next) ?? null;
        setPicked(option);
        onChange(next, option);
      }}
      searchable
      searchValue={search}
      onSearchChange={setSearch}
      // The server has already matched names and codes.
      filter={({ options }) => options}
      nothingFoundMessage={loading ? 'Searching…' : query ? 'No pupil matches' : 'No pupils'}
    />
  );
}
