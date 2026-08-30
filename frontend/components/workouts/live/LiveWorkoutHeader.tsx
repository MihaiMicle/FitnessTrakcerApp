'use client';

import { BookmarkPlus, ChevronLeft, Clock, X } from 'lucide-react';
import SyncStatusBadge from '../SyncStatusBadge';

interface LiveWorkoutHeaderProps {
  workoutName: string;
  onNameChange: (name: string) => void;
  formattedTime: string;
  isTimerPaused: boolean;
  completedSets: number;
  totalVolume: number;
  isReordering: boolean;
  isSaving: boolean;
  isCompleted: boolean;
  onBack: () => void;
  onOpenTimer: () => void;
  onToggleReorder: () => void;
  onCancel: () => void;
  onSaveRoutine: () => void;
  onFinish: () => void;
}

export default function LiveWorkoutHeader({
  workoutName,
  onNameChange,
  formattedTime,
  isTimerPaused,
  completedSets,
  totalVolume,
  isReordering,
  isSaving,
  isCompleted,
  onBack,
  onOpenTimer,
  onToggleReorder,
  onCancel,
  onSaveRoutine,
  onFinish,
}: LiveWorkoutHeaderProps) {
  return (
    <div className="sticky top-0 z-40 bg-neutral-950/80 backdrop-blur-md border-b border-neutral-800 p-4 sm:px-6">
      <div className="max-w-4xl mx-auto flex justify-between items-center">
        <div className="flex items-center gap-2 sm:gap-4 flex-1">
          <button
            onClick={onBack}
            className="text-neutral-500 hover:text-white transition-colors shrink-0"
          >
            <ChevronLeft size={28} />
          </button>

          <div className="flex flex-col flex-1 min-w-0">
            <input
              type="text"
              value={workoutName}
              onChange={(e) => onNameChange(e.target.value)}
              className="bg-transparent text-lg sm:text-xl font-bold text-white outline-none focus:border-b focus:border-indigo-500 placeholder:text-neutral-600 w-full truncate"
              placeholder="Workout Name"
            />

            <div
              onClick={onOpenTimer}
              className="flex items-center gap-2 text-indigo-400 font-mono text-[10px] sm:text-xs mt-0.5 cursor-pointer hover:text-indigo-300 transition-colors"
            >
              <span className="flex items-center gap-1">
                <Clock size={12} /> {formattedTime}
              </span>
              {isTimerPaused && <span className="text-rose-500">(Paused)</span>}
              <span className="text-neutral-600">•</span>
              <span>{completedSets} sets</span>
              <span className="text-neutral-600">•</span>
              <span>{totalVolume.toLocaleString()} kg</span>

              <button
                onClick={(e) => {
                  /* The row opens the timer modal, so the reorder toggle has
                     to keep its click to itself */
                  e.stopPropagation();
                  onToggleReorder();
                }}
                className={`ml-2 px-2 py-0.5 rounded transition-colors ${isReordering ? 'bg-indigo-500 text-white' : 'bg-neutral-800 text-neutral-300 hover:text-white'}`}
              >
                {isReordering ? 'Done' : 'Reorder'}
              </button>
              <SyncStatusBadge compact />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-3 shrink-0">
          {!isCompleted && (
            <button
              onClick={onCancel}
              title="Cancel Workout"
              className="bg-neutral-800 hover:bg-rose-500/20 text-neutral-400 hover:text-rose-500 p-2 sm:px-3 rounded-lg transition-colors flex items-center justify-center border border-neutral-700 hover:border-rose-500/30 active:scale-95"
            >
              <X size={18} />
              <span className="hidden sm:inline text-xs font-mono ml-2 font-bold">
                Cancel
              </span>
            </button>
          )}

          <button
            onClick={onSaveRoutine}
            title="Save as Routine"
            className="bg-neutral-800 hover:bg-neutral-700 text-indigo-400 p-2 sm:px-3 rounded-lg transition-colors flex items-center justify-center border border-neutral-700 active:scale-95"
          >
            <BookmarkPlus size={18} />
            <span className="hidden sm:inline text-xs font-mono ml-2 font-bold">
              Save Routine
            </span>
          </button>

          <button
            onClick={onFinish}
            disabled={isSaving}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 sm:px-6 rounded-lg transition-colors font-mono text-xs active:scale-95"
          >
            {isCompleted ? 'Save Changes' : 'Finish'}
          </button>
        </div>
      </div>
    </div>
  );
}
