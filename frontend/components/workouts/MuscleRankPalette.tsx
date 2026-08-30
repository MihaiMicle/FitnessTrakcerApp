'use client';

import { useMemo } from 'react';
import { ChevronUp, ChevronsUp, Minus, Target } from 'lucide-react';

interface MuscleRankPaletteProps {
  sessions: any[];
  exerciseDict: Record<string, string>;
  profile: any; // Used to extract weight, age, and gender
}

// 12-point detailed muscle groups mapping
const DETAILED_GROUPS: Record<string, string[]> = {
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
  Glutes: ['Lower Back', 'Glutes'],
};

// Rank Thresholds (0 - 600+)
const RANKS = [
  { name: 'Iron', color: '#52525b', threshold: 0 }, // Untrained -> Beginner
  { name: 'Bronze', color: '#b45309', threshold: 100 }, // Beginner -> Novice
  { name: 'Silver', color: '#94a3b8', threshold: 200 }, // Novice -> Intermediate
  { name: 'Gold', color: '#eab308', threshold: 300 }, // Intermediate -> Advanced
  { name: 'Platinum', color: '#06b6d4', threshold: 400 }, // Advanced -> Elite
  { name: 'Diamond', color: '#8b5cf6', threshold: 500 }, // Elite -> Elite+
  { name: 'Master', color: '#ef4444', threshold: 600 }, // Peak
];

// Expanded Lift Ratios [Beginner, Novice, Intermediate, Advanced, Elite]
const LIFT_RATIOS: Record<string, number[]> = {
  'bench press': [0.75, 1.0, 1.25, 1.75, 2.0],
  squat: [1.0, 1.25, 1.5, 2.0, 2.5],
  deadlift: [1.2, 1.5, 2.0, 2.5, 3.0],
  'overhead press': [0.5, 0.7, 0.9, 1.2, 1.5],
  'romanian deadlift': [1.0, 1.2, 1.5, 1.9, 2.3],
  // Generic fallbacks for isolation/accessory work so the whole body can be ranked
  default_upper: [0.3, 0.5, 0.75, 1.0, 1.25],
  default_lower: [0.5, 0.8, 1.1, 1.5, 1.8],
};

function calculateStrengthScore(
  exerciseName: string,
  max1RM: number,
  profile: any,
) {
  const bw = profile?.weight_kg || 75;
  const gender = profile?.gender || 'male';
  const age = profile?.age || 25;

  const normalizedName = exerciseName.toLowerCase();
  const matchKey = Object.keys(LIFT_RATIOS).find((key) =>
    normalizedName.includes(key),
  );

  // Determine fallback if not a primary compound
  const isLower = ['squat', 'leg', 'calf', 'deadlift', 'glute'].some((k) =>
    normalizedName.includes(k),
  );
  const ratioKey = matchKey || (isLower ? 'default_lower' : 'default_upper');

  let ratios = [...LIFT_RATIOS[ratioKey]];

  // Standard biological scaling
  if (gender.toLowerCase() === 'female') ratios = ratios.map((r) => r * 0.65);

  // Age curve adjustment
  let ageFactor = 1.0;
  if (age > 40 && age <= 50) ageFactor = 0.9;
  else if (age > 50 && age <= 60) ageFactor = 0.8;
  else if (age > 60) ageFactor = 0.7;
  ratios = ratios.map((r) => r * ageFactor);

  const userRatio = max1RM / bw;
  const [b, n, i, a, e] = ratios;

  // Map ratio to the 0-600 point scale
  if (userRatio < b) return 100 * (userRatio / b);
  if (userRatio < n) return 100 + 100 * ((userRatio - b) / (n - b));
  if (userRatio < i) return 200 + 100 * ((userRatio - n) / (i - n));
  if (userRatio < a) return 300 + 100 * ((userRatio - i) / (a - i));
  if (userRatio < e) return 400 + 100 * ((userRatio - a) / (e - a));

  // Anything over Elite pushes into Diamond/Master territory
  return 500 + 100 * ((userRatio - e) / (e * 0.2));
}

function getRankData(score: number) {
  let currentRank = RANKS[0];
  let nextRank = RANKS[1];

  for (let i = 0; i < RANKS.length; i++) {
    if (score >= RANKS[i].threshold) {
      currentRank = RANKS[i];
      nextRank = RANKS[i + 1];
    } else {
      break;
    }
  }

  // Maxed out at Master
  if (!nextRank) {
    return {
      name: currentRank.name,
      color: currentRank.color,
      score,
      progress: 100,
    };
  }

  const range = nextRank.threshold - currentRank.threshold;
  const progress = Math.max(0, score - currentRank.threshold) / range;

  let subTier = 'IV';
  if (progress >= 0.75) subTier = 'I';
  else if (progress >= 0.5) subTier = 'II';
  else if (progress >= 0.25) subTier = 'III';

  return {
    name: `${currentRank.name} ${subTier}`,
    color: currentRank.color,
    score,
    progress: Math.round(progress * 100),
  };
}

function BodyHeatMap({ scores, gender }: { scores: any; gender: string }) {
  const isFemale = gender.toLowerCase() === 'female';
  const defaultColor = '#262626';

  return (
    <div className="flex justify-center items-center h-80 mb-6 relative bg-neutral-950 rounded-xl border border-neutral-800/50 p-4">
      {/* 
        NOTE: These d="..." attributes are geometric placeholders so the app won't crash. 
        Replace them with the exact SVG paths from your design file!
      */}
      <svg
        viewBox="0 0 400 400"
        className="w-full h-full drop-shadow-2xl"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Base Silhouette */}
        <g id="base-body" opacity="0.3">
          {isFemale ? (
            <rect
              x="100"
              y="20"
              width="200"
              height="360"
              rx="100"
              fill="#171717"
              stroke="#333"
            />
          ) : (
            <rect
              x="100"
              y="20"
              width="200"
              height="360"
              rx="40"
              fill="#171717"
              stroke="#333"
            />
          )}
        </g>

        {/* --- FRONT VIEW --- */}
        <g transform="translate(50, 20)">
          <path
            id="front-shoulders"
            d="M30,50 L70,50 L80,80 L20,80 Z"
            fill={scores.Shoulders?.color || defaultColor}
            stroke="#171717"
          />
          <path
            id="chest"
            d="M35,80 L65,80 L60,110 L40,110 Z"
            fill={scores.Chest?.color || defaultColor}
            stroke="#171717"
          />
          <path
            id="abs"
            d="M40,110 L60,110 L55,160 L45,160 Z"
            fill={scores.Abs?.color || defaultColor}
            stroke="#171717"
          />
          <path
            id="biceps-l"
            d="M20,80 L10,130 L25,130 Z"
            fill={scores.Biceps?.color || defaultColor}
            stroke="#171717"
          />
          <path
            id="biceps-r"
            d="M80,80 L90,130 L75,130 Z"
            fill={scores.Biceps?.color || defaultColor}
            stroke="#171717"
          />
          <path
            id="forearms-l"
            d="M10,130 L5,180 L20,180 Z"
            fill={scores.Forearms?.color || defaultColor}
            stroke="#171717"
          />
          <path
            id="forearms-r"
            d="M90,130 L95,180 L80,180 Z"
            fill={scores.Forearms?.color || defaultColor}
            stroke="#171717"
          />
          <path
            id="quads-l"
            d="M45,160 L25,240 L40,240 Z"
            fill={scores.Quads?.color || defaultColor}
            stroke="#171717"
          />
          <path
            id="quads-r"
            d="M55,160 L75,240 L60,240 Z"
            fill={scores.Quads?.color || defaultColor}
            stroke="#171717"
          />
        </g>

        {/* --- BACK VIEW --- */}
        <g transform="translate(250, 20)">
          <path
            id="upper-back"
            d="M35,50 L65,50 L50,90 Z"
            fill={scores['Upper Back']?.color || defaultColor}
            stroke="#171717"
          />
          <path
            id="lats"
            d="M30,80 L70,80 L55,130 L45,130 Z"
            fill={scores.Lats?.color || defaultColor}
            stroke="#171717"
          />
          <path
            id="triceps-l"
            d="M20,80 L10,130 L25,130 Z"
            fill={scores.Triceps?.color || defaultColor}
            stroke="#171717"
          />
          <path
            id="triceps-r"
            d="M80,80 L90,130 L75,130 Z"
            fill={scores.Triceps?.color || defaultColor}
            stroke="#171717"
          />
          <path
            id="glutes"
            d="M40,130 L60,130 L70,170 L30,170 Z"
            fill={scores.Glutes?.color || defaultColor}
            stroke="#171717"
          />
          <path
            id="hamstrings-l"
            d="M30,170 L25,240 L40,240 Z"
            fill={scores.Hamstrings?.color || defaultColor}
            stroke="#171717"
          />
          <path
            id="hamstrings-r"
            d="M70,170 L75,240 L60,240 Z"
            fill={scores.Hamstrings?.color || defaultColor}
            stroke="#171717"
          />
          <path
            id="calves-l"
            d="M25,240 L20,300 L35,300 Z"
            fill={scores.Calves?.color || defaultColor}
            stroke="#171717"
          />
          <path
            id="calves-r"
            d="M75,240 L80,300 L65,300 Z"
            fill={scores.Calves?.color || defaultColor}
            stroke="#171717"
          />
        </g>
      </svg>
    </div>
  );
}

export default function MuscleRankPalette({
  sessions,
  exerciseDict,
  profile,
}: MuscleRankPaletteProps) {
  // Find highest 1RM for each muscle group across all sessions, then translate to rank
  const muscleScores = useMemo(() => {
    const highest1RMByMuscle: Record<
      string,
      { exercise: string; max1RM: number }
    > = {};

    sessions.forEach((session) => {
      if (session.status !== 'completed') return;

      session.exercises?.forEach((ex: any) => {
        const muscle = ex.primary_muscle || exerciseDict[ex.name];
        if (!muscle) return;

        let exMax1RM = 0;
        ex.sets?.forEach((s: any) => {
          if (s.completed && s.weight_kg && s.reps) {
            const e1RM = s.weight_kg * (1 + 0.0333 * s.reps);
            if (e1RM > exMax1RM) exMax1RM = e1RM;
          }
        });

        if (exMax1RM > 0) {
          for (const [group, muscles] of Object.entries(DETAILED_GROUPS)) {
            if (muscles.includes(muscle)) {
              const currentGroupMax = highest1RMByMuscle[group]?.max1RM || 0;
              // Ensure we only keep the exercise that generates the highest strength score
              const currentScore =
                currentGroupMax > 0
                  ? calculateStrengthScore(
                      highest1RMByMuscle[group].exercise,
                      currentGroupMax,
                      profile,
                    )
                  : 0;
              const newScore = calculateStrengthScore(
                ex.name,
                exMax1RM,
                profile,
              );

              if (newScore > currentScore) {
                highest1RMByMuscle[group] = {
                  exercise: ex.name,
                  max1RM: exMax1RM,
                };
              }
              break;
            }
          }
        }
      });
    });

    const scores: Record<string, ReturnType<typeof getRankData>> = {};
    for (const group of Object.keys(DETAILED_GROUPS)) {
      if (highest1RMByMuscle[group]) {
        const bestLift = highest1RMByMuscle[group];
        const score = calculateStrengthScore(
          bestLift.exercise,
          bestLift.max1RM,
          profile,
        );
        scores[group] = getRankData(score);
      } else {
        scores[group] = getRankData(0); // Default to Iron IV if no data
      }
    }

    return scores;
  }, [sessions, exerciseDict, profile]);

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-5 shadow-sm w-full">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-bold text-white text-lg tracking-tight flex items-center gap-2">
          <Target size={18} className="text-blue-500" />
          Strength Rank
        </h3>
      </div>

      <BodyHeatMap scores={muscleScores} gender={profile?.gender || 'male'} />

      <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar pr-2">
        {Object.entries(muscleScores)
          .sort((a, b) => b[1].score - a[1].score)
          .map(([muscle, data]) => (
            <div
              key={muscle}
              className="flex items-center justify-between bg-neutral-950 p-3 rounded-lg border border-neutral-800/60"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-md flex items-center justify-center font-bold text-white shadow-inner"
                  style={{ backgroundColor: data.color }}
                >
                  {muscle.substring(0, 1)}
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">{muscle}</h4>
                  <p
                    className="text-xs font-mono font-bold"
                    style={{ color: data.color }}
                  >
                    {data.name}
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1">
                {data.progress > 80 ? (
                  <ChevronsUp size={20} className="text-emerald-500" />
                ) : data.progress > 40 ? (
                  <ChevronUp size={20} className="text-neutral-400" />
                ) : (
                  <Minus size={20} className="text-neutral-600" />
                )}
                <div className="w-16 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full opacity-80"
                    style={{
                      width: `${data.progress}%`,
                      backgroundColor: data.color,
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
