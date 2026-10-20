'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Alert, Button, Loader, Text } from '@mantine/core';
import { dataScopeOf } from '@/lib/rbac';
import { useViewer } from '@/features/workspace';
import type { Area, DashboardData, DashboardRepository, RecordRow, Viewer } from './model';
import { previewRepository } from './fixtures';
import { isClosedTerm } from './phase-one/domain';
import { usePhaseState, type PhaseStore } from './phase-one/usePhaseState';
import styles from './Dashboard.module.css';

interface Workspace {
  /** Who is signed in: decides which areas open. */
  viewer: Viewer;
  /** The viewer acting in the selected term: read-only when the term is closed. Use it for every action. */
  actor: Viewer;
  term: string;
  /** Whether the selected term is closed, so nothing in it can change. */
  termClosed: boolean;
  setTerm: (term: string) => void;
  /** The selected child; only meaningful for viewers scoped to their own children. */
  child: string;
  setChild: (child: string) => void;
  data: DashboardData | null;
  loading: boolean;
  error: string;
  retry: () => void;
  phase: PhaseStore;
  /** Replaces a summary panel's rows after a preview action. */
  savePanelRows: (area: Area, rows: RecordRow[]) => void;
}

const WorkspaceContext = createContext<Workspace | null>(null);

/**
 * The preview workspace state shared by the overview and every preview area:
 * the selected term and child, the loaded sample data and the phase-one
 * store. Mounted by the dashboard layout, so it survives moving between
 * dashboard routes.
 */
export function WorkspaceProvider({
  children,
  repository = previewRepository,
}: {
  children: ReactNode;
  repository?: DashboardRepository;
}) {
  const viewer = useViewer();
  if (!viewer) return null;
  return (
    <WorkspaceState viewer={viewer} repository={repository}>
      {children}
    </WorkspaceState>
  );
}

function WorkspaceState({
  viewer,
  repository,
  children,
}: {
  viewer: Viewer;
  repository: DashboardRepository;
  children: ReactNode;
}) {
  const ownChildrenOnly = dataScopeOf(viewer.role) === 'own_children';
  const [term, setTerm] = useState('2026-1');
  const [child, setChild] = useState('abena');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const phase = usePhaseState(viewer, term, child);
  const termClosed = isClosedTerm(term);
  const actor = useMemo(
    () => (termClosed ? { ...viewer, readOnly: true } : viewer),
    [viewer, termClosed],
  );

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setData(null);
    repository
      .load({
        viewer,
        termId: term,
        childId: ownChildrenOnly ? child : undefined,
        signal: controller.signal,
      })
      .then((result) => {
        if (!controller.signal.aborted) setData(result);
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : 'Unable to load dashboard');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [viewer, ownChildrenOnly, term, child, reload, repository]);

  const savePanelRows = useCallback((area: Area, rows: RecordRow[]) => {
    setData((current) => {
      const panel = current?.panels[area];
      return current && panel
        ? {
            ...current,
            panels: { ...current.panels, [area]: { ...panel, rows } },
          }
        : current;
    });
  }, []);

  return (
    <WorkspaceContext.Provider
      value={{
        viewer,
        actor,
        term,
        termClosed,
        setTerm,
        child,
        setChild,
        data,
        loading,
        error,
        retry: () => setReload((n) => n + 1),
        phase,
        savePanelRows,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const workspace = useContext(WorkspaceContext);
  if (!workspace) throw new Error('useWorkspace must be used within a WorkspaceProvider');
  return workspace;
}

/** Renders `children` once the workspace data has loaded, with loading and error states. */
export function WorkspaceContent({ children }: { children: (data: DashboardData) => ReactNode }) {
  const { data, loading, error, retry } = useWorkspace();
  if (loading)
    return (
      <div className={styles.state} role="status">
        <Loader color="red" />
        <Text mt="md">Loading your workspace…</Text>
      </div>
    );
  if (error)
    return (
      <Alert mt="lg" color="red" title="Unable to load workspace">
        <Text>{error}</Text>
        <Button mt="sm" onClick={retry}>
          Try again
        </Button>
      </Alert>
    );
  return data ? children(data) : null;
}
