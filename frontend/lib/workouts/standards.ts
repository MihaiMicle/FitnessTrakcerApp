// lib/workouts/standards.ts

export type StrengthLevel =
  | 'Untrained'
  | 'Beginner'
  | 'Novice'
  | 'Intermediate'
  | 'Advanced'
  | 'Elite';

// Ratios of 1RM to Bodyweight for a standard adult male.
const LIFT_RATIOS: Record<string, number[]> = {
  // [Beginner, Novice, Intermediate, Advanced, Elite]
  'bench press': [0.75, 1.0, 1.25, 1.75, 2.0],
  squat: [1.0, 1.25, 1.5, 2.0, 2.5],
  deadlift: [1.2, 1.5, 2.0, 2.5, 3.0],
  'overhead press': [0.5, 0.7, 0.9, 1.2, 1.5],
  'romanian deadlift': [1.0, 1.2, 1.5, 1.9, 2.3],
};

const LEVEL_NAMES: StrengthLevel[] = [
  'Untrained',
  'Beginner',
  'Novice',
  'Intermediate',
  'Advanced',
  'Elite',
];

export function calculateStrengthStandard(
  exerciseName: string,
  oneRepMax: number,
  bodyweightKg: number,
  gender: string,
  age: number,
) {
  if (!bodyweightKg || !oneRepMax) return null;

  const normalizedName = exerciseName.toLowerCase();

  // Fuzzy match to catch variations like "Barbell Bench Press" or "Smith Machine Squat"
  const match = Object.keys(LIFT_RATIOS).find((key) =>
    normalizedName.includes(key),
  );
  if (!match) return null;

  let ratios = [...LIFT_RATIOS[match]];

  // Standard biological scaling
  if (gender?.toLowerCase() === 'female') {
    ratios = ratios.map((r) => r * 0.65);
  }

  // Age adjustment curve
  let ageFactor = 1.0;
  if (age > 40 && age <= 50) ageFactor = 0.9;
  else if (age > 50 && age <= 60) ageFactor = 0.8;
  else if (age > 60) ageFactor = 0.7;

  ratios = ratios.map((r) => r * ageFactor);

  const userRatio = oneRepMax / bodyweightKg;

  let currentLevelIndex = 0;
  for (let i = 0; i < ratios.length; i++) {
    if (userRatio >= ratios[i]) {
      currentLevelIndex = i + 1;
    } else {
      break;
    }
  }

  const currentLevel = LEVEL_NAMES[currentLevelIndex];
  const nextRatio = ratios[currentLevelIndex];
  const nextTarget = nextRatio ? Math.round(nextRatio * bodyweightKg) : null;

  return {
    level: currentLevel,
    ratio: Number(userRatio.toFixed(2)),
    nextTarget,
  };
}
