'use client';

import { useEffect, useState } from 'react';

/** Seconds left on a timer that `start` resets, e.g. before a code can be resent. */
export function useCountdown() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  return { seconds, start: setSeconds };
}
