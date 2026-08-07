"use client";

import { useState, useEffect, FormEvent } from "react";
import { MEAL_TYPES, MEAL_TYPE_LABELS, SERVING_UNITS } from "@/lib/constants";
import { LogMealPayload, ServingUnit, CustomFood } from "@/types/nutrition";
import {
  getCustomFoods,
  getRecentFoods,
  createCustomFood,
  deleteCustomFood,
  updateCustomFood,
} from "@/lib/api";
import { supabase } from "@/lib/supabase";

interface LogMealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMeal: (payload: LogMealPayload) => Promise<any>;
}

const UNIT_TO_G: Record<string, number> = {
  g: 1,
  ml: 1,
  oz: 28.3495,
  lb: 453.592,
  kg: 1000,
};

export default function LogMealModal({
  isOpen,
  onClose,
  onAddMeal,
}: LogMealModalProps) {
  const [activeTab, setActiveTab] = useState<"recent" | "custom" | "manual">(
    "recent",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recentFoods, setRecentFoods] = useState<any[]>([]);
  const [customFoods, setCustomFoods] = useState<CustomFood[]>([]);

  const [saveAsCustom, setSaveAsCustom] = useState(false);
  const [logMealToDiary, setLogMealToDiary] = useState(true);
  const [editingFoodId, setEditingFoodId] = useState<string | null>(null);

  const [unknownUnit, setUnknownUnit] = useState<string | null>(null);
  const [unknownUnitGrams, setUnknownUnitGrams] = useState<string>("");

  const [baseFood, setBaseFood] = useState<any | null>(null);

  const [formData, setFormData] = useState<any>({
    meal_type: "lunch",
    food_name: "",
    serving_size: "",
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
    iron_mg: "",
    vitamin_d_mcg: "",
    zinc_mg: "",
    magnesium_mg: "",
    calcium_mg: "",
    cholesterol_mg: "",
  });

  useEffect(() => {
    if (isOpen) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) return;
        getRecentFoods(session.access_token)
          .then(setRecentFoods)
          .catch(console.error);
        getCustomFoods(session.access_token)
          .then((data: CustomFood[]) => {
            const uniqueFoods = new Map<string, CustomFood>();
            data.forEach((item) => {
              const nameKey = item.name.toLowerCase().trim();
              if (!uniqueFoods.has(nameKey) || item.user_id !== null) {
                uniqueFoods.set(nameKey, item);
              }
            });
            setCustomFoods(Array.from(uniqueFoods.values()));
          })
          .catch(console.error);
      });
    } else {
      setEditingFoodId(null);
      setSaveAsCustom(false);
      setLogMealToDiary(true);
      setUnknownUnit(null);
      setUnknownUnitGrams("");
      setBaseFood(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getGramsMultiplier = (unit: string, foodContext: any = baseFood) => {
    if (!unit) return null;
    const cleanUnit = unit.toLowerCase().trim();
    if (UNIT_TO_G[cleanUnit]) return UNIT_TO_G[cleanUnit];

    if (foodContext?.custom_servings) {
      const custom = foodContext.custom_servings.find(
        (s: any) => s.description.toLowerCase() === cleanUnit,
      );
      if (custom) return custom.equivalent_g;
    }
    return null;
  };

  const handleSelectFood = (food: any, isEditMode: boolean = false) => {
    if (isEditMode) {
      setEditingFoodId(food.id);
      setSaveAsCustom(true);
      setLogMealToDiary(false);
    } else {
      setEditingFoodId(null);
      setSaveAsCustom(false);
      setLogMealToDiary(true);
    }

    let enrichedFood = { ...food };

    if (
      !isEditMode &&
      (!food.custom_servings || food.custom_servings.length === 0)
    ) {
      const matchedCustom = customFoods.find(
        (cf) =>
          cf.name.toLowerCase() === (food.name || food.food_name).toLowerCase(),
      );
      if (matchedCustom && matchedCustom.custom_servings) {
        enrichedFood.custom_servings = matchedCustom.custom_servings;
      }
    }

    const baseServing =
      enrichedFood.serving_size || enrichedFood.quantity_g || 100;
    const defaultUnit = enrichedFood.serving_unit || "g";

    setBaseFood({ ...enrichedFood, baseServing, defaultUnit });
    setUnknownUnit(null);

    setFormData({
      meal_type: formData.meal_type,
      food_name: enrichedFood.name || enrichedFood.food_name,
      serving_size: baseServing,
      serving_unit: defaultUnit,
      calories: enrichedFood.calories ?? "",
      protein_g: enrichedFood.protein_g ?? "",
      carbs_g: enrichedFood.carbs_g ?? "",
      fats_g: enrichedFood.fats_g ?? "",
      saturated_fats_g: enrichedFood.saturated_fats_g ?? "",
      fiber_g: enrichedFood.fiber_g ?? "",
      sugar_g: enrichedFood.sugar_g ?? "",
      potassium_mg: enrichedFood.potassium_mg ?? "",
      sodium_mg: enrichedFood.sodium_mg ?? "",
      iron_mg: enrichedFood.iron_mg ?? "",
      vitamin_d_mcg: enrichedFood.vitamin_d_mcg ?? "",
      zinc_mg: enrichedFood.zinc_mg ?? "",
      magnesium_mg: enrichedFood.magnesium_mg ?? "",
      calcium_mg: enrichedFood.calcium_mg ?? "",
      cholesterol_mg: enrichedFood.cholesterol_mg ?? "",
    });

    setActiveTab("manual");
  };

  const updateMacrosForWeightAndUnit = (
    size: string,
    unit: string,
    contextOverride: any = null,
  ) => {
    if (size === "") {
      setFormData((prev: any) => ({
        ...prev,
        serving_size: "",
        serving_unit: unit,
      }));
      return;
    }

    const amount = Number(size);
    const activeContext = contextOverride || baseFood;
    const multiplier = getGramsMultiplier(unit, activeContext);

    if (multiplier === null && unit.trim() !== "") {
      setUnknownUnit(unit.trim());
      setFormData((prev: any) => ({
        ...prev,
        serving_size: size,
        serving_unit: unit,
      }));
      return;
    } else {
      setUnknownUnit(null);
    }

    if (activeContext && activeContext.baseServing > 0) {
      const baseMultiplier =
        getGramsMultiplier(activeContext.defaultUnit, activeContext) || 1;
      const requestedGrams = amount * multiplier;
      const baseGrams = activeContext.baseServing * baseMultiplier;
      const ratio = requestedGrams / baseGrams;

      setFormData((prev: any) => ({
        ...prev,
        serving_size: size,
        serving_unit: unit,
        calories: Math.round((activeContext.calories || 0) * ratio),
        protein_g: Number(((activeContext.protein_g || 0) * ratio).toFixed(1)),
        carbs_g: Number(((activeContext.carbs_g || 0) * ratio).toFixed(1)),
        fats_g: Number(((activeContext.fats_g || 0) * ratio).toFixed(1)),
        saturated_fats_g: Number(
          ((activeContext.saturated_fats_g || 0) * ratio).toFixed(1),
        ),
        fiber_g: Number(((activeContext.fiber_g || 0) * ratio).toFixed(1)),
        sugar_g: Number(((activeContext.sugar_g || 0) * ratio).toFixed(1)),
        potassium_mg: Math.round((activeContext.potassium_mg || 0) * ratio),
        sodium_mg: Math.round((activeContext.sodium_mg || 0) * ratio),
        iron_mg: Number(((activeContext.iron_mg || 0) * ratio).toFixed(1)),
        vitamin_d_mcg: Number(
          ((activeContext.vitamin_d_mcg || 0) * ratio).toFixed(1),
        ),
        zinc_mg: Number(((activeContext.zinc_mg || 0) * ratio).toFixed(1)),
        magnesium_mg: Number(
          ((activeContext.magnesium_mg || 0) * ratio).toFixed(1),
        ),
        calcium_mg: Number(
          ((activeContext.calcium_mg || 0) * ratio).toFixed(1),
        ),
        cholesterol_mg: Number(
          ((activeContext.cholesterol_mg || 0) * ratio).toFixed(1),
        ),
      }));
    } else {
      setFormData((prev: any) => ({
        ...prev,
        serving_size: size,
        serving_unit: unit,
      }));
    }
  };

  const handleAddUnknownUnit = () => {
    if (!unknownUnitGrams || Number(unknownUnitGrams) <= 0) return;
    const newAlias = {
      description: unknownUnit,
      equivalent_g: Number(unknownUnitGrams),
    };

    const updatedServings = baseFood?.custom_servings
      ? [...baseFood.custom_servings, newAlias]
      : [newAlias];
    const updatedBase = baseFood
      ? { ...baseFood, custom_servings: updatedServings }
      : { custom_servings: updatedServings };

    setBaseFood(updatedBase);
    setSaveAsCustom(true);

    if (updatedBase.baseServing > 0) {
      updateMacrosForWeightAndUnit(
        formData.serving_size,
        unknownUnit!,
        updatedBase,
      );
    } else {
      setUnknownUnit(null);
      setUnknownUnitGrams("");
      setFormData((prev: any) => ({ ...prev, serving_unit: unknownUnit! }));
    }
  };

  const handleDeleteCustomFood = async (
    e: React.MouseEvent,
    foodId: string,
  ) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this custom food?")) return;
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        await deleteCustomFood(session.access_token, foodId);
        setCustomFoods((prev) => prev.filter((food) => food.id !== foodId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const finalName = formData.food_name;

      if (saveAsCustom) {
        let saveSize = Number(formData.serving_size) || 1;
        let saveUnit = formData.serving_unit;
        const customServings = baseFood?.custom_servings
          ? [...baseFood.custom_servings]
          : [];
        let saveMacros = { ...formData };

        // Normalize DB baseline back down to 100g if scaling
        const inputtedMultiplier = getGramsMultiplier(saveUnit, baseFood) || 1;
        const inputtedTotalGrams = saveSize * inputtedMultiplier;

        if (inputtedTotalGrams > 0) {
          const ratioTo100g = 100 / inputtedTotalGrams;
          saveMacros = {
            ...saveMacros,
            calories: Math.round(
              (Number(saveMacros.calories) || 0) * ratioTo100g,
            ),
            protein_g: Number(
              ((Number(saveMacros.protein_g) || 0) * ratioTo100g).toFixed(1),
            ),
            carbs_g: Number(
              ((Number(saveMacros.carbs_g) || 0) * ratioTo100g).toFixed(1),
            ),
            fats_g: Number(
              ((Number(saveMacros.fats_g) || 0) * ratioTo100g).toFixed(1),
            ),
            saturated_fats_g: Number(
              (
                (Number(saveMacros.saturated_fats_g) || 0) * ratioTo100g
              ).toFixed(1),
            ),
            fiber_g: Number(
              ((Number(saveMacros.fiber_g) || 0) * ratioTo100g).toFixed(1),
            ),
            sugar_g: Number(
              ((Number(saveMacros.sugar_g) || 0) * ratioTo100g).toFixed(1),
            ),
            potassium_mg: Math.round(
              (Number(saveMacros.potassium_mg) || 0) * ratioTo100g,
            ),
            sodium_mg: Math.round(
              (Number(saveMacros.sodium_mg) || 0) * ratioTo100g,
            ),
            iron_mg: Number(
              ((Number(saveMacros.iron_mg) || 0) * ratioTo100g).toFixed(1),
            ),
            vitamin_d_mcg: Number(
              ((Number(saveMacros.vitamin_d_mcg) || 0) * ratioTo100g).toFixed(
                1,
              ),
            ),
            zinc_mg: Number(
              ((Number(saveMacros.zinc_mg) || 0) * ratioTo100g).toFixed(1),
            ),
            magnesium_mg: Number(
              ((Number(saveMacros.magnesium_mg) || 0) * ratioTo100g).toFixed(1),
            ),
            calcium_mg: Number(
              ((Number(saveMacros.calcium_mg) || 0) * ratioTo100g).toFixed(1),
            ),
            cholesterol_mg: Number(
              ((Number(saveMacros.cholesterol_mg) || 0) * ratioTo100g).toFixed(
                1,
              ),
            ),
          };
          saveSize = 100;
          saveUnit = "g";
        }

        const dbPayload = {
          name: finalName,
          serving_size: saveSize,
          serving_unit: saveUnit,
          custom_servings: customServings,
          calories: Number(saveMacros.calories) || 0,
          protein_g: Number(saveMacros.protein_g) || 0,
          carbs_g: Number(saveMacros.carbs_g) || 0,
          fats_g: Number(saveMacros.fats_g) || 0,
          saturated_fats_g: Number(saveMacros.saturated_fats_g) || 0,
          fiber_g: Number(saveMacros.fiber_g) || 0,
          sugar_g: Number(saveMacros.sugar_g) || 0,
          potassium_mg: Number(saveMacros.potassium_mg) || 0,
          sodium_mg: Number(saveMacros.sodium_mg) || 0,
          iron_mg: Number(saveMacros.iron_mg) || 0,
          vitamin_d_mcg: Number(saveMacros.vitamin_d_mcg) || 0,
          zinc_mg: Number(saveMacros.zinc_mg) || 0,
          magnesium_mg: Number(saveMacros.magnesium_mg) || 0,
          calcium_mg: Number(saveMacros.calcium_mg) || 0,
          cholesterol_mg: Number(saveMacros.cholesterol_mg) || 0,
        };

        if (editingFoodId) {
          await updateCustomFood(
            session.access_token,
            editingFoodId,
            dbPayload,
          );
        } else {
          await createCustomFood(session.access_token, dbPayload);
        }
      }

      if (logMealToDiary) {
        const cleanPayload: LogMealPayload = {
          meal_type: formData.meal_type,
          food_name: finalName,
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
          iron_mg: Number(formData.iron_mg) || 0,
          vitamin_d_mcg: Number(formData.vitamin_d_mcg) || 0,
          zinc_mg: Number(formData.zinc_mg) || 0,
          magnesium_mg: Number(formData.magnesium_mg) || 0,
          calcium_mg: Number(formData.calcium_mg) || 0,
          cholesterol_mg: Number(formData.cholesterol_mg) || 0,
        };
        await onAddMeal(cleanPayload);
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      alert("Failed to process request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableUnits = baseFood?.custom_servings
    ? [
        ...SERVING_UNITS,
        ...baseFood.custom_servings.map((s: any) => s.description),
      ]
    : SERVING_UNITS;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-lg w-full p-6 space-y-5 shadow-2xl my-8">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
          <h3 className="text-lg font-semibold text-white">
            {editingFoodId ? "Edit Custom Food" : "Log Meal"}
          </h3>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white font-mono text-sm"
          >
            ✕
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-neutral-950 p-1 rounded-lg border border-neutral-800 text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveTab("recent")}
            className={`flex-1 py-1.5 rounded-md transition-colors ${activeTab === "recent" ? "bg-neutral-800 text-white font-bold" : "text-neutral-400 hover:text-white"}`}
          >
            Recent
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("custom")}
            className={`flex-1 py-1.5 rounded-md transition-colors ${activeTab === "custom" ? "bg-neutral-800 text-white font-bold" : "text-neutral-400 hover:text-white"}`}
          >
            My Foods
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("manual")}
            className={`flex-1 py-1.5 rounded-md transition-colors ${activeTab === "manual" ? "bg-neutral-800 text-white font-bold" : "text-neutral-400 hover:text-white"}`}
          >
            Form / Edit
          </button>
        </div>

        {/* Tab 1: Recent Foods */}
        {activeTab === "recent" && (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
            {recentFoods.map((item) => (
              <div
                key={item.id}
                onClick={() => handleSelectFood(item)}
                className="bg-neutral-950 hover:bg-neutral-800 border border-neutral-800/80 rounded-lg p-3 cursor-pointer transition-colors flex justify-between items-center group"
              >
                <div>
                  <h4 className="text-sm font-medium text-neutral-200">
                    {item.name || item.food_name}
                  </h4>
                  <p className="text-xs text-neutral-500 font-mono mt-1">
                    {item.serving_size} {item.serving_unit} • {item.calories}{" "}
                    kcal | P: {item.protein_g}g | C: {item.carbs_g}g | F:{" "}
                    {item.fats_g}g{" "}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 2: Custom Foods */}
        {activeTab === "custom" && (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
            {customFoods.map((item) => (
              <div
                key={item.id}
                onClick={() => handleSelectFood(item)}
                className="bg-neutral-950 hover:bg-neutral-800 border border-neutral-800/80 rounded-lg p-3 cursor-pointer transition-colors flex justify-between items-center group"
              >
                <div>
                  <h4 className="text-sm font-medium text-neutral-200 flex items-center gap-2">
                    {item.name}
                    {item.user_id === null && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                        GLOBAL
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-neutral-500 font-mono mt-1">
                    {item.serving_size} {item.serving_unit} • {item.calories}{" "}
                    kcal | P: {item.protein_g}g | C: {item.carbs_g}g | F:{" "}
                    {item.fats_g}g{" "}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {item.user_id !== null && (
                    <div className="flex gap-1 mr-2 pr-3 border-r border-neutral-800">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectFood(item, true);
                        }}
                        className="text-neutral-500 hover:text-blue-400 font-bold px-1"
                        title="Edit Food"
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteCustomFood(e, item.id)}
                        className="text-neutral-500 hover:text-red-500 font-bold px-1"
                        title="Delete Food"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Form */}
        {activeTab === "manual" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-neutral-400 block mb-1">
                Food Name
              </label>
              <input
                type="text"
                required
                value={formData.food_name}
                onChange={(e) =>
                  setFormData({ ...formData, food_name: e.target.value })
                }
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-sm text-white focus:border-emerald-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-neutral-400 block mb-1">
                  Meal Category
                </label>
                <select
                  value={formData.meal_type}
                  onChange={(e) =>
                    setFormData({ ...formData, meal_type: e.target.value })
                  }
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-sm text-white focus:border-emerald-500 outline-none"
                >
                  {MEAL_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {MEAL_TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-neutral-400 block mb-1">
                      Size
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={formData.serving_size}
                      onChange={(e) =>
                        updateMacrosForWeightAndUnit(
                          e.target.value,
                          formData.serving_unit,
                        )
                      }
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-sm font-mono text-white focus:border-emerald-500 outline-none"
                    />
                  </div>
                  <div className="w-28 relative">
                    <label className="text-xs text-neutral-400 block mb-1">
                      Unit
                    </label>
                    <input
                      list="available-units"
                      required
                      placeholder="e.g. Medium"
                      value={formData.serving_unit}
                      onChange={(e) =>
                        updateMacrosForWeightAndUnit(
                          formData.serving_size,
                          e.target.value,
                        )
                      }
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-sm text-white focus:border-emerald-500 outline-none"
                    />
                    <datalist id="available-units">
                      {availableUnits.map((u) => (
                        <option key={u} value={u} />
                      ))}
                    </datalist>
                  </div>
                </div>

                {unknownUnit && (
                  <div className="mt-1 p-2 bg-emerald-950/40 border border-emerald-900/50 rounded-lg flex items-center justify-between gap-3 animate-in fade-in">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-emerald-400 font-mono">
                        1 {unknownUnit} =
                      </span>
                      <input
                        type="number"
                        value={unknownUnitGrams}
                        onChange={(e) => setUnknownUnitGrams(e.target.value)}
                        placeholder="grams"
                        className="w-16 bg-neutral-900 border border-neutral-700 rounded p-1 text-[11px] text-white focus:border-emerald-500 outline-none"
                      />
                      <span className="text-[11px] text-emerald-400 font-mono">
                        g
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddUnknownUnit}
                      className="bg-emerald-600 hover:bg-emerald-500 px-2 py-1 rounded text-[10px] text-white font-medium transition-colors"
                    >
                      Lock Unit
                    </button>
                  </div>
                )}

                {!unknownUnit &&
                  baseFood?.custom_servings &&
                  baseFood.custom_servings.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-0.5">
                      {baseFood.custom_servings.map((serving: any) => (
                        <button
                          key={serving.description}
                          type="button"
                          onClick={() =>
                            updateMacrosForWeightAndUnit(
                              "1",
                              serving.description,
                            )
                          }
                          className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-bold font-mono rounded border border-emerald-500/20 transition-colors"
                        >
                          {serving.description} ({serving.equivalent_g}g)
                        </button>
                      ))}
                    </div>
                  )}
              </div>
            </div>

            {/* Macros Grid */}
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
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-sm font-mono text-white outline-none"
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
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-sm font-mono text-white outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-amber-400 block mb-1">
                  Carbs (g)
                </label>
                <input
                  type="number"
                  step="any"
                  value={formData.carbs_g}
                  onChange={(e) =>
                    setFormData({ ...formData, carbs_g: e.target.value })
                  }
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-sm font-mono text-white outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-rose-400 block mb-1">
                  Fats (g)
                </label>
                <input
                  type="number"
                  step="any"
                  value={formData.fats_g}
                  onChange={(e) =>
                    setFormData({ ...formData, fats_g: e.target.value })
                  }
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-sm font-mono text-white outline-none"
                />
              </div>
            </div>

            {/* Micronutrients Grid */}
            <details className="group border border-neutral-800 rounded-lg bg-neutral-950 p-2 mt-3">
              <summary className="text-xs font-mono text-neutral-400 cursor-pointer flex justify-between items-center outline-none list-none [&::-webkit-details-marker]:hidden">
                <span>Show Micronutrients</span>
                <span className="group-open:rotate-180 transition-transform">
                  ▼
                </span>
              </summary>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-3 mt-2 border-t border-neutral-800">
                <div>
                  <label className="text-[10px] text-neutral-500 block mb-1">
                    Sat Fat (g)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.saturated_fats_g}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        saturated_fats_g: e.target.value,
                      })
                    }
                    className="w-full bg-neutral-900 border border-neutral-800 rounded p-1.5 text-xs font-mono text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-neutral-500 block mb-1">
                    Fiber (g)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.fiber_g}
                    onChange={(e) =>
                      setFormData({ ...formData, fiber_g: e.target.value })
                    }
                    className="w-full bg-neutral-900 border border-neutral-800 rounded p-1.5 text-xs font-mono text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-neutral-500 block mb-1">
                    Sugar (g)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.sugar_g}
                    onChange={(e) =>
                      setFormData({ ...formData, sugar_g: e.target.value })
                    }
                    className="w-full bg-neutral-900 border border-neutral-800 rounded p-1.5 text-xs font-mono text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-neutral-500 block mb-1">
                    Potassium (mg)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.potassium_mg}
                    onChange={(e) =>
                      setFormData({ ...formData, potassium_mg: e.target.value })
                    }
                    className="w-full bg-neutral-900 border border-neutral-800 rounded p-1.5 text-xs font-mono text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-neutral-500 block mb-1">
                    Sodium (mg)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.sodium_mg}
                    onChange={(e) =>
                      setFormData({ ...formData, sodium_mg: e.target.value })
                    }
                    className="w-full bg-neutral-900 border border-neutral-800 rounded p-1.5 text-xs font-mono text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-neutral-500 block mb-1">
                    Iron (mg)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.iron_mg}
                    onChange={(e) =>
                      setFormData({ ...formData, iron_mg: e.target.value })
                    }
                    className="w-full bg-neutral-900 border border-neutral-800 rounded p-1.5 text-xs font-mono text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-neutral-500 block mb-1">
                    Vitamin D (mcg)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.vitamin_d_mcg}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        vitamin_d_mcg: e.target.value,
                      })
                    }
                    className="w-full bg-neutral-900 border border-neutral-800 rounded p-1.5 text-xs font-mono text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-neutral-500 block mb-1">
                    Zinc (mg)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.zinc_mg}
                    onChange={(e) =>
                      setFormData({ ...formData, zinc_mg: e.target.value })
                    }
                    className="w-full bg-neutral-900 border border-neutral-800 rounded p-1.5 text-xs font-mono text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-neutral-500 block mb-1">
                    Magnesium (mg)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.magnesium_mg}
                    onChange={(e) =>
                      setFormData({ ...formData, magnesium_mg: e.target.value })
                    }
                    className="w-full bg-neutral-900 border border-neutral-800 rounded p-1.5 text-xs font-mono text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-neutral-500 block mb-1">
                    Calcium (mg)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.calcium_mg}
                    onChange={(e) =>
                      setFormData({ ...formData, calcium_mg: e.target.value })
                    }
                    className="w-full bg-neutral-900 border border-neutral-800 rounded p-1.5 text-xs font-mono text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-neutral-500 block mb-1">
                    Cholesterol (mg)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.cholesterol_mg}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        cholesterol_mg: e.target.value,
                      })
                    }
                    className="w-full bg-neutral-900 border border-neutral-800 rounded p-1.5 text-xs font-mono text-white outline-none"
                  />
                </div>
              </div>
            </details>

            <div className="flex flex-col gap-2 pt-3 border-t border-neutral-800 mt-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="saveCustom"
                  checked={saveAsCustom}
                  onChange={(e) => setSaveAsCustom(e.target.checked)}
                  className="rounded border-neutral-700 bg-neutral-950 text-emerald-500 cursor-pointer w-4 h-4"
                />
                <label
                  htmlFor="saveCustom"
                  className="text-xs font-mono text-neutral-300 cursor-pointer"
                >
                  {editingFoodId
                    ? 'Update this item in "My Custom Foods"'
                    : 'Save to "My Custom Foods"'}
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="logMeal"
                  checked={logMealToDiary}
                  onChange={(e) => setLogMealToDiary(e.target.checked)}
                  className="rounded border-neutral-700 bg-neutral-950 text-emerald-500 cursor-pointer w-4 h-4"
                />
                <label
                  htmlFor="logMeal"
                  className="text-xs font-mono text-neutral-300 cursor-pointer"
                >
                  Log this meal to my daily diary
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-mono text-neutral-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  isSubmitting ||
                  (!saveAsCustom && !logMealToDiary) ||
                  unknownUnit !== null
                }
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2 rounded-lg text-xs font-mono disabled:opacity-50"
              >
                {unknownUnit
                  ? "Lock Unit First"
                  : isSubmitting
                    ? "Processing..."
                    : "Process Request"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
