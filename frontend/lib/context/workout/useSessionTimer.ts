'use client';

import { useEffect, useState } from 'react';

/* Wall clock for the session, ticking once a second while a workout is open
   and not paused. Completed sessions stop counting */
export function useSessionTimer(isRunning: boolean) {
  const [elapsed, setElapsed] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!isRunning || isPaused) return;
    const interval = setInterval(() => setElapsed((prev) => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [isRunning, isPaused]);

  return {
    elapsed,
    setElapsed,
    isPaused,
    setIsPaused,
    toggle: () => setIsPaused((prev) => !prev),
    override: (seconds: number) => setElapsed(seconds),
  };
}
