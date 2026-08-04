"use client";

import { useState, FormEvent } from "react";
import { MEAL_TYPES, MEAL_TYPE_LABELS, SERVING_UNITS } from "@/lib/constants";
import { LogMealPayload, ServingUnit } from "@/types/nutrition";

interface LogMealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMeal: (payload: LogMealPayload) => Promise<any>;
}

export default function LogMealModal({
  isOpen,
  onClose,
  onAddMeal,
}: LogMealModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<any>({
    meal_type: "lunch",
    food_name: "",
    serving_size: 100,
    serving_unit: "g",
    calories: "",
    protein_g: "",
    carbs_g: "",
    fats_g: "",
    saturated_fats_g: "",
    fiber_g: "",
    sugar_g: "",
    potassium_mg: "",
    sodium_mg: "",
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const cleanPayload: LogMealPayload = {
        meal_type: formData.meal_type,
        food_name: formData.food_name,
        serving_size: Number(formData.serving_size) || 0,
        serving_unit: formData.serving_unit as ServingUnit,
        calories: Number(formData.calories) || 0,
        protein_g: Number(formData.protein_g) || 0,
        carbs_g: Number(formData.carbs_g) || 0,
        fats_g: Number(formData.fats_g) || 0,
        saturated_fats_g: Number(formData.saturated_fats_g) || 0,
        fiber_g: Number(formData.fiber_g) || 0,
        sugar_g: Number(formData.sugar_g) || 0,
        potassium_mg: Number(formData.potassium_mg) || 0,
        sodium_mg: Number(formData.sodium_mg) || 0,
      };

      await onAddMeal(cleanPayload);

      // Reset form
      setFormData({
        meal_type: "lunch",
        food_name: "",
        serving_size: 100,
        serving_unit: "g",
        calories: "",
        protein_g: "",
        carbs_g: "",
        fats_g: "",
        saturated_fats_g: "",
        fiber_g: "",
        sugar_g: "",
        potassium_mg: "",
        sodium_mg: "",
      });

      onClose();
    } catch (err: any) {
      console.error("FastAPI Error:", err);
      let errorMessage = "Failed to log meal.";
      if (err?.detail && Array.isArray(err.detail)) {
        const reasons = err.detail
          .map((e: any) => `• Field "${e.loc.slice(-1)[0]}": ${e.msg}`)
          .join("\n");
        errorMessage = `FastAPI rejected the payload:\n\n${reasons}`;
      } else if (err?.detail && typeof err.detail === "string") {
        errorMessage = `FastAPI Error: ${err.detail}`;
      } else if (err?.message) {
        errorMessage = err.message;
      }
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-md w-full p-6 space-y-6 shadow-2xl">
        <div className="flex justify-between items-center border-b border-neutral-800 pb-4">
          <h3 className="text-lg font-semibold">Log a New Meal</h3>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white font-mono text-sm px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 transition"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-neutral-400 block mb-1">
              Food Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g., Chicken Breast & Rice"
              value={formData.food_name}
              onChange={(e) =>
                setFormData({ ...formData, food_name: e.target.value })
              }
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-neutral-400 block mb-1">
                Meal Type
              </label>
              <select
                value={formData.meal_type}
                onChange={(e) =>
                  setFormData({ ...formData, meal_type: e.target.value })
                }
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-sm focus:outline-none focus:border-emerald-500"
              >
                {MEAL_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {MEAL_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-neutral-400 block mb-1">
                  Serving
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="100"
                  value={formData.serving_size}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      serving_size: e.target.value === "" ? "" : e.target.value,
                    })
                  }
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-sm font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="w-20">
                <label className="text-xs text-neutral-400 block mb-1">
                  Unit
                </label>
                <select
                  value={formData.serving_unit}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      serving_unit: e.target.value as any,
                    })
                  }
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-sm focus:outline-none focus:border-emerald-500"
                >
                  {SERVING_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-neutral-800 pt-4">
            <div>
              <label className="text-xs text-neutral-400 block mb-1">
                Calories (kcal)
              </label>
              <input
                type="number"
                required
                placeholder="0"
                value={formData.calories}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    calories: e.target.value === "" ? "" : e.target.value,
                  })
                }
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-sm font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs text-neutral-400 block mb-1">
                Protein (g)
              </label>
              <input
                type="number"
                step="any"
                required
                placeholder="0"
                value={formData.protein_g}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    protein_g: e.target.value === "" ? "" : e.target.value,
                  })
                }
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-sm font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs text-neutral-400 block mb-1">
                Carbs (g)
              </label>
              <input
                type="number"
                step="any"
                required
                placeholder="0"
                value={formData.carbs_g}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    carbs_g: e.target.value === "" ? "" : e.target.value,
                  })
                }
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-sm font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs text-neutral-400 block mb-1">
                Fats (g)
              </label>
              <input
                type="number"
                step="any"
                required
                placeholder="0"
                value={formData.fats_g}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    fats_g: e.target.value === "" ? "" : e.target.value,
                  })
                }
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-sm font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 border-t border-neutral-800 pt-4">
            <div>
              <label className="text-xs text-neutral-400 block mb-1">
                Sat Fat (g)
              </label>
              <input
                type="number"
                step="any"
                placeholder="0"
                value={formData.saturated_fats_g}
                onChange={(e) =>
                  setFormData({ ...formData, saturated_fats_g: e.target.value })
                }
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-sm font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs text-neutral-400 block mb-1">
                Fiber (g)
              </label>
              <input
                type="number"
                step="any"
                placeholder="0"
                value={formData.fiber_g}
                onChange={(e) =>
                  setFormData({ ...formData, fiber_g: e.target.value })
                }
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-sm font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs text-neutral-400 block mb-1">
                Sugar (g)
              </label>
              <input
                type="number"
                step="any"
                placeholder="0"
                value={formData.sugar_g}
                onChange={(e) =>
                  setFormData({ ...formData, sugar_g: e.target.value })
                }
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-sm font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs text-neutral-400 block mb-1">
                Potassium (mg)
              </label>
              <input
                type="number"
                step="any"
                placeholder="0"
                value={formData.potassium_mg}
                onChange={(e) =>
                  setFormData({ ...formData, potassium_mg: e.target.value })
                }
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-sm font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs text-neutral-400 block mb-1">
                Sodium (mg)
              </label>
              <input
                type="number"
                step="any"
                placeholder="0"
                value={formData.sodium_mg}
                onChange={(e) =>
                  setFormData({ ...formData, sodium_mg: e.target.value })
                }
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-sm font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-neutral-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors"
            >
              {isSubmitting ? "Saving..." : "Save Meal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
