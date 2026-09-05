'use client';

import { GripVertical, Link, Plus, Trash2, Unlink, X } from 'lucide-react';
import RestSettingsButton from '../RestSettingsButton';
import SetTypeMenu from '../SetTypeMenu';
import { FIELD_KEYS, FIELD_LABELS } from '@/lib/workouts/fields';
import type { SetType } from '@/lib/workouts/constants';
import type { WorkoutExercise } from '@/lib/workouts/sets';

interface RoutineExerciseCardProps {
  exercise: WorkoutExercise;
  index: number;
  isSuperset: boolean;
  isPrevInSameSuperset: boolean;
  isReordering: boolean;
  isDragged: boolean;
  isDragOver: boolean;
  openSetMenu: { exId: string; sIdx: number } | null;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onToggleSuperset: () => void;
  onRemoveExercise: () => void;
  onChangeNotes: (notes: string) => void;
  onChangeExerciseRest: (setType: SetType, seconds: number | null) => void;
  onChangeSetRest: (setIndex: number, seconds: number | null) => void;
  onAddSet: () => void;
  onRemoveSet: (setIndex: number) => void;
  onUpdateSet: (setIndex: number, field: string, value: any) => void;
  onUpdateSetType: (setIndex: number, type: string) => void;
  onOpenSetMenu: (setIndex: number | null) => void;
}

export default function RoutineExerciseCard({
  exercise: ex,
  index,
  isSuperset,
  isPrevInSameSuperset,
  isReordering,
  isDragged,
  isDragOver,
  openSetMenu,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onToggleSuperset,
  onRemoveExercise,
  onChangeNotes,
  onChangeExerciseRest,
  onChangeSetRest,
  onAddSet,
  onRemoveSet,
  onUpdateSet,
  onUpdateSetType,
  onOpenSetMenu,
}: RoutineExerciseCardProps) {
  const inputClass =
    'bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-[16px] sm:text-sm text-white focus:border-indigo-500 outline-none transition-colors font-mono min-w-0 text-center w-full';

  return (
    <div
      draggable={isReordering}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`bg-neutral-900 border rounded-xl p-4 shadow-sm transition-colors ${
        isReordering
          ? 'col-span-1 md:col-span-2 cursor-grab active:cursor-grabbing'
          : isSuperset
            ? 'col-span-1'
            : 'col-span-1 md:col-span-2'
      } ${isDragged ? 'opacity-50 border-indigo-500' : 'border-neutral-800'} ${isDragOver ? 'border-indigo-500 bg-indigo-950/20' : ''}`}
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-3 min-w-0">
          {isReordering ? (
            <div className="text-neutral-500">
              <GripVertical size={20} />
            </div>
          ) : (
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                isSuperset
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-indigo-500/20 text-indigo-400'
              }`}
            >
              {isSuperset ? 'S' : index + 1}
            </div>
          )}
          <h3 className="text-lg font-bold text-indigo-100 truncate">{ex.name}</h3>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!isReordering && (
            <RestSettingsButton exercise={ex} onChange={onChangeExerciseRest} />
          )}
          {index > 0 && !isReordering && (
            <button
              onClick={onToggleSuperset}
              className={`p-2 transition-colors shrink-0 ${isSuperset && isPrevInSameSuperset ? 'text-indigo-400' : 'text-neutral-600 hover:text-indigo-400'}`}
              title="Superset with previous"
            >
              {isSuperset && isPrevInSameSuperset ? (
                <Unlink size={16} />
              ) : (
                <Link size={16} />
              )}
            </button>
          )}
          <button
            onClick={onRemoveExercise}
            className="text-neutral-600 hover:text-rose-500 p-2 transition-colors shrink-0"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {!isReordering && (
        <div className="mb-4">
          <input
            type="text"
            value={ex.notes || ''}
            onChange={(e) => onChangeNotes(e.target.value)}
            placeholder="Add note or cue (e.g. 2s pause at bottom, pin 4)..."
            className="w-full bg-transparent text-xs text-neutral-400 placeholder:text-neutral-600 border-b border-neutral-800/80 focus:border-indigo-500/60 pb-1 outline-none transition-colors font-mono"
          />
        </div>
      )}

      {!isReordering && (
        <div className="space-y-2">
          <div className="flex gap-2 px-1 text-[10px] text-neutral-500 font-mono uppercase tracking-wider items-center">
            <span className="w-6 text-center shrink-0">Set</span>
            {(ex.tracking_fields || []).map((f: string) => (
              <span key={f} className="flex-1 text-center truncate">
                {FIELD_LABELS[f] || f}
              </span>
            ))}
            <span className="w-8 shrink-0"></span>
          </div>

          {ex.sets.map((set: any, sIdx: number) => {
            const isMenuOpen =
              openSetMenu?.exId === ex.id && openSetMenu?.sIdx === sIdx;

            return (
              <div
                key={sIdx}
                className={`flex gap-2 items-center p-1 rounded-lg transition-colors relative ${isMenuOpen ? 'z-50' : 'z-10'}`}
              >
                <SetTypeMenu
                  exercise={ex}
                  set={set}
                  setIndex={sIdx}
                  isOpen={isMenuOpen}
                  onToggle={() => onOpenSetMenu(isMenuOpen ? null : sIdx)}
                  onSelectType={(type) => onUpdateSetType(sIdx, type)}
                  onChangeRest={(seconds) => onChangeSetRest(sIdx, seconds)}
                  onClose={() => onOpenSetMenu(null)}
                />

                {(ex.tracking_fields || []).map((f: string) => {
                  const key = FIELD_KEYS[f];
                  return (
                    <div key={f} className="flex-1 min-w-0">
                      <input
                        type="number"
                        step="any"
                        placeholder="target"
                        value={set[key] || ''}
                        onChange={(e) => onUpdateSet(sIdx, key, e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  );
                })}

                <button
                  onClick={() => onRemoveSet(sIdx)}
                  disabled={ex.sets.length === 1}
                  className="w-8 h-8 shrink-0 flex items-center justify-center text-neutral-600 hover:text-rose-500 transition-colors disabled:opacity-0"
                >
                  <X size={16} />
                </button>
              </div>
            );
          })}

          <button
            onClick={onAddSet}
            className="w-full py-2 mt-2 border-2 border-dashed border-neutral-800 hover:border-indigo-500/50 hover:bg-indigo-500/5 rounded-lg text-indigo-400 font-mono text-xs transition-colors flex items-center justify-center gap-1"
          >
            <Plus size={14} /> Add Set
          </button>
        </div>
      )}
    </div>
  );
}
