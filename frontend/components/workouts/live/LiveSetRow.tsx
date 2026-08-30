'use client';

import { Check, X } from 'lucide-react';
import SetTypeMenu from '../SetTypeMenu';
import { FIELD_KEYS, formatPreviousSet } from '@/lib/workouts/fields';

/* Shared by every numeric input in the row. 16px on mobile stops iOS Safari
   zooming the viewport when an input takes focus */
const INPUT_CLASS =
  'bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-[16px] sm:text-sm text-white focus:border-indigo-500 outline-none transition-colors font-mono min-w-0 text-center w-full';

interface LiveSetRowProps {
  exercise: any;
  set: any;
  setIndex: number;
  previousSet: any;
  isMenuOpen: boolean;
  canRemove: boolean;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onSelectType: (type: string) => void;
  onChangeRest: (seconds: number | null) => void;
  onUpdateField: (key: string, value: string) => void;
  onRemove: () => void;
  onToggleComplete: () => void;
}

export default function LiveSetRow({
  exercise,
  set,
  setIndex,
  previousSet,
  isMenuOpen,
  canRemove,
  onToggleMenu,
  onCloseMenu,
  onSelectType,
  onChangeRest,
  onUpdateField,
  onRemove,
  onToggleComplete,
}: LiveSetRowProps) {
  return (
    <div
      className={`flex gap-2 items-center p-1 rounded-lg transition-colors relative ${set.completed ? 'bg-emerald-950/20' : ''} ${isMenuOpen ? 'z-50' : 'z-10'}`}
    >
      <SetTypeMenu
        exercise={exercise}
        set={set}
        setIndex={setIndex}
        isOpen={isMenuOpen}
        onToggle={onToggleMenu}
        onSelectType={onSelectType}
        onChangeRest={onChangeRest}
        onClose={onCloseMenu}
      />

      <div className="w-24 text-center text-xs text-neutral-500 font-mono shrink-0 truncate">
        {formatPreviousSet(previousSet, exercise.tracking_fields)}
      </div>

      {(exercise.tracking_fields || []).map((field: string) => {
        const key = FIELD_KEYS[field];
        return (
          <div key={field} className="flex-1 min-w-0">
            <input
              type="number"
              step="any"
              placeholder="-"
              value={set[key] || ''}
              onChange={(e) => onUpdateField(key, e.target.value)}
              className={`${INPUT_CLASS} ${set.completed ? 'opacity-50' : ''} ${key === 'rir' ? 'text-indigo-300 placeholder:text-neutral-700' : ''}`}
            />
          </div>
        );
      })}

      <button
        onClick={onRemove}
        disabled={!canRemove}
        className="w-8 h-10 shrink-0 flex items-center justify-center text-neutral-600 hover:text-rose-500 transition-colors disabled:opacity-0"
      >
        <X size={16} />
      </button>
      <button
        onClick={onToggleComplete}
        className={`w-10 h-10 shrink-0 flex items-center justify-center rounded-lg transition-colors ${set.completed ? 'bg-emerald-500 text-white' : 'bg-neutral-800 text-neutral-500 hover:bg-neutral-700'}`}
      >
        <Check size={16} strokeWidth={3} />
      </button>
    </div>
  );
}
