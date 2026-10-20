'use client';
import { useEffect, useRef, useState } from 'react';
import { can, dataScopeOf } from '@/lib/rbac';
import type { Viewer } from '../model';
import { initialPhaseState, PhaseState } from './domain';
export function usePhaseState(viewer: Viewer, term: string, child: string) {
  const dataScope = dataScopeOf(viewer.role);
  const receivesApplications = can(viewer, 'enquiries:manage');
  const scope = `${dataScope}:${term}:${child}`;
  const urls = useRef<string[]>([]);
  const [store, setStore] = useState(() => ({
    scope,
    state: initialPhaseState(dataScope, child),
  }));
  // Scope change resets synchronously, preventing a frame of another child's or term's records.
  if (store.scope !== scope) setStore({ scope, state: initialPhaseState(dataScope, child) });
  useEffect(
    () => () => {
      Object.values(urls.current).forEach(URL.revokeObjectURL);
      urls.current = [];
    },
    [scope],
  );
  useEffect(() => {
    if (!receivesApplications) return;
    const channel = new BroadcastChannel('fastrack-preview-admissions');
    channel.onmessage = (event) => {
      const a = event.data;
      if (
        a?.type !== 'preview-application' ||
        a.termId !== term ||
        !a.values ||
        typeof a.id !== 'string'
      )
        return;
      const required = [
        'name',
        'birthDate',
        'gender',
        'classId',
        'nationality',
        'parent',
        'phone',
        'email',
        'address',
      ];
      if (!required.every((k) => typeof a.values[k] === 'string' && a.values[k].trim())) return;
      setStore((old) =>
        old.state.enquiries.some((e) => e.id === a.id)
          ? old
          : {
              ...old,
              state: {
                ...old.state,
                enquiries: [
                  ...old.state.enquiries,
                  {
                    ...a.values,
                    id: a.id,
                    termId: term,
                    date: new Date().toISOString().slice(0, 10),
                    source: 'Online portal',
                    status: 'Application Submitted',
                    assignedTo: 'Efua Mensah',
                    followUp: '',
                    notes: 'Submitted from the self-service preview.',
                  },
                ],
              },
            },
      );
    };
    return () => channel.close();
  }, [receivesApplications, term]);
  const attach = (file: File) => {
    const url = URL.createObjectURL(file);
    urls.current.push(url);
    return url;
  };
  const update = (change: (state: PhaseState) => PhaseState) =>
    setStore((old) => ({ ...old, state: change(old.state) }));
  return { state: store.state, update, attach };
}
export type PhaseStore = ReturnType<typeof usePhaseState>;
