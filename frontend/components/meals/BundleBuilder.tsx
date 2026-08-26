'use client';

interface BundleBuilderProps {
  builderMode: 'meal' | 'recipe';
  stagedFoods: any[];
  stagedName: string;
  setStagedName: (val: string) => void;
  stagedServings: string | number;
  setStagedServings: (val: string | number) => void;
  editingFoodIndex: number | null;
  onEditFood: (index: number) => void;
  onRemoveFood: (index: number) => void;
  onCancel: () => void;
  onAddFood: () => void;
  onSave: () => void;
  isSubmitting: boolean;
}

export default function BundleBuilder(props: BundleBuilderProps) {
  const {
    builderMode,
    stagedFoods,
    stagedName,
    setStagedName,
    stagedServings,
    setStagedServings,
    editingFoodIndex,
    onEditFood,
    onRemoveFood,
    onCancel,
    onAddFood,
    onSave,
    isSubmitting,
  } = props;
  const inputClass =
    'w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-[16px] sm:text-sm text-white focus:border-emerald-500 outline-none transition-colors';

  return (
    <div className="bg-amber-950/20 border border-amber-900/50 rounded-xl p-4 animate-in fade-in">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-amber-400 font-bold text-sm">
          Staged {builderMode === 'meal' ? 'Meal' : 'Recipe'} Ingredients
        </h4>
        <button
          onClick={onCancel}
          className="text-xs text-neutral-400 hover:text-white underline font-mono"
        >
          Cancel Build
        </button>
      </div>

      <div className="space-y-2 mb-4 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
        {stagedFoods.length === 0 ? (
          <div className="text-xs text-neutral-500 font-mono border border-dashed border-neutral-800 p-4 rounded-lg text-center">
            Empty. Browse tabs to add foods!
          </div>
        ) : (
          stagedFoods.map((f, i) => {
            const isEditing = i === editingFoodIndex;
            return (
              <div
                key={i}
                className={`flex justify-between items-center gap-2 bg-neutral-950 border p-2.5 rounded-lg group transition-colors ${
                  isEditing
                    ? 'border-amber-500 ring-1 ring-amber-500/40'
                    : 'border-neutral-800'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-neutral-200 truncate">
                    {f.food_name}
                  </p>
                  <p className="text-[10px] text-neutral-500 font-mono mt-0.5">
                    {f.serving_size}
                    {f.serving_unit}
                    {' · '}
                    {Math.round(f.calories || 0)} kcal
                    {isEditing && (
                      <span className="text-amber-400"> · editing…</span>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => onEditFood(i)}
                    title={`Edit ${f.food_name}`}
                    aria-label={`Edit ${f.food_name}`}
                    className="text-neutral-500 hover:text-blue-400 font-bold px-2 py-1 text-sm transition-colors"
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveFood(i)}
                    title={`Remove ${f.food_name}`}
                    aria-label={`Remove ${f.food_name}`}
                    className="text-neutral-500 hover:text-rose-500 font-bold px-2 py-1 text-sm transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="space-y-3 pt-3 border-t border-amber-900/30">
        <input
          type="text"
          placeholder={`Name this ${builderMode}...`}
          value={stagedName}
          onChange={(e) => setStagedName(e.target.value)}
          className={inputClass + ' border-amber-900/50 focus:border-amber-500'}
        />

        {builderMode === 'recipe' && (
          <div>
            <label className="text-[10px] text-amber-500/80 font-mono block mb-1 uppercase tracking-wider">
              Total Servings in Recipe
            </label>
            <input
              type="number"
              step="any"
              min="1"
              placeholder="e.g., 4"
              value={stagedServings}
              onChange={(e) => setStagedServings(e.target.value)}
              className={
                inputClass + ' border-amber-900/50 focus:border-amber-500'
              }
            />
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={onAddFood}
            className="flex-1 py-2 rounded-lg text-xs font-mono font-bold bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white transition-colors"
          >
            + Add Food
          </button>
          <button
            onClick={onSave}
            disabled={
              isSubmitting ||
              stagedFoods.length === 0 ||
              !stagedName ||
              (builderMode === 'recipe' && !stagedServings)
            }
            className="flex-1 py-2 rounded-lg text-xs font-mono font-bold bg-amber-600 hover:bg-amber-500 text-black transition-colors disabled:opacity-50"
          >
            Save {builderMode === 'meal' ? 'Meal' : 'Recipe'}
          </button>
        </div>
      </div>
    </div>
  );
}
