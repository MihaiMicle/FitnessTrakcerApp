/* lib/workouts/constants.ts */

export const MUSCLES = [
  'Chest',
  'Anterior Delt',
  'Lateral Delt',
  'Posterior Delt',
  'Lats',
  'Mid Back',
  'Traps',
  'Triceps',
  'Biceps',
  'Quads',
  'Hamstrings',
  'Calves',
  'Abs',
  'Forearms',
  'Adductor',
  'Abductor',
  'Neck',
  'Lower Back',
  'Brachialis',
  'Glutes',
  'Cardio',
];

export const EQUIPMENT = [
  'None',
  'Barbell',
  'Dumbbell',
  'Kettlebell',
  'Machine',
  'Plate',
  'Resistance Band',
  'Suspension Band',
  'Other',
];

export interface TrackingType {
  id: string;
  label: string;
  example: string;
  fields: string[];
}

/** How an exercise is logged, and which set fields that implies. */
export const TRACKING_TYPES: TrackingType[] = [
  {
    id: 'weight_reps',
    label: 'Weight & Reps',
    example: 'Bench Press, Curls',
    fields: ['weight', 'reps', 'rir'],
  },
  {
    id: 'bw_reps',
    label: 'Bodyweight Reps',
    example: 'Pullups, Sit ups',
    fields: ['reps', 'rir'],
  },
  {
    id: 'weighted_bw',
    label: 'Weighted Bodyweight',
    example: 'Weighted Dips',
    fields: ['weight', 'reps', 'rir'],
  },
  {
    id: 'assisted_bw',
    label: 'Assisted Bodyweight',
    example: 'Assisted Pullups',
    fields: ['weight', 'reps', 'rir'],
  },
  {
    id: 'duration',
    label: 'Duration',
    example: 'Planks, Stretching',
    fields: ['time'],
  },
  {
    id: 'duration_weight',
    label: 'Duration & Weight',
    example: 'Weighted Plank',
    fields: ['weight', 'time'],
  },
  {
    id: 'distance_duration',
    label: 'Distance & Duration',
    example: 'Running, Cycling',
    fields: ['distance', 'time'],
  },
  {
    id: 'weight_distance',
    label: 'Weight & Distance',
    example: 'Farmers Walk',
    fields: ['weight', 'distance'],
  },
  {
    id: 'machine_cardio',
    label: 'Machine Cardio',
    example: 'Treadmill, Stairmaster',
    fields: ['distance', 'time', 'incline', 'speed'],
  },
];

export const DEFAULT_TRACKING_FIELDS = ['weight', 'reps'];

export type SetType = 'working' | 'W' | 'D' | 'F';

export interface SetTypeOption {
  id: SetType;
  /* Badge letter, empty for plain working sets which show their number */
  badge: string;
  label: string;
  className: string;
}

/* The four set types, in the order the set menu lists them */
export const SET_TYPE_OPTIONS: SetTypeOption[] = [
  { id: 'working', badge: '', label: 'Working', className: 'text-neutral-300' },
  { id: 'W', badge: 'W', label: 'Warm-up (W)', className: 'text-amber-500' },
  { id: 'D', badge: 'D', label: 'Drop set (D)', className: 'text-indigo-400' },
  { id: 'F', badge: 'F', label: 'Failure (F)', className: 'text-rose-500' },
];

export const SET_TYPES: SetType[] = SET_TYPE_OPTIONS.map((o) => o.id);

export const DEFAULT_SET_TYPE: SetType = 'working';
