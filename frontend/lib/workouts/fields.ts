/* lib/workouts/fields.ts */

/* Tracking field to the set property it writes, shared by the live logger and
   the workout context so a rename cannot drift between them */
export const FIELD_KEYS: Record<string, string> = {
  weight: 'weight_kg',
  reps: 'reps',
  rir: 'rir',
  time: 'duration_minutes',
  distance: 'distance_km',
  incline: 'incline',
  speed: 'speed',
  difficulty: 'difficulty',
};

/* Column headers above the set inputs */
export const FIELD_LABELS: Record<string, string> = {
  weight: 'kg',
  reps: 'Reps',
  rir: 'RIR',
  time: 'Time (m)',
  distance: 'Dist (km)',
  incline: 'Inc',
  speed: 'Spd',
  difficulty: 'Lvl',
};

export interface LoggedSet {
  [key: string]: unknown;
}

/* One line summary of the same set last time, shown greyed beside the inputs */
export function formatPreviousSet(
  prevSet: LoggedSet | null | undefined,
  trackingFields: string[] = [],
) {
  if (!prevSet) return '-';
  const parts: string[] = [];

  if (trackingFields.includes('weight') && prevSet.weight_kg != null) {
    parts.push(`${prevSet.weight_kg}kg`);
  }
  if (trackingFields.includes('reps') && prevSet.reps != null) {
    parts.push(parts.length > 0 ? `x ${prevSet.reps}` : `${prevSet.reps} reps`);
  }
  if (trackingFields.includes('distance') && prevSet.distance_km != null) {
    parts.push(`${prevSet.distance_km}km`);
  }
  if (trackingFields.includes('time') && prevSet.duration_minutes != null) {
    parts.push(`in ${prevSet.duration_minutes}m`);
  }

  return parts.join(' ') || '-';
}
