/* lib/workouts/bodyMap.ts */

import { MUSCLES } from './constants';

/*
 * The 12 regions the body map can paint. These are coarser than MUSCLES on
 * purpose: a silhouette that reads at 200px wide cannot show 19 separate
 * shapes, and a per-muscle rank built off one exercise is noisier than a
 * per-region one
 */
export const BODY_REGIONS = [
  'Chest',
  'Lats',
  'Upper Back',
  'Shoulders',
  'Biceps',
  'Triceps',
  'Forearms',
  'Abs',
  'Quads',
  'Hamstrings',
  'Calves',
  'Glutes',
] as const;

export type BodyRegion = (typeof BODY_REGIONS)[number];

/*
 * Which entries of MUSCLES roll up into each region. Every value here must
 * exist in MUSCLES or the muscle silently stops counting toward a rank, which
 * is what the test in __tests__/bodyMap.test.ts guards
 */
export const REGION_MUSCLES: Record<BodyRegion, string[]> = {
  Chest: ['Chest'],
  Lats: ['Lats'],
  'Upper Back': ['Mid Back', 'Traps', 'Neck'],
  Shoulders: ['Anterior Delt', 'Lateral Delt', 'Posterior Delt'],
  Biceps: ['Biceps', 'Brachialis'],
  Triceps: ['Triceps'],
  Forearms: ['Forearms'],
  Abs: ['Abs'],
  Quads: ['Quads', 'Adductor', 'Abductor'],
  Hamstrings: ['Hamstrings'],
  Calves: ['Calves'],
  Glutes: ['Glutes', 'Lower Back'],
};

/*
 * Which side of the body shows a region best. Used to pick a view when only
 * one figure is drawn, such as the thumbnail next to a rank row
 */
export const REGION_VIEW: Record<BodyRegion, 'front' | 'back'> = {
  Chest: 'front',
  Lats: 'back',
  'Upper Back': 'back',
  Shoulders: 'front',
  Biceps: 'front',
  Triceps: 'back',
  Forearms: 'front',
  Abs: 'front',
  Quads: 'front',
  Hamstrings: 'back',
  Calves: 'back',
  Glutes: 'back',
};

const MUSCLE_TO_REGION: Record<string, BodyRegion> = {};
for (const region of BODY_REGIONS) {
  for (const muscle of REGION_MUSCLES[region]) {
    MUSCLE_TO_REGION[muscle] = region;
  }
}

/* Region a MUSCLES entry belongs to, or null if it maps nowhere */
export function regionForMuscle(muscle: string | null | undefined) {
  if (!muscle) return null;
  return MUSCLE_TO_REGION[muscle] ?? null;
}

/* Muscles in MUSCLES that no region claims, so they paint nothing */
export function unmappedMuscles() {
  return MUSCLES.filter((m) => !(m in MUSCLE_TO_REGION) && m !== 'Cardio');
}
