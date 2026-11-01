'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, errorMessage } from '@/lib/api-client';
import type { DocumentLayout, DocumentTemplatesApi } from '../api';

export type SaveState = 'idle' | 'pending' | 'saving' | 'saved' | 'error' | 'conflict';

interface Draft {
  /** The design this edit belongs to, captured with it (QA-064). */
  id: string;
  layout: DocumentLayout;
  json: string;
}

/**
 * Saves a draft design shortly after each edit. An edit is kept with the id
 * of the design it was made on, so switching versions can never save one
 * design onto another (QA-064). Saves run one at a time, in order, and
 * `flush()` sends any edit still waiting, so the builder can save before it
 * switches, publishes or is left (QA-065, QA-066).
 *
 * Each save carries the `updatedAt` the server last gave this design. If the
 * draft was changed somewhere else meanwhile, the save is refused and the
 * edit waits in a 'conflict' state until the person reloads (losing it) or
 * keeps theirs (QA-067).
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
  const lastSaved = useRef<{ id: string | null; json: string; updatedAt: string | null }>({
    id: null,
    json: 'null',
    updatedAt: null,
  });
  const pending = useRef<Draft | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  /** Set by a 409 until the person reloads or keeps theirs. */
  const conflicted = useRef(false);

  const stopTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  /**
   * Sends the edit that is waiting, if any. Resolves false when it couldn't be
   * saved. `overwrite` saves it even over someone else's change ("Keep mine").
   */
  const flush = useCallback(
    (overwrite = false): Promise<boolean> => {
      stopTimer();
      const run = queue.current.then(async () => {
        const draft = pending.current;
        if (!draft) return true;
        if (draft.id === lastSaved.current.id && draft.json === lastSaved.current.json) {
          pending.current = null;
          return true;
        }
        setState('saving');
        const known = lastSaved.current.id === draft.id ? lastSaved.current.updatedAt : null;
        try {
          const saved = await api.update(draft.id, {
            layout: draft.layout,
            ...(known && !overwrite ? { expectedUpdatedAt: known } : {}),
          });
          lastSaved.current = { id: draft.id, json: draft.json, updatedAt: saved.updatedAt };
          conflicted.current = false;
          // An edit made while this one was saving stays waiting for its own save.
          if (pending.current === draft) pending.current = null;
          setState(pending.current ? 'pending' : 'saved');
          setError(null);
          return true;
        } catch (e) {
          if (e instanceof ApiError && e.statusCode === 409) {
            // Changed elsewhere: keep the edit waiting; the person chooses.
            conflicted.current = true;
            setState('conflict');
            setError(null);
            return false;
          }
          setState('error');
          setError(errorMessage(e, 'Could not save.'));
          return false;
        }
      });
      queue.current = run;
      return run;
    },
    [api],
  );

  /** Starts from a design as the server has it, with nothing waiting to save. */
  const markSaved = useCallback(
    (template: { id: string; layout: DocumentLayout | null; updatedAt: string } | null) => {
      stopTimer();
      pending.current = null;
      conflicted.current = false;
      lastSaved.current = {
        id: template?.id ?? null,
        json: JSON.stringify(template?.layout ?? null),
        updatedAt: template?.updatedAt ?? null,
      };
      setState('idle');
      setError(null);
    },
    [],
  );

  /** Another save of this design (e.g. a rename) moved its `updatedAt`. */
  const noteUpdatedAt = useCallback((id: string, updatedAt: string) => {
    if (lastSaved.current.id === id) lastSaved.current.updatedAt = updatedAt;
  }, []);

  // Each edit waits `delay` for the next one, then saves.
  useEffect(() => {
    if (!editable || !templateId || !layout) return;
    const json = JSON.stringify(layout);
    if (templateId === lastSaved.current.id && json === lastSaved.current.json) return;
    pending.current = { id: templateId, layout, json };
    stopTimer();
    // While in conflict, edits wait for Reload or Keep mine rather than retrying.
    if (conflicted.current) return;
    setState('pending');
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
    noteUpdatedAt,
    /** Saves the waiting edit over the other change (QA-067 "Keep mine"). */
    keepMine: () => flush(true),
    /** True while an edit hasn't reached the server. */
    dirty: () => pending.current !== null,
  };
}
