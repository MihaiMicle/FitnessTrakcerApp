"use client";

import { FormEvent } from "react";

interface FoodFormProps {
  formData: any;
  setFormData: (val: any) => void;
  availableUnits: string[];
  updateMacros: (size: string, unit: string) => void;
  saveAsCustom: boolean;
  setSaveAsCustom: (val: boolean) => void;
  logMealToDiary: boolean;
  setLogMealToDiary: (val: boolean) => void;
  builderMode: "meal" | "recipe" | null;
  editingFoodId: string | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
}

export default function FoodForm(props: FoodFormProps) {
  const {
    formData,
    setFormData,
    availableUnits,
    updateMacros,
    saveAsCustom,
    setSaveAsCustom,
    logMealToDiary,
    setLogMealToDiary,
    builderMode,
    editingFoodId,
    isSubmitting,
    onClose,
    onSubmit,
  } = props;
  const inputClass =
    "w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-[16px] sm:text-sm text-white focus:border-emerald-500 outline-none transition-colors";

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="text-xs text-neutral-400 block mb-1">Food Name</label>
        <input
          type="text"
          required
          value={formData.food_name}
          onChange={(e) =>
            setFormData({ ...formData, food_name: e.target.value })
          }
          className={inputClass}
        />
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-xs text-neutral-400 block mb-1">Size</label>
          <input
            type="number"
            step="any"
            required
            value={formData.serving_size}
            onChange={(e) =>
              updateMacros(e.target.value, formData.serving_unit)
            }
            className={inputClass + " font-mono"}
          />
        </div>
        <div className="w-28 relative">
          <label className="text-xs text-neutral-400 block mb-1">Unit</label>
          <input
            list="available-units"
            required
            value={formData.serving_unit}
            onChange={(e) =>
              updateMacros(formData.serving_size, e.target.value)
            }
            className={inputClass}
          />
          <datalist id="available-units">
            {availableUnits.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-neutral-800 pt-3">
        <div>
          <label className="text-xs text-neutral-400 block mb-1">
            Calories (kcal)
          </label>
          <input
            type="number"
            value={formData.calories}
            onChange={(e) =>
              setFormData({ ...formData, calories: e.target.value })
            }
            className={inputClass + " font-mono"}
          />
        </div>
        <div>
          <label className="text-xs text-blue-400 block mb-1">
            Protein (g)
          </label>
          <input
            type="number"
            step="any"
            value={formData.protein_g}
            onChange={(e) =>
              setFormData({ ...formData, protein_g: e.target.value })
            }
            className={inputClass + " font-mono border-blue-900/30"}
          />
        </div>
        <div>
          <label className="text-xs text-amber-400 block mb-1">Carbs (g)</label>
          <input
            type="number"
            step="any"
            value={formData.carbs_g}
            onChange={(e) =>
              setFormData({ ...formData, carbs_g: e.target.value })
            }
            className={inputClass + " font-mono border-amber-900/30"}
          />
        </div>
        <div>
          <label className="text-xs text-rose-400 block mb-1">Fats (g)</label>
          <input
            type="number"
            step="any"
            value={formData.fats_g}
            onChange={(e) =>
              setFormData({ ...formData, fats_g: e.target.value })
            }
            className={inputClass + " font-mono border-neutral-400"}
          />
        </div>
      </div>

      <details className="group border border-neutral-800 rounded-lg bg-neutral-950 p-2 mt-3">
        <summary className="text-[13px] sm:text-xs font-mono text-neutral-400 cursor-pointer flex justify-between items-center outline-none list-none p-1">
          <span>Show Micronutrients</span>
          <span className="group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <div className="grid grid-cols-2 gap-3 pt-3 mt-2 border-t border-neutral-800">
          <div>
            <label className="text-[11px] sm:text-[10px] text-neutral-500 block mb-1">
              Sat Fat (g)
            </label>
            <input
              type="number"
              step="any"
              value={formData.saturated_fats_g}
              onChange={(e) =>
                setFormData({ ...formData, saturated_fats_g: e.target.value })
              }
              className={inputClass + " p-1.5 font-mono"}
            />
          </div>
          <div>
            <label className="text-[11px] sm:text-[10px] text-neutral-500 block mb-1">
              Fiber (g)
            </label>
            <input
              type="number"
              step="any"
              value={formData.fiber_g}
              onChange={(e) =>
                setFormData({ ...formData, fiber_g: e.target.value })
              }
              className={inputClass + " p-1.5 font-mono"}
            />
          </div>
          <div>
            <label className="text-[11px] sm:text-[10px] text-neutral-500 block mb-1">
              Sugar (g)
            </label>
            <input
              type="number"
              step="any"
              value={formData.sugar_g}
              onChange={(e) =>
                setFormData({ ...formData, sugar_g: e.target.value })
              }
              className={inputClass + " p-1.5 font-mono"}
            />
          </div>
          <div>
            <label className="text-[11px] sm:text-[10px] text-neutral-500 block mb-1">
              Potassium (mg)
            </label>
            <input
              type="number"
              step="any"
              value={formData.potassium_mg}
              onChange={(e) =>
                setFormData({ ...formData, potassium_mg: e.target.value })
              }
              className={inputClass + " p-1.5 font-mono"}
            />
          </div>
          <div>
            <label className="text-[11px] sm:text-[10px] text-neutral-500 block mb-1">
              Sodium (mg)
            </label>
            <input
              type="number"
              step="any"
              value={formData.sodium_mg}
              onChange={(e) =>
                setFormData({ ...formData, sodium_mg: e.target.value })
              }
              className={inputClass + " p-1.5 font-mono"}
            />
          </div>
          <div>
            <label className="text-[11px] sm:text-[10px] text-neutral-500 block mb-1">
              Iron (mg)
            </label>
            <input
              type="number"
              step="any"
              value={formData.iron_mg}
              onChange={(e) =>
                setFormData({ ...formData, iron_mg: e.target.value })
              }
              className={inputClass + " p-1.5 font-mono"}
            />
          </div>
        </div>
      </details>

      <div className="flex flex-col gap-4 sm:gap-3 pt-3 border-t border-neutral-800 mt-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            role="checkbox"
            aria-checked={saveAsCustom}
            onClick={() => setSaveAsCustom(!saveAsCustom)}
            className={`w-5 h-5 sm:w-4 sm:h-4 rounded flex items-center justify-center transition-colors border ${saveAsCustom ? "bg-emerald-500 border-emerald-500" : "bg-neutral-950 border-neutral-700"}`}
          >
            {saveAsCustom && (
              <svg
                className="w-3 h-3 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </button>
          <span
            onClick={() => setSaveAsCustom(!saveAsCustom)}
            className="text-xs font-mono text-neutral-300 cursor-pointer select-none"
          >
            {editingFoodId
              ? 'Update in "My Custom Foods"'
              : 'Save to "My Custom Foods"'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            role="checkbox"
            aria-checked={logMealToDiary}
            onClick={() => setLogMealToDiary(!logMealToDiary)}
            className={`w-5 h-5 sm:w-4 sm:h-4 rounded flex items-center justify-center transition-colors border ${logMealToDiary ? (builderMode ? "bg-amber-500 border-amber-500" : "bg-emerald-500 border-emerald-500") : "bg-neutral-950 border-neutral-700"}`}
          >
            {logMealToDiary && (
              <svg
                className="w-3 h-3 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </button>
          <span
            onClick={() => setLogMealToDiary(!logMealToDiary)}
            className="text-xs font-mono text-neutral-300 cursor-pointer select-none"
          >
            {builderMode === "meal"
              ? "Stage to Meal Builder"
              : builderMode === "recipe"
                ? "Stage to Recipe Builder"
                : "Log this food to my daily diary"}
          </span>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-5">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-3 sm:py-2 text-sm sm:text-xs font-mono text-neutral-400 hover:text-white transition-colors bg-neutral-800/50 sm:bg-transparent rounded-lg"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || (!saveAsCustom && !logMealToDiary)}
          className={`${builderMode ? "bg-amber-600 hover:bg-amber-500 text-black" : "bg-emerald-600 hover:bg-emerald-500 text-white"} font-medium px-6 py-3 sm:py-2 rounded-lg text-sm sm:text-xs font-mono disabled:opacity-50 transition-colors`}
        >
          {isSubmitting
            ? "Processing..."
            : builderMode
              ? `+ Add to ${builderMode}`
              : "Log Food"}
        </button>
      </div>
    </form>
  );
}
