'use client';

import { useCallback, useState } from 'react';

interface RunOptions {
  /** Turns the failure into the message shown to the parent. */
  failure: (error: unknown) => string;
  /**
   * Keep `busy` after success, for an action that leaves the page (a sign-in,
   * a redirect to the payment provider), so the button can't be tapped again.
   */
  holdOnSuccess?: boolean;
}

/**
 * The busy flag and error message of a button that sends something. `run`
 * resolves to true when the action succeeded.
 */
export function useAsyncAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (action: () => Promise<unknown>, { failure, holdOnSuccess }: RunOptions) => {
      setError(null);
      setBusy(true);
      try {
        await action();
        if (!holdOnSuccess) setBusy(false);
        return true;
      } catch (err) {
        setError(failure(err));
        setBusy(false);
        return false;
      }
    },
    [],
  );

  const clearError = useCallback(() => setError(null), []);

  return { busy, error, run, setError, clearError };
}
