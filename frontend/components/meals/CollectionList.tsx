'use client';

import React from 'react';

interface CollectionListProps {
  items: any[];
  type: 'meal' | 'recipe';
  emptyMessage: string;
  onLog: (item: any) => void;
  onEdit: (e: React.MouseEvent, item: any) => void;
  onDelete: (
    e: React.MouseEvent,
    id: string,
    table: 'saved_meals' | 'recipes',
  ) => void;
  onCreateNew: () => void;
}

export default function CollectionList({
  items,
  type,
  emptyMessage,
  onLog,
  onEdit,
  onDelete,
  onCreateNew,
}: CollectionListProps) {
  const isMeal = type === 'meal';
  const table = isMeal ? 'saved_meals' : 'recipes';

  return (
    <>
      <button
        onClick={onCreateNew}
        className="w-full py-3 rounded-xl border-2 border-dashed border-neutral-800 text-emerald-500 font-bold text-sm hover:border-emerald-500 hover:bg-emerald-950/20 transition-all mb-2"
      >
        + Create New {isMeal ? 'Meal' : 'Recipe'}
      </button>

      <div className="space-y-2">
        {items.length === 0 ? (
          <p className="text-xs text-neutral-500 font-mono py-4 text-center">
            {emptyMessage}
          </p>
        ) : (
          items.map((item) => {
            // Dynamic macro extraction based on whether it is a Meal array or a Recipe object
            const totalCals = isMeal
              ? Math.round(
                  item.foods.reduce(
                    (acc: number, f: any) => acc + (f.calories || 0),
                    0,
                  ),
                )
              : item.macros_per_serving.calories;

            const totalProtein = isMeal
              ? item.foods
                  .reduce((acc: number, f: any) => acc + (f.protein_g || 0), 0)
                  .toFixed(1)
              : item.macros_per_serving.protein_g;

            const totalCarbs = isMeal
              ? item.foods
                  .reduce((acc: number, f: any) => acc + (f.carbs_g || 0), 0)
                  .toFixed(1)
              : item.macros_per_serving.carbs_g;

            const totalFats = isMeal
              ? item.foods
                  .reduce((acc: number, f: any) => acc + (f.fats_g || 0), 0)
                  .toFixed(1)
              : item.macros_per_serving.fats_g;

            return (
              <div
                key={item.id}
                onClick={() => onLog(item)}
                className="bg-neutral-950 hover:bg-emerald-950/20 border border-neutral-800/80 hover:border-emerald-900/50 rounded-xl p-3 sm:p-4 cursor-pointer transition-colors active:scale-[0.98] group"
              >
                <div className="flex justify-between items-start mb-2 gap-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-neutral-200 truncate">
                      {item.name}
                    </h4>
                    <p className="text-[11px] text-neutral-500 font-mono mt-0.5 truncate">
                      {isMeal
                        ? `${item.foods.length} items`
                        : `Yields ${item.servings} servings`}
                    </p>
                    <p className="text-[11px] text-neutral-400 font-mono mt-1 truncate">
                      {!isMeal && 'Per Serving: '}
                      {totalCals} kcal | P: {totalProtein}g | C: {totalCarbs}g |
                      F: {totalFats}g
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0 bg-neutral-900 sm:bg-transparent rounded-lg px-1 sm:px-0">
                    <button
                      onClick={(e) => onEdit(e, item)}
                      className="text-neutral-500 hover:text-blue-400 font-bold px-2 py-1.5 text-sm transition-colors"
                      title={`Edit ${isMeal ? 'Meal' : 'Recipe'}`}
                    >
                      ✎
                    </button>
                    <button
                      onClick={(e) => onDelete(e, item.id, table)}
                      className="text-neutral-500 hover:text-rose-500 font-bold px-2 py-1.5 text-sm transition-colors"
                      title={`Delete ${isMeal ? 'Meal' : 'Recipe'}`}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Only render mini-food tags if it is a Meal */}
                {isMeal && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {item.foods.slice(0, 3).map((f: any, i: number) => (
                      <span
                        key={i}
                        className="text-[9px] bg-neutral-900 px-1.5 py-0.5 rounded text-neutral-400 truncate max-w-[100px]"
                      >
                        {f.food_name}
                      </span>
                    ))}
                    {item.foods.length > 3 && (
                      <span className="text-[9px] bg-neutral-900 px-1.5 py-0.5 rounded text-neutral-400 shrink-0">
                        +{item.foods.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
