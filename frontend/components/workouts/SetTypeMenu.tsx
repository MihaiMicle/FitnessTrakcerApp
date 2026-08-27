'use client';

import { Timer, RotateCcw } from 'lucide-react';
import { SET_TYPE_OPTIONS, type SetType } from '@/lib/workouts/constants';
import {
  exerciseRestSeconds,
  formatRest,
  hasRestOverride,
  normalizeSetType,
  parseRestInput,
  type RestExercise,
  type RestSet,
} from '@/lib/workouts/rest';

interface Props {
  exercise: RestExercise;
  set: RestSet;
  setIndex: number;
  isOpen: boolean;
  onToggle: () => void;
  onSelectType: (type: SetType) => void;
  onChangeRest: (seconds: number | null) => void;
  onClose: () => void;
}

/* Working sets are numbered ignoring warm-up, drop and failure sets */
function workingSetNumber(exercise: RestExercise, setIndex: number): number {
  return (exercise.sets || []).filter(
    (s, i) => i <= setIndex && normalizeSetType(s.set_type) === 'working',
  ).length;
}

export function SetBadge({
  exercise,
  set,
  setIndex,
}: {
  exercise: RestExercise;
  set: RestSet;
  setIndex: number;
}) {
  const type = normalizeSetType(set.set_type);
  const option = SET_TYPE_OPTIONS.find((o) => o.id === type);

  if (type === 'working') {
    return (
      <span className="text-neutral-500">
        {workingSetNumber(exercise, setIndex)}
      </span>
    );
  }
  return <span className={option?.className}>{option?.badge}</span>;
}

export default function SetTypeMenu({
  exercise,
  set,
  setIndex,
  isOpen,
  onToggle,
  onSelectType,
  onChangeRest,
  onClose,
}: Props) {
  const type = normalizeSetType(set.set_type);
  const inherited = exerciseRestSeconds(exercise, type);
  const overridden = hasRestOverride(set);

  return (
    <div className="relative set-menu-container">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className="w-6 h-6 shrink-0 flex items-center justify-center text-xs font-bold font-mono rounded hover:bg-neutral-800 transition-colors"
      >
        <SetBadge exercise={exercise} set={set} setIndex={setIndex} />
      </button>

      {/* Dot marking a set that carries its own rest */}
      {overridden && (
        <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-sky-400 pointer-events-none" />
      )}

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-44 bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 z-[9999]">
          {SET_TYPE_OPTIONS.map((option) => (
            <button
              key={option.id}
              onClick={(e) => {
                e.stopPropagation();
                onSelectType(option.id);
                onClose();
              }}
              className={`px-3 py-2.5 text-xs font-mono text-left hover:bg-neutral-800 transition-colors ${option.className} ${
                option.id === type ? 'bg-neutral-800' : ''
              }`}
            >
              {option.label}
            </button>
          ))}

          <div className="border-t border-neutral-800 p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-neutral-500">
              <Timer size={11} /> Rest for this set
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                step={5}
                value={overridden ? String(set.rest_seconds) : ''}
                placeholder={String(inherited)}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => onChangeRest(parseRestInput(e.target.value))}
                className="flex-1 min-w-0 bg-neutral-950 border border-neutral-800 rounded-md px-2 py-1.5 text-[16px] sm:text-xs text-white font-mono text-center outline-none focus:border-indigo-500 transition-colors"
              />
              <span className="text-[10px] font-mono text-neutral-500">
                sec
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onChangeRest(null);
                }}
                disabled={!overridden}
                title="Use the exercise default"
                className="p-1.5 rounded-md text-neutral-500 hover:text-white hover:bg-neutral-800 transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <RotateCcw size={12} />
              </button>
            </div>
            <p className="text-[10px] font-mono text-neutral-600">
              {overridden
                ? `Overrides ${formatRest(inherited)}`
                : `Inherits ${formatRest(inherited)}`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
