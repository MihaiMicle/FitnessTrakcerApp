'use client';

import { useState } from 'react';
import { BookmarkPlus } from 'lucide-react';
import { describeRoutine } from '@/lib/copilot/routine';
import type { CopilotRoutine } from '@/lib/copilot/types';
import CardShell from './CardShell';

export default function RoutineSuggestion({
  routine,
  onSave,
}: {
  routine: CopilotRoutine;
  onSave: (routine: CopilotRoutine) => Promise<void>;
}) {
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSave = async () => {
    setBusy(true);
    await onSave(routine);
    setBusy(false);
    setSaved(true);
  };

  return (
    <CardShell
      label="Routine"
      title={routine.name}
      meta={describeRoutine(routine)}
    >
      {routine.notes && (
        <p className="text-xs text-neutral-400 mb-3 leading-relaxed">
          {routine.notes}
        </p>
      )}

      <ul className="text-xs text-neutral-300 mb-4 space-y-2 font-mono">
        {routine.exercises.map((exercise, index) => (
          <li
            key={`${exercise.name}-${index}`}
            className="border-b border-neutral-800/50 pb-2 last:border-0"
          >
            <div className="flex justify-between gap-3">
              <span className="truncate">{exercise.name}</span>
              <span className="text-neutral-500 shrink-0">
                {exercise.sets.length} ×{' '}
                {exercise.sets[0]?.reps ?? '—'}
              </span>
            </div>
            {exercise.primary_muscle && (
              <span className="text-[10px] text-neutral-600">
                {exercise.primary_muscle}
              </span>
            )}
          </li>
        ))}
      </ul>

      <button
        onClick={handleSave}
        disabled={busy || saved}
        className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-800 disabled:text-neutral-500 rounded-lg text-xs font-bold text-white transition-all active:scale-95 flex items-center justify-center gap-2"
      >
        {saved ? (
          'Saved to your routines'
        ) : (
          <>
            <BookmarkPlus size={14} /> {busy ? 'Saving...' : 'Save routine'}
          </>
        )}
      </button>
    </CardShell>
  );
}
