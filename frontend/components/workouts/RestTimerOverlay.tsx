'use client';

import { Timer, SkipForward, Minus, Plus } from 'lucide-react';
import { useWorkout } from '@/lib/context/WorkoutContext';
import { REST_STEP_SECONDS, formatRest } from '@/lib/workouts/rest';

export default function RestTimerOverlay() {
  const {
    isResting,
    restLabel,
    restRemaining,
    restTotal,
    adjustRest,
    skipRest,
  } = useWorkout();

  if (!isResting) return null;

  const progress =
    restTotal > 0 ? Math.min(100, (restRemaining / restTotal) * 100) : 0;
  const isAlmostDone = restRemaining <= 5;

  return (
    <div className="fixed bottom-24 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-96 z-[110] pointer-events-none animate-in slide-in-from-bottom-5">
      <div className="pointer-events-auto bg-neutral-900/95 backdrop-blur-md border border-sky-500/40 rounded-2xl shadow-[0_10px_40px_rgba(56,189,248,0.2)] p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Timer size={16} className="text-sky-400 shrink-0" />
            <span className="text-xs font-mono text-neutral-400 truncate">
              {restLabel}
            </span>
          </div>
          <span
            className={`text-2xl font-bold font-mono tabular-nums ${
              isAlmostDone ? 'text-emerald-400 animate-pulse' : 'text-sky-300'
            }`}
          >
            {formatRest(restRemaining)}
          </span>
        </div>

        <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-sky-400 rounded-full transition-[width] duration-200 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => adjustRest(-REST_STEP_SECONDS)}
            className="flex-1 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg text-neutral-300 font-mono text-xs font-bold transition-colors active:scale-95 flex items-center justify-center gap-1"
          >
            <Minus size={14} /> {REST_STEP_SECONDS}s
          </button>
          <button
            onClick={() => adjustRest(REST_STEP_SECONDS)}
            className="flex-1 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg text-neutral-300 font-mono text-xs font-bold transition-colors active:scale-95 flex items-center justify-center gap-1"
          >
            <Plus size={14} /> {REST_STEP_SECONDS}s
          </button>
          <button
            onClick={skipRest}
            className="flex-1 py-2 bg-sky-600/20 hover:bg-sky-600 border border-sky-500/40 rounded-lg text-sky-300 hover:text-white font-mono text-xs font-bold transition-colors active:scale-95 flex items-center justify-center gap-1"
          >
            <SkipForward size={14} /> Skip
          </button>
        </div>
      </div>
    </div>
  );
}
