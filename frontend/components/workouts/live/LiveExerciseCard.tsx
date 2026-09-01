'use client';

import { Check, GripVertical, Link, Plus, Trash2, Unlink } from 'lucide-react';
import RestSettingsButton from '../RestSettingsButton';
import LiveSetRow from './LiveSetRow';
import { FIELD_LABELS } from '@/lib/workouts/fields';
import type { SetType } from '@/lib/workouts/constants';

interface LiveExerciseCardProps {
  exercise: any;
  index: number;
  isSuperset: boolean;
  isLinkedToPrevious: boolean;
  previousSets: any[];
  isReordering: boolean;
  isDragged: boolean;
  isDragTarget: boolean;
  openSetIndex: number | null;
  onOpenSetMenu: (setIndex: number | null) => void;
  onSetExerciseRest: (setType: SetType, seconds: number | null) => void;
  onToggleSuperset: () => void;
  onRemoveExercise: () => void;
  onAddSet: () => void;
  onUpdateSet: (setIndex: number, key: string, value: string) => void;
  onUpdateSetType: (setIndex: number, type: string) => void;
  onSetSetRest: (setIndex: number, seconds: number | null) => void;
  onRemoveSet: (setIndex: number) => void;
  onToggleSetComplete: (setIndex: number) => void;
  dragHandlers: {
    onDragStart: (e: React.DragEvent, index: number) => void;
    onDragOver: (e: React.DragEvent, index: number) => void;
    onDrop: (e: React.DragEvent, index: number) => void;
    onDragEnd: () => void;
  };
  onUpdateNotes: (notes: string) => void;
}

export default function LiveExerciseCard({
  exercise,
  index,
  isSuperset,
  isLinkedToPrevious,
  previousSets,
  isReordering,
  onUpdateNotes,
  isDragged,
  isDragTarget,
  openSetIndex,
  onOpenSetMenu,
  onSetExerciseRest,
  onToggleSuperset,
  onRemoveExercise,
  onAddSet,
  onUpdateSet,
  onUpdateSetType,
  onSetSetRest,
  onRemoveSet,
  onToggleSetComplete,
  dragHandlers,
}: LiveExerciseCardProps) {
  /* Supersets sit half width so paired exercises land side by side, everything
     else spans the grid */
  const widthClass = isReordering
    ? 'col-span-1 md:col-span-2 cursor-grab active:cursor-grabbing'
    : isSuperset
      ? 'col-span-1'
      : 'col-span-1 md:col-span-2';

  return (
    <div
      draggable={isReordering}
      onDragStart={(e) => dragHandlers.onDragStart(e, index)}
      onDragOver={(e) => dragHandlers.onDragOver(e, index)}
      onDrop={(e) => dragHandlers.onDrop(e, index)}
      onDragEnd={dragHandlers.onDragEnd}
      className={`bg-neutral-900 border rounded-xl p-4 shadow-sm transition-colors ${widthClass} ${isDragged ? 'opacity-50 border-indigo-500' : 'border-neutral-800'} ${isDragTarget ? 'border-indigo-500 bg-indigo-950/20' : ''}`}
    >
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          {isReordering ? (
            <div className="text-neutral-500">
              <GripVertical size={20} />
            </div>
          ) : (
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${isSuperset ? 'bg-amber-500/20 text-amber-400' : 'bg-indigo-500/20 text-indigo-400'}`}
            >
              {isSuperset ? 'S' : index + 1}
            </div>
          )}
          <h3 className="text-lg font-bold text-indigo-100 truncate">
            {exercise.name}
          </h3>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {!isReordering && (
            <RestSettingsButton
              exercise={exercise}
              onChange={onSetExerciseRest}
            />
          )}
          {index > 0 && !isReordering && (
            <button
              onClick={onToggleSuperset}
              className={`p-2 transition-colors shrink-0 ${isLinkedToPrevious ? 'text-indigo-400' : 'text-neutral-600 hover:text-indigo-400'}`}
              title="Superset with previous"
            >
              {isLinkedToPrevious ? <Unlink size={16} /> : <Link size={16} />}
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
            value={exercise.notes || ''}
            onChange={(e) => onUpdateNotes(e.target.value)}
            placeholder="Add note or cue (e.g. 2s pause, pin 4)..."
            className="w-full bg-transparent text-xs text-neutral-400 placeholder:text-neutral-600 border-b border-neutral-800/80 focus:border-indigo-500/60 pb-1 outline-none transition-colors font-mono"
          />
        </div>
      )}

      {!isReordering && (
        <div className="space-y-2">
          <div className="flex gap-2 px-1 text-[10px] text-neutral-500 font-mono uppercase tracking-wider items-center">
            <span className="w-6 text-center shrink-0">Set</span>
            <span className="w-24 text-center shrink-0">Previous</span>
            {(exercise.tracking_fields || []).map((field: string) => (
              <span key={field} className="flex-1 text-center truncate">
                {FIELD_LABELS[field] || field}
              </span>
            ))}
            <span className="w-8 shrink-0" />
            <span className="w-10 text-center shrink-0">
              <Check size={14} className="mx-auto" />
            </span>
          </div>

          {exercise.sets.map((set: any, setIndex: number) => (
            <LiveSetRow
              key={setIndex}
              exercise={exercise}
              set={set}
              setIndex={setIndex}
              previousSet={previousSets?.[setIndex]}
              isMenuOpen={openSetIndex === setIndex}
              canRemove={exercise.sets.length > 1}
              onToggleMenu={() =>
                onOpenSetMenu(openSetIndex === setIndex ? null : setIndex)
              }
              onCloseMenu={() => onOpenSetMenu(null)}
              onSelectType={(type) => onUpdateSetType(setIndex, type)}
              onChangeRest={(seconds) => onSetSetRest(setIndex, seconds)}
              onUpdateField={(key, value) => onUpdateSet(setIndex, key, value)}
              onRemove={() => onRemoveSet(setIndex)}
              onToggleComplete={() => onToggleSetComplete(setIndex)}
            />
          ))}

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
