'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { PREV_SETS_KEY, readJson, writeJson } from '@/lib/offline/storage';
import { EMPTY_RECORDS, summarizeHistory } from '@/lib/workouts/records';
import type { ExerciseRecords } from '@/lib/workouts/records';
import type { WorkoutExercise } from '@/lib/workouts/sets';

const PR_KEY = 'fittracker.workout.prs.v1';
const HISTORY_LIMIT = 100;

type PreviousSets = Record<string, any[]>;
type Records = Record<string, ExerciseRecords>;

async function authHeaders() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;
  return { Authorization: `Bearer ${session.access_token}` };
}

/*
 * Last session's sets for the greyed preview column, plus all time records for
 * the personal best toasts. Both are cached in localStorage and read back
 * before the network is touched, so a gym with no signal still shows the
 * numbers from the last time the app was online
 */
export function useExerciseHistory(exercises: WorkoutExercise[]) {
  const [previousSets, setPreviousSets] = useState<PreviousSets>({});
  const [records, setRecords] = useState<Records>({});

  useEffect(() => {
    const cachedSets = readJson<PreviousSets>(PREV_SETS_KEY, {});
    if (Object.keys(cachedSets).length > 0) setPreviousSets(cachedSets);

    const cachedRecords = readJson<Records>(PR_KEY, {});
    if (Object.keys(cachedRecords).length > 0) setRecords(cachedRecords);
  }, []);

  useEffect(() => {
    if (exercises.length === 0) return;

    let cancelled = false;

    const fetchMissing = async () => {
      const headers = await authHeaders();
      if (!headers) return;

      const nextSets = { ...previousSets };
      const nextRecords = { ...records };
      let changed = false;

      for (const ex of exercises) {
        /* Only exercises with nothing cached are fetched, so adding one
           exercise to a session does not refetch the whole board */
        if (nextSets[ex.name]) continue;

        const base = `${process.env.NEXT_PUBLIC_API_URL}/workouts/exercises/${encodeURIComponent(ex.name)}`;

        try {
          const lastRes = await fetch(`${base}/last-sets`, { headers });
          if (lastRes.ok) {
            nextSets[ex.name] = await lastRes.json();
            changed = true;
          }

          const historyRes = await fetch(
            `${base}/history?limit=${HISTORY_LIMIT}`,
            { headers },
          );
          if (historyRes.ok) {
            nextRecords[ex.name] = summarizeHistory(await historyRes.json());
            changed = true;
          }
        } catch {
          /* Offline is expected here, the cached values stay in place */
        }
      }

      if (!changed || cancelled) return;
      setPreviousSets(nextSets);
      writeJson(PREV_SETS_KEY, nextSets);
      setRecords(nextRecords);
      writeJson(PR_KEY, nextRecords);
    };

    fetchMissing();
    return () => {
      cancelled = true;
    };
  }, [exercises, previousSets, records]);

  const recordsFor = useCallback(
    (exerciseName: string) => records[exerciseName] ?? EMPTY_RECORDS,
    [records],
  );

  const saveRecords = useCallback(
    (exerciseName: string, next: ExerciseRecords) => {
      setRecords((prev) => {
        const merged = { ...prev, [exerciseName]: next };
        writeJson(PR_KEY, merged);
        return merged;
      });
    },
    [],
  );

  const clear = useCallback(() => setPreviousSets({}), []);

  /* hasRecordsFor separates a genuinely new exercise from one whose history is
     still loading, so the first set logged does not fire a false record */
  const hasRecordsFor = useCallback(
    (exerciseName: string) => exerciseName in records,
    [records],
  );

  return { previousSets, recordsFor, hasRecordsFor, saveRecords, clear };
}

export { PR_KEY };
