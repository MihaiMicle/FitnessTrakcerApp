'use client';

import React from 'react';

interface FoodListProps {
  foods: any[];
  emptyMessage: string;
  onSelect: (food: any, isEditMode?: boolean) => void;
  onDelete?: (e: React.MouseEvent, id: string) => void;
  showAppBadge?: boolean;
  showActions?: boolean;
}

export default function FoodList({
  foods,
  emptyMessage,
  onSelect,
  onDelete,
  showAppBadge = false,
  showActions = false,
}: FoodListProps) {
  if (foods.length === 0) {
    return (
      <p className="text-xs text-neutral-500 font-mono py-4 text-center">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {foods.map((item) => (
        <div
          key={item.id}
          onClick={() => onSelect(item)}
          className="bg-neutral-950 hover:bg-emerald-950/20 border border-neutral-800/80 hover:border-emerald-900/50 rounded-lg p-3 cursor-pointer transition-colors flex justify-between items-center active:scale-[0.98] group gap-2"
        >
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-medium text-neutral-200 flex items-center gap-2 truncate">
              <span className="truncate">{item.name || item.food_name}</span>

              {item.brand && (
                <span className="text-[12px] text-neutral-500 font-mono tracking-wider font-normal shrink-0">
                  {item.brand}
                </span>
              )}

              {showAppBadge && (
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold shrink-0">
                  APP
                </span>
              )}
            </h4>

            <p className="text-[11px] sm:text-xs text-neutral-500 font-mono mt-1 truncate">
              {item.serving_size} {item.serving_unit} • {item.calories} kcal |
              P: {item.protein_g}g | C: {item.carbs_g}g | F: {item.fats_g}g
            </p>
          </div>

          {showActions && onDelete && (
            <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0 bg-neutral-900 sm:bg-transparent rounded-lg px-1 sm:px-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(item, true);
                }}
                className="text-neutral-500 hover:text-blue-400 font-bold px-2 py-1.5 text-sm transition-colors"
                title="Edit"
              >
                ✎
              </button>
              <button
                type="button"
                onClick={(e) => onDelete(e, item.id)}
                className="text-neutral-500 hover:text-rose-500 font-bold px-2 py-1.5 text-sm transition-colors"
                title="Delete"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
