/* lib/workouts/records.ts */

/* Epley coefficient, the same one MuscleRankPalette ranks with */
const EPLEY = 0.0333;

export interface BestSet {
  weight_kg: number;
  reps: number;
}

export interface ExerciseRecords {
  max1RM: number;
  maxVolume: number;
  maxDistance: number;
  maxDuration: number;
  /* Keyed by zero based set index, so set 3 is only compared against set 3 */
  bestSets: Record<number, BestSet>;
}

export interface HistorySet {
  weight_kg?: number | string | null;
  reps?: number | string | null;
  distance_km?: number | string | null;
  duration_minutes?: number | string | null;
  set_number?: number | null;
}

export const EMPTY_RECORDS: ExerciseRecords = {
  max1RM: 0,
  maxVolume: 0,
  maxDistance: 0,
  maxDuration: 0,
  bestSets: {},
};

/* Estimated one rep max, zero when either input is missing */
export function estimate1RM(weight: number, reps: number) {
  if (weight <= 0 || reps <= 0) return 0;
  return weight * (1 + EPLEY * reps);
}

/* A set beats another when it is heavier, or matches the weight for more reps */
export function beatsSet(candidate: BestSet, best: BestSet) {
  if (candidate.weight_kg > best.weight_kg) return true;
  return candidate.weight_kg === best.weight_kg && candidate.reps > best.reps;
}

/* Roll a full set history down into the three records worth celebrating */
export function summarizeHistory(history: HistorySet[]): ExerciseRecords {
  const records: ExerciseRecords = {
    max1RM: 0,
    maxVolume: 0,
    maxDistance: 0,
    maxDuration: 0,
    bestSets: {},
  };

  for (const entry of history) {
    const weight = Number(entry.weight_kg) || 0;
    const reps = Number(entry.reps) || 0;
    const distance = Number(entry.distance_km) || 0;
    const duration = Number(entry.duration_minutes) || 0;

    // Strength records
    if (weight > 0 && reps > 0) {
      records.max1RM = Math.max(records.max1RM, estimate1RM(weight, reps));
      records.maxVolume = Math.max(records.maxVolume, weight * reps);

      /* set_number is one based on the wire, bestSets is zero based */
      const index = (entry.set_number || 1) - 1;
      const candidate = { weight_kg: weight, reps };
      const best = records.bestSets[index];
      if (!best || beatsSet(candidate, best))
        records.bestSets[index] = candidate;
    }

    // Cardio records
    if (distance > 0)
      records.maxDistance = Math.max(records.maxDistance, distance);
    if (duration > 0)
      records.maxDuration = Math.max(records.maxDuration, duration);
  }

  return records;
}

export interface RecordCheck {
  is1RM: boolean;
  isVolume: boolean;
  isSetProgression: boolean;
  isDistance: boolean;
  isDuration: boolean;
  /* True the first time a set index is logged, so nothing is celebrated yet */
  isFirstForSet: boolean;
  /* Whether anything changed and the cache is worth rewriting */
  changed: boolean;
  records: ExerciseRecords;
}

/*
 * Compare a set just ticked off against the stored records and return both the
 * verdict and the updated records. A zero baseline is treated as no history
 * rather than as a record to beat, or the very first set of every exercise
 * would fire a personal best toast
 */
export function checkSetAgainstRecords(
  records: ExerciseRecords,
  setIndex: number,
  weight: number,
  reps: number,
  distance: number = 0,
  duration: number = 0,
): RecordCheck {
  const next: ExerciseRecords = {
    ...records,
    bestSets: { ...records.bestSets },
  };
  const verdict = {
    is1RM: false,
    isVolume: false,
    isSetProgression: false,
    isDistance: false,
    isDuration: false,
    isFirstForSet: false,
  };

  if (weight <= 0 && reps <= 0 && distance <= 0 && duration <= 0) {
    return { ...verdict, changed: false, records };
  }

  // Evaluate Strength
  if (weight > 0 && reps > 0) {
    const e1RM = estimate1RM(weight, reps);
    const volume = weight * reps;

    if (next.max1RM > 0 && e1RM > next.max1RM) {
      verdict.is1RM = true;
      next.max1RM = e1RM;
    }
    if (next.maxVolume > 0 && volume > next.maxVolume) {
      verdict.isVolume = true;
      next.maxVolume = volume;
    }

    const candidate = { weight_kg: weight, reps };
    const best = next.bestSets[setIndex];
    if (!best) {
      verdict.isFirstForSet = true;
      next.bestSets[setIndex] = candidate;
    } else if (beatsSet(candidate, best)) {
      verdict.isSetProgression = true;
      next.bestSets[setIndex] = candidate;
    }
  }

  // Evaluate Cardio
  if (distance > 0 && next.maxDistance > 0 && distance > next.maxDistance) {
    verdict.isDistance = true;
  }
  if (distance > 0) next.maxDistance = Math.max(next.maxDistance, distance);

  if (duration > 0 && next.maxDuration > 0 && duration > next.maxDuration) {
    verdict.isDuration = true;
  }
  if (duration > 0) next.maxDuration = Math.max(next.maxDuration, duration);

  const changed =
    verdict.is1RM ||
    verdict.isVolume ||
    verdict.isSetProgression ||
    verdict.isFirstForSet ||
    verdict.isDistance ||
    verdict.isDuration;

  return { ...verdict, changed, records: changed ? next : records };
}

/* The one toast to show for a set, highest record first, or null for none */
export function recordToast(
  check: RecordCheck,
  exerciseName: string,
  setIndex: number,
) {
  if (check.isDistance) {
    return {
      icon: '🏃',
      duration: 4000,
      message: `New distance record for ${exerciseName}!`,
    };
  }
  if (check.isDuration) {
    return {
      icon: '⏱️',
      duration: 4000,
      message: `New duration record for ${exerciseName}!`,
    };
  }
  if (check.is1RM) {
    return {
      icon: '🏆',
      duration: 4000,
      message: `New 1RM for ${exerciseName}`,
    };
  }
  if (check.isVolume) {
    return {
      icon: '📈',
      duration: 4000,
      message: `New volume PR for ${exerciseName}`,
    };
  }
  if (check.isSetProgression) {
    return {
      icon: '🔥',
      duration: 3000,
      message: `Set progression: you beat your best set ${setIndex + 1}`,
    };
  }
  return null;
}
