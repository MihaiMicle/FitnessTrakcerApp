'use client';

import { useEffect, useState } from 'react';
import { Timer, RotateCcw } from 'lucide-react';
import { SET_TYPE_OPTIONS, type SetType } from '@/lib/workouts/constants';
import {
  DEFAULT_REST_SECONDS,
  formatRest,
  parseRestInput,
  type RestExercise,
} from '@/lib/workouts/rest';

interface Props {
  exercise: RestExercise;
  onChange: (setType: SetType, seconds: number | null) => void;
}

export default function RestSettingsButton({ exercise, onChange }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest && target.closest('.rest-settings-container')) return;
      setIsOpen(false);
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [isOpen]);

  const configured = exercise.rest_by_type || {};
  const isCustom = Object.keys(configured).length > 0;
  const workingRest = configured.working ?? DEFAULT_REST_SECONDS.working;

  return (
    <div className="relative rest-settings-container">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((v) => !v);
        }}
        title="Rest times"
        className={`p-2 transition-colors shrink-0 flex items-center gap-1 ${
          isCustom ? 'text-sky-400' : 'text-neutral-600 hover:text-sky-400'
        }`}
      >
        <Timer size={16} />
        <span className="text-[10px] font-mono">{formatRest(workingRest)}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-neutral-900 border border-neutral-700 rounded-xl shadow-xl p-3 space-y-3 animate-in fade-in zoom-in-95 z-[9999]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
              Rest per set type
            </span>
            <span className="text-[10px] font-mono text-neutral-600">sec</span>
          </div>

          {SET_TYPE_OPTIONS.map((option) => {
            const value = configured[option.id];
            const hasValue = typeof value === 'number';
            return (
              <div key={option.id} className="flex items-center gap-2">
                <span
                  className={`flex-1 text-xs font-mono truncate ${option.className}`}
                >
                  {option.label}
                </span>
                <input
                  type="number"
                  min={0}
                  step={5}
                  value={hasValue ? String(value) : ''}
                  placeholder={String(DEFAULT_REST_SECONDS[option.id])}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) =>
                    onChange(option.id, parseRestInput(e.target.value))
                  }
                  className="w-16 bg-neutral-950 border border-neutral-800 rounded-md px-2 py-1.5 text-[16px] sm:text-xs text-white font-mono text-center outline-none focus:border-indigo-500 transition-colors"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(option.id, null);
                  }}
                  disabled={!hasValue}
                  title="Use the app default"
                  className="p-1 rounded-md text-neutral-500 hover:text-white hover:bg-neutral-800 transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <RotateCcw size={12} />
                </button>
              </div>
            );
          })}

          <p className="text-[10px] font-mono text-neutral-600 leading-relaxed border-t border-neutral-800 pt-2">
            Blank uses the default. A single set can override this from its set
            menu
          </p>
        </div>
      )}
    </div>
  );
}
