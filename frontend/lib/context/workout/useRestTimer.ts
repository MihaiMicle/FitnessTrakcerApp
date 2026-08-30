'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { clampRestSeconds } from '@/lib/workouts/rest';
import {
  notifyRestComplete,
  requestRestNotificationPermission,
} from '@/lib/workouts/restNotify';
import type { RestState } from './types';

/* Ticks four times a second so the displayed number never lags a full second
   behind the deadline it is derived from */
const TICK_MS = 250;

export function useRestTimer() {
  const [rest, setRest] = useState<RestState | null>(null);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!rest) return;

    /* Guard against the interval firing again between hitting zero and the
       state update that clears it */
    let finished = false;

    const tick = () => {
      const left = Math.max(0, Math.ceil((rest.endsAt - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0 && !finished) {
        finished = true;
        notifyRestComplete(rest.label);
        toast.success(`Rest over • ${rest.label}`, { id: 'rest-timer' });
        setRest(null);
        setRemaining(0);
      }
    };

    tick();
    const interval = setInterval(tick, TICK_MS);
    return () => clearInterval(interval);
  }, [rest]);

  const start = useCallback((seconds: number, label: string) => {
    const total = clampRestSeconds(seconds);
    if (total <= 0) return;
    requestRestNotificationPermission();
    setRest({ endsAt: Date.now() + total * 1000, total, label });
    setRemaining(total);
  }, []);

  /* Both the clear paths reset the display, so the effect never has to write
     state on the way in */
  const skip = useCallback(() => {
    setRest(null);
    setRemaining(0);
  }, []);

  /* Adding time pushes the deadline out, and the total grows with it so the
     progress ring does not jump backwards past full */
  const adjust = useCallback((deltaSeconds: number) => {
    setRest((prev) => {
      if (!prev) return prev;
      const left = Math.max(0, Math.ceil((prev.endsAt - Date.now()) / 1000));
      const nextLeft = Math.max(0, left + deltaSeconds);
      if (nextLeft === 0) return null;
      return {
        ...prev,
        endsAt: Date.now() + nextLeft * 1000,
        total: Math.max(prev.total, nextLeft),
      };
    });
  }, []);

  return {
    label: rest?.label || '',
    total: rest?.total || 0,
    isResting: rest !== null,
    remaining,
    reset: skip,
    start,
    skip,
    adjust,
  };
}
