'use client';

import { DragHandleIcon } from '@/components/shared/icons';

interface MealGroupItemProps {
  meal: any;
  index: number;
  isManageMode: boolean;
  isSelected: boolean;
  isDragging: boolean;
  dropIndicator: 'above' | 'below' | null;
  isEditable: boolean;
  onClick: () => void;
  onDelete: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}

/** One logged food: drag handle (or checkbox in manage mode), macros, delete. */
export default function MealGroupItem({
  meal,
  isManageMode,
  isSelected,
  isDragging,
  dropIndicator,
  isEditable,
  onClick,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: MealGroupItemProps) {
  return (
    <div
      draggable={!isManageMode}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`group relative flex justify-between items-center p-2.5 rounded-lg border transition-all ${
        isManageMode || isEditable ? 'cursor-pointer' : ''
      } ${
        isDragging
          ? 'opacity-40 bg-emerald-950/30 border-emerald-500/50 border-dashed'
          : 'bg-transparent border-transparent hover:bg-neutral-950 hover:border-neutral-800/80'
      }`}
    >
      {dropIndicator === 'above' && (
        <div className="absolute -top-1.5 left-0 right-0 h-1 bg-emerald-500 rounded-full z-10 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
      )}
      {dropIndicator === 'below' && (
        <div className="absolute -bottom-1.5 left-0 right-0 h-1 bg-emerald-500 rounded-full z-10 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
      )}

      <div className="flex items-center gap-3">
        {isManageMode ? (
          <input
            type="checkbox"
            checked={isSelected}
            readOnly
            className="w-4 h-4 rounded border-neutral-600 bg-neutral-900 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-neutral-900 cursor-pointer accent-emerald-500 pointer-events-none"
          />
        ) : (
          <div
            className="cursor-grab active:cursor-grabbing text-neutral-700 hover:text-neutral-400 transition-colors py-2"
            title="Drag to reorder"
          >
            <DragHandleIcon />
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <p
              className={`text-xs sm:text-sm font-medium transition-colors ${
                isSelected ? 'text-emerald-400' : 'text-neutral-200'
              }`}
            >
              {meal.food_name || meal.name}
            </p>
            {meal.brand && (
              <span className="text-[10px] text-neutral-500 font-mono tracking-wider">
                {meal.brand}
              </span>
            )}
          </div>
          <p className="text-[10px] sm:text-[11px] text-neutral-500 font-mono mt-0.5">
            {meal.serving_size} {meal.serving_unit} • {meal.calories} kcal | P:{' '}
            {meal.protein_g}g | C: {meal.carbs_g}g | F: {meal.fats_g}g
          </p>
        </div>
      </div>

      {!isManageMode && (
        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="text-neutral-500 hover:text-rose-500 font-bold px-2 py-1 text-sm transition-colors"
            title="Remove food"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
