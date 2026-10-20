import { useCallback, useState } from 'react';
import type { DocumentLayout } from '../api';

const LIMIT = 100;

/** The design being edited, with undo/redo. */
export function useLayoutHistory(initial: DocumentLayout | null) {
  const [state, setState] = useState<{
    past: DocumentLayout[];
    present: DocumentLayout | null;
    future: DocumentLayout[];
  }>({ past: [], present: initial, future: [] });

  /** Replaces the design without history (e.g. when opening another version). */
  const reset = useCallback((layout: DocumentLayout | null) => {
    setState({ past: [], present: layout, future: [] });
  }, []);

  const change = useCallback((next: DocumentLayout) => {
    setState((s) => ({
      past: s.present ? [...s.past, s.present].slice(-LIMIT) : s.past,
      present: next,
      future: [],
    }));
  }, []);

  const undo = useCallback(() => {
    setState((s) =>
      s.past.length === 0 || !s.present
        ? s
        : {
            past: s.past.slice(0, -1),
            present: s.past[s.past.length - 1],
            future: [s.present, ...s.future],
          },
    );
  }, []);

  const redo = useCallback(() => {
    setState((s) =>
      s.future.length === 0 || !s.present
        ? s
        : { past: [...s.past, s.present], present: s.future[0], future: s.future.slice(1) },
    );
  }, []);

  return {
    layout: state.present,
    change,
    reset,
    undo,
    redo,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  };
}
