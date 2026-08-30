'use client';

import { Activity, Dumbbell } from 'lucide-react';

interface AddExerciseBarProps {
  onAdd: (type: 'strength' | 'cardio') => void;
}

/* Floating bar over the set list. The container ignores pointer events so the
   gradient does not swallow taps on the card underneath */
export default function AddExerciseBar({ onAdd }: AddExerciseBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-neutral-950 via-neutral-950 to-transparent flex justify-center gap-3 pointer-events-none z-40">
      <button
        onClick={() => onAdd('strength')}
        className="pointer-events-auto bg-indigo-600/20 border border-indigo-500/30 hover:bg-indigo-600 hover:text-white text-indigo-400 font-mono text-xs font-bold py-3 px-6 rounded-full shadow-lg backdrop-blur-md transition-all active:scale-95 flex items-center gap-2"
      >
        <Dumbbell size={16} /> Add Lifting
      </button>
      <button
        onClick={() => onAdd('cardio')}
        className="pointer-events-auto bg-rose-600/20 border border-rose-500/30 hover:bg-rose-600 hover:text-white text-rose-400 font-mono text-xs font-bold py-3 px-6 rounded-full shadow-lg backdrop-blur-md transition-all active:scale-95 flex items-center gap-2"
      >
        <Activity size={16} /> Add Cardio
      </button>
    </div>
  );
}
