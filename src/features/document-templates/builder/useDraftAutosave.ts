'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { DocumentLayout, DocumentTemplatesApi } from '../api';

export type SaveState = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

interface Draft {
  /** The design this edit belongs to, captured with it (QA-064). */
  id: string;
  layout: DocumentLayout;
  json: string;
}

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

/**
 * Saves a draft design shortly after each edit. An edit is kept with the id
 * of the design it was made on, so switching versions can never save one
 * design onto another (QA-064). Saves run one at a time, in order, and
 * `flush()` sends any edit still waiting, so the builder can save before it
 * switches, publishes or is left (QA-065, QA-066).
 */
export function useDraftAutosave({
  api,
  templateId,
  layout,
  editable,
  delay = 1200,
}: {
  api: DocumentTemplatesApi;
  templateId: string | null;
  layout: DocumentLayout | null;
  editable: boolean;
  delay?: number;
}) {
  const [state, setState] = useState<SaveState>('idle');
  const [error, setError] = useState<string | null>(null);
  const lastSaved = useRef<{ id: string | null; json: string }>({ id: null, json: 'null' });
  const pending = useRef<Draft | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  const stopTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  /** Sends the edit that is waiting, if any. Resolves false when it couldn't be saved. */
  const flush = useCallback((): Promise<boolean> => {
    stopTimer();
    const run = queue.current.then(async () => {
      const draft = pending.current;
      if (!draft) return true;
      if (draft.id === lastSaved.current.id && draft.json === lastSaved.current.json) {
        pending.current = null;
        return true;
      }
      setState('saving');
      try {
        await api.update(draft.id, { layout: draft.layout });
        lastSaved.current = { id: draft.id, json: draft.json };
        // An edit made while this one was saving stays waiting for its own save.
        if (pending.current === draft) pending.current = null;
        setState(pending.current ? 'pending' : 'saved');
        setError(null);
        return true;
      } catch (e) {
        setState('error');
        setError(errorMessage(e, 'Could not save.'));
        return false;
      }
    });
    queue.current = run;
    return run;
  }, [api]);

  /** Starts from a design as the server has it, with nothing waiting to save. */
  const markSaved = useCallback((id: string | null, saved: DocumentLayout | null) => {
    stopTimer();
    pending.current = null;
    lastSaved.current = { id, json: JSON.stringify(saved ?? null) };
    setState('idle');
    setError(null);
  }, []);

  // Each edit waits `delay` for the next one, then saves.
  useEffect(() => {
    if (!editable || !templateId || !layout) return;
    const json = JSON.stringify(layout);
    if (templateId === lastSaved.current.id && json === lastSaved.current.json) return;
    pending.current = { id: templateId, layout, json };
    setState('pending');
    stopTimer();
    timer.current = setTimeout(() => void flush(), delay);
  }, [editable, templateId, layout, delay, flush]);

  // Warn before the tab is closed with an edit unsaved, and send it when the builder goes.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (pending.current) e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => {
      window.removeEventListener('beforeunload', warn);
      if (pending.current) void flush();
    };
  }, [flush]);

  return {
    state,
    error,
    flush,
    markSaved,
    /** True while an edit hasn't reached the server. */
    dirty: () => pending.current !== null,
  };
}
