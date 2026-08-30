/* lib/workouts/session.ts */

/* Elapsed seconds as mm:ss, or h:mm:ss once an hour is passed */
export function formatClock(totalSeconds: number) {
  const safe = Math.max(0, Math.floor(totalSeconds || 0));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  const mm = mins.toString().padStart(2, '0');
  const ss = secs.toString().padStart(2, '0');
  return hrs > 0 ? `${hrs}:${mm}:${ss}` : `${mm}:${ss}`;
}

interface SetLike {
  completed?: boolean;
  weight_kg?: number | string | null;
  reps?: number | string | null;
}

interface ExerciseLike {
  sets?: SetLike[];
}

/* Completed set count and tonnage for a session, counting only ticked sets so
   the header does not credit work that was typed but never done */
export function sessionTotals(exercises: ExerciseLike[] = []) {
  let sets = 0;
  let volume = 0;

  for (const ex of exercises) {
    for (const set of ex.sets ?? []) {
      if (!set.completed) continue;
      sets += 1;
      volume += (Number(set.weight_kg) || 0) * (Number(set.reps) || 0);
    }
  }

  return { sets, volume };
}
