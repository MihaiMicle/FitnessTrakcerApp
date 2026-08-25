// lib/workouts/constants.ts

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
];

export const DEFAULT_TRACKING_FIELDS = ['weight', 'reps'];
