'use client';

import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { buildDiaryEntryPayload } from '@/lib/nutrition/mealForm';
import { supabase } from '@/lib/supabase';

export type CopyMode = 'from' | 'to';

const logsUrl = (date: string) =>
  `${process.env.NEXT_PUBLIC_API_URL}/logs/${date}`;

/** yyyy-mm-dd for a date offset by `days` from `isoDate`. */
function shiftDate(isoDate: string, days: number): string {
  const date = new Date(isoDate);
  date.setDate(date.getDate() + days);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

interface UseMealCopyOptions {
  mealType: string;
  label: string;
  selectedDate: string;
  meals: any[];
  onAddMeal: (payload: any) => Promise<any>;
}

/** Drives the copy-from / copy-to modal and performs the copy. */
export function useMealCopy({
  mealType,
  label,
  selectedDate,
  meals,
  onAddMeal,
}: UseMealCopyOptions) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<CopyMode>('from');
  const [copyDate, setCopyDate] = useState('');
  const [copyMeal, setCopyMeal] = useState(mealType);

  const close = useCallback(() => setIsOpen(false), []);

  /** Opens the modal, defaulting to yesterday (from) or tomorrow (to). */
  const open = useCallback(
    (nextMode: CopyMode) => {
      if (nextMode === 'to' && meals.length === 0) {
        toast.error('No foods to copy!');
        return;
      }
      setCopyDate(shiftDate(selectedDate, nextMode === 'from' ? -1 : 1));
      setCopyMeal(mealType);
      setMode(nextMode);
      setIsOpen(true);
    },
    [meals.length, selectedDate, mealType],
  );

  /** Pulls the chosen day's meals into this section. */
  const copyFromDay = useCallback(
    async (accessToken: string) => {
      const res = await fetch(logsUrl(copyDate), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (res.status === 404) {
        toast.error(`No logs found for ${copyDate}.`, { id: 'copyMeal' });
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch');

      const data = await res.json();
      const foodsToCopy = (data.meals || []).filter(
        (m: any) => m.meal_type?.toLowerCase() === copyMeal.toLowerCase(),
      );

      if (foodsToCopy.length === 0) {
        toast.error(`No foods logged on ${copyDate}.`, { id: 'copyMeal' });
        return;
      }

      toast.loading(`Copying ${foodsToCopy.length} items...`, {
        id: 'copyMeal',
      });
      for (const food of foodsToCopy)
        await onAddMeal(buildDiaryEntryPayload(food, mealType));

      toast.success(`Copied into ${label}!`, { id: 'copyMeal' });
    },
    [copyDate, copyMeal, mealType, label, onAddMeal],
  );

  /** Pushes this section's meals onto the chosen day. */
  const copyToDay = useCallback(
    async (accessToken: string) => {
      const authHeaders = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      };

      // Touch the target day first so its log row exists.
      await fetch(logsUrl(copyDate), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      for (const food of meals) {
        const payload = buildDiaryEntryPayload(food, copyMeal);

        let res = await fetch(`${logsUrl(copyDate)}/meals`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify(payload),
        });

        // Older backends expose a flat /meals endpoint instead.
        if (res.status === 404 || res.status === 405) {
          res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/meals`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({ ...payload, date: copyDate }),
          });
        }

        if (!res.ok) throw new Error(await res.text());
      }

      toast.success(`Copied to ${copyDate}!`, { id: 'copyMeal' });
    },
    [copyDate, copyMeal, meals],
  );

  const execute = useCallback(async () => {
    setIsOpen(false);
    toast.loading(mode === 'from' ? 'Fetching meals...' : 'Copying meals...', {
      id: 'copyMeal',
    });

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      if (mode === 'from') await copyFromDay(session.access_token);
      else await copyToDay(session.access_token);
    } catch (err: any) {
      toast.error(`Failed: ${err?.message || 'Could not copy meal'}`, {
        id: 'copyMeal',
      });
    }
  }, [mode, copyFromDay, copyToDay]);

  return {
    isOpen,
    mode,
    copyDate,
    setCopyDate,
    copyMeal,
    setCopyMeal,
    open,
    close,
    execute,
  };
}
