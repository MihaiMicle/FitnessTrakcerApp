'use client';

import { useState } from 'react';
import { Dumbbell } from 'lucide-react';
import type { CopilotExercise } from '@/lib/copilot/types';
import CardShell from './CardShell';

/* Shown mid-workout when the user asks what to do next. The whole set is added
   in one tap because picking between three is what the exercise selector is
   for, and this is meant to be faster than opening it */
export default function ExerciseSuggestion({
  exercises,
  canAdd,
  onAdd,
}: {
  exercises: CopilotExercise[];
  canAdd: boolean;
  onAdd: (exercises: CopilotExercise[]) => void;
}) {
  const [added, setAdded] = useState<string[]>([]);

  const handleAddOne = (exercise: CopilotExercise) => {
    onAdd([exercise]);
    setAdded((prev) => [...prev, exercise.name]);
  };

  return (
    <CardShell
      label="Next up"
      title={exercises.length === 1 ? exercises[0].name : 'Suggested exercises'}
      meta={exercises.length > 1 ? `${exercises.length} options` : undefined}
    >
      <ul className="space-y-3">
        {exercises.map((exercise, index) => (
          <li key={`${exercise.name}-${index}`} className="space-y-1.5">
            <div className="flex justify-between items-baseline gap-3">
              <span className="text-xs font-mono text-neutral-200 truncate">
                {exercise.name}
              </span>
              <span className="text-[10px] font-mono text-neutral-500 shrink-0">
                {exercise.sets.length} ×{' '}
                {exercise.sets[0]?.reps ?? '—'}
                {exercise.sets[0]?.weight_kg
                  ? ` @ ${exercise.sets[0].weight_kg}kg`
                  : ''}
              </span>
            </div>
            {exercise.reason && (
              <p className="text-[11px] text-neutral-500 leading-relaxed">
                {exercise.reason}
              </p>
            )}
            <button
              onClick={() => handleAddOne(exercise)}
              disabled={!canAdd || added.includes(exercise.name)}
              className="w-full py-1.5 bg-indigo-600/20 hover:bg-indigo-600 border border-indigo-500/30 disabled:border-neutral-800 disabled:bg-neutral-900 disabled:text-neutral-600 rounded-lg text-[11px] font-bold text-indigo-300 hover:text-white transition-all active:scale-95 flex items-center justify-center gap-1.5"
            >
              <Dumbbell size={12} />
              {added.includes(exercise.name)
                ? 'Added'
                : canAdd
                  ? 'Add to workout'
                  : 'Start a workout to add'}
            </button>
          </li>
        ))}
      </ul>
    </CardShell>
  );
}
