'use client';

import { useEffect, useMemo, useState } from 'react';
import { Activity, ChevronLeft, Dumbbell } from 'lucide-react';
import { calculateStrengthStandard } from '@/lib/workouts/standards';
import {
  bestSetByEstimated1RM,
  buildProgressChart,
  calculatorOneRepMax,
} from '@/lib/workouts/exerciseHistory';
import ExerciseHistoryList from './exercise-profile/ExerciseHistoryList';
import ExerciseHowTo from './exercise-profile/ExerciseHowTo';
import ExercisePerformanceChart from './exercise-profile/ExercisePerformanceChart';
import OneRepMaxCalculator from './exercise-profile/OneRepMaxCalculator';
import { useExerciseHistoryData } from './exercise-profile/useExerciseHistoryData';

interface ExerciseProfileViewProps {
  exercise: any;
  onBack: () => void;
}

export default function ExerciseProfileView({
  exercise,
  onBack,
}: ExerciseProfileViewProps) {
  const { history, profile, loading } = useExerciseHistoryData(exercise.name);
  const isStrength = exercise.type === 'strength';

  // 1RM Calculator State
  const [weight, setWeight] = useState<number | ''>('');
  const [reps, setReps] = useState<number | ''>('');

  // Performance Intelligence: prefill the calculator from the best set on record
  useEffect(() => {
    if (exercise.type !== 'strength') return;
    const best = bestSetByEstimated1RM(history);
    if (best) {
      setWeight(best.weight_kg);
      setReps(best.reps);
    }
  }, [history, exercise.type]);

  const oneRepMax = calculatorOneRepMax(weight, reps);
  const TypeIcon = isStrength ? Dumbbell : Activity;

  // Calculate worldwide strength standard if data is available
  const standard =
    oneRepMax && profile
      ? calculateStrengthStandard(
          exercise.name,
          oneRepMax,
          profile.weight_kg,
          profile.gender,
          profile.age,
        )
      : null;

  const { chartData, progression } = useMemo(
    () => buildProgressChart(history, exercise.type),
    [history, exercise.type],
  );

  return (
    <div className="flex flex-col h-full bg-neutral-900">
      <div className="flex items-center gap-3 p-4 border-b border-neutral-800 shrink-0">
        <button
          onClick={onBack}
          className="text-neutral-500 hover:text-white transition"
        >
          <ChevronLeft size={24} />
        </button>
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            {exercise.name} <TypeIcon size={16} className="text-indigo-400" />
          </h2>
          <span className="text-[10px] text-neutral-500 font-mono uppercase tracking-wider">
            {exercise.primary_muscle} • {exercise.equipment}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        <ExerciseHowTo
          name={exercise.name}
          photoUrl={exercise.photo_url}
          instructions={exercise.instructions}
        />

        <ExercisePerformanceChart
          chartData={chartData}
          progression={progression}
          isStrength={isStrength}
        />

        {isStrength && (
          <OneRepMaxCalculator
            weight={weight}
            reps={reps}
            onWeightChange={setWeight}
            onRepsChange={setReps}
            oneRepMax={oneRepMax}
            standard={standard}
          />
        )}

        <ExerciseHistoryList history={history} loading={loading} />
      </div>
    </div>
  );
}
