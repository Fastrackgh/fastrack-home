'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { SESSION_STORAGE_KEYS } from '@/lib/api-client';
import type { Ward } from '../types';
import { useWardsQuery } from './queries';
import type { ParentQuery } from './useParentQuery';

interface ActiveWardContextValue {
  wards: Ward[];
  /** The child every page shows; null until wards load, or when none are linked. */
  activeWard: Ward | null;
  selectWard: (studentId: string) => void;
  query: ParentQuery<Ward[]>;
}

const ActiveWardContext = createContext<ActiveWardContextValue | undefined>(undefined);

/** The chosen child, remembered across visits on this device. */
const selectionStore = {
  read(): string | null {
    try {
      return localStorage.getItem(SESSION_STORAGE_KEYS.parentActiveWard);
    } catch {
      return null; // Without storage the first ward is shown.
    }
  },
  write(studentId: string) {
    try {
      localStorage.setItem(SESSION_STORAGE_KEYS.parentActiveWard, studentId);
    } catch {
      // The choice lasts for this visit only.
    }
  },
};

/** Loads the parent's linked children and remembers which one they are looking at. */
export function ActiveWardProvider({ children }: { children: React.ReactNode }) {
  const query = useWardsQuery();
  const wards = useMemo(() => query.data ?? [], [query.data]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => setSelectedId(selectionStore.read()), []);

  const selectWard = useCallback((studentId: string) => {
    setSelectedId(studentId);
    selectionStore.write(studentId);
  }, []);

  // An unlinked or unknown selection falls back to the first child.
  const activeWard = wards.find((w) => w.studentId === selectedId) ?? wards[0] ?? null;

  return (
    <ActiveWardContext.Provider value={{ wards, activeWard, selectWard, query }}>
      {children}
    </ActiveWardContext.Provider>
  );
}

export function useActiveWard() {
  const context = useContext(ActiveWardContext);
  if (!context) throw new Error('useActiveWard must be used within an ActiveWardProvider');
  return context;
}

/**
 * Detail pages (a bill, a receipt, a report) belong to the child shown when
 * they opened; switching child sends the parent back to `listPath`.
 */
export function useLeaveOnWardChange(listPath: string) {
  const router = useRouter();
  const { activeWard } = useActiveWard();
  const openedFor = useRef<string | null>(null);
  const current = activeWard?.studentId ?? null;
  useEffect(() => {
    if (!current) return;
    if (openedFor.current === null) openedFor.current = current;
    else if (openedFor.current !== current) router.replace(listPath);
  }, [current, listPath, router]);
}
