'use client';

import { useWorkout } from '@/lib/context/WorkoutContext';
import { Check, ChevronUp, Clock, Timer, SkipForward, X } from 'lucide-react';
import ConfirmModal from '@/components/shared/ConfirmModal';
import { useConfirm } from '@/components/shared/useConfirm';
import { formatRest } from '@/lib/workouts/rest';

export default function FloatingWorkoutBar() {
  const {
    activeSession,
    isMinimized,
    formattedTime,
    getNextSet,
    toggleSetComplete,
    maximizeWorkout,
    saveSession,
    cancelWorkout,
    isResting,
    restLabel,
    restRemaining,
    restTotal,
    skipRest,
  } = useWorkout();

  // Initialize the custom confirm hook
  const confirm = useConfirm();

  // Only render if there is an active session and the user has minimized it
  if (!activeSession || !isMinimized) return null;

  const next = getNextSet();

  const handleCompleteSet = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent the click from opening the full page
    if (next) {
      toggleSetComplete(next.exercise.id, next.setIndex);
      await saveSession('in_progress'); // Sync to DB
    }
  };

  return (
    <>
      <div
        onClick={maximizeWorkout}
        className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-8 md:w-96 bg-neutral-900 border border-indigo-500/50 rounded-2xl shadow-[0_10px_40px_rgba(99,102,241,0.2)] z-[90] p-4 flex flex-col gap-3 cursor-pointer hover:bg-neutral-800 transition-colors animate-in slide-in-from-bottom-5"
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-white text-sm tracking-wide">
              Workout in Progress
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-indigo-400 font-mono text-sm bg-indigo-500/10 px-2 py-1 rounded-md">
              <Clock size={14} />
              {formattedTime}
            </div>
            {/* Cancel Button in the Floating Bar */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                confirm.ask({
                  title: 'CANCEL WORKOUT',
                  message:
                    'Are you sure you want to cancel this workout? All progress will be lost.',
                  confirmText: 'Yes, Cancel',
                  isDestructive: true,
                  action: async () => {
                    await cancelWorkout();
                  },
                });
              }}
              className="bg-neutral-800 hover:bg-rose-500/20 text-neutral-400 hover:text-rose-500 border border-neutral-700 hover:border-rose-500/30 p-1.5 rounded-md transition-colors"
              title="Cancel Workout"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="w-full h-px bg-neutral-800" />

        {/* Rest countdown lives here while the workout is minimized */}
        {isResting && (
          <div className="bg-sky-500/10 border border-sky-500/30 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Timer size={14} className="text-sky-400 shrink-0" />
                <span className="text-[11px] font-mono text-neutral-400 truncate">
                  {restLabel}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`text-lg font-bold font-mono tabular-nums ${
                    restRemaining <= 5
                      ? 'text-emerald-400 animate-pulse'
                      : 'text-sky-300'
                  }`}
                >
                  {formatRest(restRemaining)}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    skipRest();
                  }}
                  title="Skip rest"
                  className="p-1.5 rounded-md bg-neutral-800 border border-neutral-700 text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors"
                >
                  <SkipForward size={14} />
                </button>
              </div>
            </div>
            <div className="h-1 w-full bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-sky-400 rounded-full transition-[width] duration-200 ease-linear"
                style={{
                  width: `${restTotal > 0 ? Math.min(100, (restRemaining / restTotal) * 100) : 0}%`,
                }}
              />
            </div>
          </div>
        )}

        {next ? (
          <div className="flex justify-between items-center bg-neutral-950 p-3 rounded-xl border border-neutral-800">
            <div className="flex flex-col min-w-0 pr-3">
              <span className="text-sm font-bold text-indigo-300 truncate">
                {next.exercise.name}
              </span>
              <span className="text-xs text-neutral-400 font-mono mt-0.5">
                Set {next.set.set} •{' '}
                {next.set.weight_kg ? `${next.set.weight_kg}kg` : ''}{' '}
                {next.set.reps ? `x ${next.set.reps}` : ''}{' '}
                {next.set.duration_minutes
                  ? `${next.set.duration_minutes}m`
                  : ''}
              </span>
            </div>
            <button
              onClick={handleCompleteSet}
              className="w-10 h-10 shrink-0 rounded-lg bg-neutral-800 border border-neutral-700 hover:bg-emerald-500 hover:border-emerald-400 text-neutral-400 hover:text-white flex items-center justify-center transition-all active:scale-95"
            >
              <Check size={18} strokeWidth={3} />
            </button>
          </div>
        ) : (
          <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 text-sm text-neutral-500 text-center font-mono flex items-center justify-center gap-2">
            <Check size={16} className="text-emerald-500" /> All sets completed!
          </div>
        )}

        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-neutral-800 rounded-full p-1 border border-neutral-700 shadow-md">
          <ChevronUp size={14} className="text-neutral-400" />
        </div>
      </div>

      {/* Inject the actual modal component at the root of the fragment */}
      <ConfirmModal {...confirm.modalProps} />
    </>
  );
}
