'use client';

import { useMemo } from 'react';
import { ChevronUp, ChevronsUp, Minus, Target } from 'lucide-react';
import BodyMap from './body/BodyMap';
import BodyRegionIcon from './body/BodyRegionIcon';
import {
  BODY_REGIONS,
  REGION_MUSCLES,
  regionForMuscle,
} from '@/lib/workouts/bodyMap';
import type { BodyRegion } from '@/lib/workouts/bodyMap';
import type { BodySex } from './body/types';

interface MuscleRankPaletteProps {
  sessions: any[];
  exerciseDict: Record<string, string>;
  profile: any; // Used to extract weight, age, and gender
}

/* Rank thresholds on the 0 to 600 point scale */
const RANKS = [
  { name: 'Iron', color: '#52525b', threshold: 0 }, // Untrained -> Beginner
  { name: 'Bronze', color: '#b45309', threshold: 100 }, // Beginner -> Novice
  { name: 'Silver', color: '#94a3b8', threshold: 200 }, // Novice -> Intermediate
  { name: 'Gold', color: '#eab308', threshold: 300 }, // Intermediate -> Advanced
  { name: 'Platinum', color: '#06b6d4', threshold: 400 }, // Advanced -> Elite
  { name: 'Diamond', color: '#8b5cf6', threshold: 500 }, // Elite -> Elite+
  { name: 'Master', color: '#ef4444', threshold: 600 }, // Peak
];

/* Bodyweight multiples per level: beginner, novice, intermediate, advanced, elite */
const LIFT_RATIOS: Record<string, number[]> = {
  'bench press': [0.75, 1.0, 1.25, 1.75, 2.0],
  squat: [1.0, 1.25, 1.5, 2.0, 2.5],
  deadlift: [1.2, 1.5, 2.0, 2.5, 3.0],
  'overhead press': [0.5, 0.7, 0.9, 1.2, 1.5],
  'romanian deadlift': [1.0, 1.2, 1.5, 1.9, 2.3],
  /* Fallbacks for accessory work so the whole body can still be ranked */
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

  /* Pick a fallback when the lift is not one of the named compounds */
  const isLower = ['squat', 'leg', 'calf', 'deadlift', 'glute'].some((k) =>
    normalizedName.includes(k),
  );
  const ratioKey = matchKey || (isLower ? 'default_lower' : 'default_upper');

  let ratios = [...LIFT_RATIOS[ratioKey]];

  /* Standard biological scaling */
  if (gender.toLowerCase() === 'female') ratios = ratios.map((r) => r * 0.65);

  /* Age curve adjustment */
  let ageFactor = 1.0;
  if (age > 40 && age <= 50) ageFactor = 0.9;
  else if (age > 50 && age <= 60) ageFactor = 0.8;
  else if (age > 60) ageFactor = 0.7;
  ratios = ratios.map((r) => r * ageFactor);

  const userRatio = max1RM / bw;
  const [b, n, i, a, e] = ratios;

  /* Map the ratio onto the point scale */
  if (userRatio < b) return 100 * (userRatio / b);
  if (userRatio < n) return 100 + 100 * ((userRatio - b) / (n - b));
  if (userRatio < i) return 200 + 100 * ((userRatio - n) / (i - n));
  if (userRatio < a) return 300 + 100 * ((userRatio - i) / (a - i));
  if (userRatio < e) return 400 + 100 * ((userRatio - a) / (e - a));

  /* Anything past elite runs on into diamond and master */
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

  /* Maxed out at master */
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

function BodyHeatMap({
  scores,
  sex,
}: {
  scores: Record<string, { color: string; score: number }>;
  sex: BodySex;
}) {
  /* Only paint a region once it has a lift behind it, so an untrained body
     reads as blank rather than as uniformly Iron */
  const colors = useMemo(() => {
    const out: Partial<Record<BodyRegion, string>> = {};
    for (const region of BODY_REGIONS) {
      if (scores[region]?.score > 0) out[region] = scores[region].color;
    }
    return out;
  }, [scores]);

  return (
    <div className="mb-6 flex h-80 items-center justify-center rounded-xl border border-neutral-800/50 bg-neutral-950 p-4">
      <BodyMap sex={sex} colors={colors} className="h-full" />
    </div>
  );
}

export default function MuscleRankPalette({
  sessions,
  exerciseDict,
  profile,
}: MuscleRankPaletteProps) {
  /* Best scoring lift per region across every session, turned into a rank */
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
        const group = regionForMuscle(muscle);
        if (!group) return;

        let exMax1RM = 0;
        ex.sets?.forEach((s: any) => {
          if (s.completed && s.weight_kg && s.reps) {
            const e1RM = s.weight_kg * (1 + 0.0333 * s.reps);
            if (e1RM > exMax1RM) exMax1RM = e1RM;
          }
        });

        if (exMax1RM > 0) {
          const currentGroupMax = highest1RMByMuscle[group]?.max1RM || 0;
          /* Keep the exercise that scores highest, not the heaviest one: a
             heavy accessory lift can score below a lighter compound */
          const currentScore =
            currentGroupMax > 0
              ? calculateStrengthScore(
                  highest1RMByMuscle[group].exercise,
                  currentGroupMax,
                  profile,
                )
              : 0;
          const newScore = calculateStrengthScore(ex.name, exMax1RM, profile);

          if (newScore > currentScore) {
            highest1RMByMuscle[group] = { exercise: ex.name, max1RM: exMax1RM };
          }
        }
      });
    });

    const scores: Record<string, ReturnType<typeof getRankData>> = {};
    for (const group of Object.keys(REGION_MUSCLES)) {
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

  const sex: BodySex =
    String(profile?.gender).toLowerCase() === 'female' ? 'female' : 'male';

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-5 shadow-sm w-full">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-bold text-white text-lg tracking-tight flex items-center gap-2">
          <Target size={18} className="text-blue-500" />
          Strength Rank
        </h3>
      </div>

      <BodyHeatMap scores={muscleScores} sex={sex} />

      <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar pr-2">
        {Object.entries(muscleScores)
          .sort((a, b) => b[1].score - a[1].score)
          .map(([muscle, data]) => (
            <div
              key={muscle}
              className="flex items-center justify-between bg-neutral-950 p-3 rounded-lg border border-neutral-800/60"
            >
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 shrink-0 overflow-hidden rounded-md bg-neutral-900">
                  <BodyRegionIcon
                    sex={sex}
                    region={muscle as BodyRegion}
                    color={data.score > 0 ? data.color : undefined}
                  />
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
