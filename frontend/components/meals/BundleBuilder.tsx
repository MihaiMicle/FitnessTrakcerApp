"use client";

interface BundleBuilderProps {
  builderMode: "meal" | "recipe";
  stagedFoods: any[];
  stagedName: string;
  setStagedName: (val: string) => void;
  stagedServings: string | number;
  setStagedServings: (val: string | number) => void;
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
    onCancel,
    onAddFood,
    onSave,
    isSubmitting,
  } = props;
  const inputClass =
    "w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-[16px] sm:text-sm text-white focus:border-emerald-500 outline-none transition-colors";

  return (
    <div className="bg-amber-950/20 border border-amber-900/50 rounded-xl p-4 animate-in fade-in">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-amber-400 font-bold text-sm">
          Staged {builderMode === "meal" ? "Meal" : "Recipe"} Ingredients
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
          stagedFoods.map((f, i) => (
            <div
              key={i}
              className="flex justify-between items-center bg-neutral-950 border border-neutral-800 p-2.5 rounded-lg"
            >
              <span className="text-xs text-neutral-200">{f.food_name}</span>
              <span className="text-[10px] text-neutral-500 font-mono">
                {f.serving_size}
                {f.serving_unit}
              </span>
            </div>
          ))
        )}
      </div>

      <div className="space-y-3 pt-3 border-t border-amber-900/30">
        <input
          type="text"
          placeholder={`Name this ${builderMode}...`}
          value={stagedName}
          onChange={(e) => setStagedName(e.target.value)}
          className={inputClass + " border-amber-900/50 focus:border-amber-500"}
        />

        {builderMode === "recipe" && (
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
                inputClass + " border-amber-900/50 focus:border-amber-500"
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
              (builderMode === "recipe" && !stagedServings)
            }
            className="flex-1 py-2 rounded-lg text-xs font-mono font-bold bg-amber-600 hover:bg-amber-500 text-black transition-colors disabled:opacity-50"
          >
            Save {builderMode === "meal" ? "Meal" : "Recipe"}
          </button>
        </div>
      </div>
    </div>
  );
}
