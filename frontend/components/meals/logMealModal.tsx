"use client";

import { useState, useEffect, FormEvent } from "react";
import { MEAL_TYPES, MEAL_TYPE_LABELS, SERVING_UNITS } from "@/lib/constants";
import { LogMealPayload, CustomFood } from "@/types/nutrition";
import {
  getCustomFoods,
  getRecentFoods,
  createCustomFood,
  deleteCustomFood,
  updateCustomFood,
} from "@/lib/api";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

import BundleBuilder from "./BundleBuilder";
import FoodForm from "./FoodForm";

interface LogMealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMeal: (payload: LogMealPayload) => Promise<any>;
  initialMealType?: string; // NEW: Tells the modal which section to pre-select
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
  initialMealType,
}: LogMealModalProps) {
  const [activeTab, setActiveTab] = useState<
    "recent" | "global" | "custom" | "meals" | "recipes" | "manual"
  >("recent");
  const [searchQuery, setSearchQuery] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recentFoods, setRecentFoods] = useState<any[]>([]);
  const [customFoods, setCustomFoods] = useState<CustomFood[]>([]);

  const [savedMeals, setSavedMeals] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);

  const [builderMode, setBuilderMode] = useState<"meal" | "recipe" | null>(
    null,
  );
  const [stagedFoods, setStagedFoods] = useState<any[]>([]);
  const [stagedName, setStagedName] = useState("");
  const [stagedServings, setStagedServings] = useState<number | string>("");

  const [saveAsCustom, setSaveAsCustom] = useState(false);
  const [logMealToDiary, setLogMealToDiary] = useState(true);
  const [editingFoodId, setEditingFoodId] = useState<string | null>(null);

  const [unknownUnit, setUnknownUnit] = useState<string | null>(null);
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
    setSearchQuery("");
  }, [activeTab]);

  const fetchData = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    supabase
      .from("saved_meals")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => data && setSavedMeals(data));

    supabase
      .from("recipes")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => data && setRecipes(data));
  };

  useEffect(() => {
    if (isOpen) {
      // PRE-SELECT THE DROPDOWN AUTOMATICALLY
      setFormData((prev: any) => ({
        ...prev,
        meal_type: initialMealType || "lunch",
      }));

      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) return;
        getRecentFoods(session.access_token)
          .then(setRecentFoods)
          .catch(console.error);
        fetchData();
        getCustomFoods(session.access_token)
          .then((data: CustomFood[]) => {
            const uniqueFoods = new Map<string, CustomFood>();
            data.forEach((item) => {
              const nameKey = item.name.toLowerCase().trim();
              if (!uniqueFoods.has(nameKey) || item.user_id !== null)
                uniqueFoods.set(nameKey, item);
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
      setBaseFood(null);
      setBuilderMode(null);
      setStagedFoods([]);
      setStagedName("");
      setStagedServings("");
      setActiveTab("recent");
      setSearchQuery("");
    }
  }, [isOpen, initialMealType]);

  if (!isOpen) return null;

  const safeSearch = searchQuery.toLowerCase().trim();
  const filteredRecent = recentFoods.filter((f) =>
    (f.name || f.food_name || "").toLowerCase().includes(safeSearch),
  );
  const filteredGlobal = customFoods
    .filter((f) => f.user_id === null)
    .filter((f) => f.name.toLowerCase().includes(safeSearch));
  const filteredCustom = customFoods
    .filter((f) => f.user_id !== null)
    .filter((f) => f.name.toLowerCase().includes(safeSearch));
  const filteredMeals = savedMeals.filter((m) =>
    m.name.toLowerCase().includes(safeSearch),
  );
  const filteredRecipes = recipes.filter((r) =>
    r.name.toLowerCase().includes(safeSearch),
  );

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
      setLogMealToDiary(!builderMode);
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
      if (matchedCustom && matchedCustom.custom_servings)
        enrichedFood.custom_servings = matchedCustom.custom_servings;
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

  const handleLogRecipe = (recipe: any) => {
    const mappedFood = {
      name: `[Recipe] ${recipe.name}`,
      serving_size: 1,
      serving_unit: "serving",
      ...recipe.macros_per_serving,
      custom_servings: [{ description: "serving", equivalent_g: 1 }],
    };
    handleSelectFood(mappedFood, false);
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
        toast.loading("Deleting...", { id: "deleteFood" });
        await deleteCustomFood(session.access_token, foodId);
        setCustomFoods((prev) => prev.filter((food) => food.id !== foodId));
        toast.success("Custom food deleted", { id: "deleteFood" });
      }
    } catch (err) {
      toast.error("Failed to delete food", { id: "deleteFood" });
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
      const cleanPayload: any = {
        food_name: finalName,
        serving_size: Number(formData.serving_size) || 0,
        serving_unit: formData.serving_unit,
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

      if (builderMode && logMealToDiary) {
        setStagedFoods([...stagedFoods, cleanPayload]);
        toast.success(`Added ${finalName} to ${builderMode}`);
        setActiveTab(builderMode === "meal" ? "meals" : "recipes");
        setIsSubmitting(false);
        return;
      }

      if (saveAsCustom) {
        let saveSize = cleanPayload.serving_size || 1;
        let saveUnit = cleanPayload.serving_unit;
        const customServings = baseFood?.custom_servings
          ? [...baseFood.custom_servings]
          : [];
        let saveMacros = { ...cleanPayload };
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
          };
          saveSize = 100;
          saveUnit = "g";
        }

        const dbPayload = {
          name: finalName,
          serving_size: saveSize,
          serving_unit: saveUnit,
          custom_servings: customServings,
          ...saveMacros,
        };
        if (editingFoodId) {
          await updateCustomFood(
            session.access_token,
            editingFoodId,
            dbPayload,
          );
          toast.success("Food updated successfully!");
        } else {
          await createCustomFood(session.access_token, dbPayload);
          toast.success("Food saved successfully!");
        }
      }

      if (logMealToDiary) {
        await onAddMeal({ ...cleanPayload, meal_type: formData.meal_type });
      }
      onClose();
    } catch (err: any) {
      alert("Failed to process request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogSavedMeal = async (meal: any) => {
    if (
      !confirm(
        `Log all items from '${meal.name}' into ${MEAL_TYPE_LABELS[formData.meal_type as keyof typeof MEAL_TYPE_LABELS]}?`,
      )
    )
      return;
    setIsSubmitting(true);
    toast.loading(`Unpacking ${meal.name}...`, { id: "logBundle" });
    try {
      for (const food of meal.foods)
        await onAddMeal({ ...food, meal_type: formData.meal_type });
      toast.success("Meal completely logged!", { id: "logBundle" });
      onClose();
    } catch (e) {
      toast.error("Failed to log some items", { id: "logBundle" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveBuilder = async () => {
    if (!stagedName.trim()) {
      toast.error("Please enter a name.");
      return;
    }
    if (stagedFoods.length === 0) {
      toast.error("Add some foods first!");
      return;
    }
    if (
      builderMode === "recipe" &&
      (!stagedServings || Number(stagedServings) <= 0)
    ) {
      toast.error("Please enter total servings.");
      return;
    }

    setIsSubmitting(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      if (builderMode === "meal") {
        const { error } = await supabase.from("saved_meals").insert({
          user_id: session.user.id,
          name: stagedName,
          foods: stagedFoods,
        });
        if (error) throw error;
        toast.success("Meal bundle saved!");
      } else if (builderMode === "recipe") {
        const servings = Number(stagedServings);
        const totals = stagedFoods.reduce(
          (acc, f) => ({
            calories: acc.calories + (f.calories || 0),
            protein_g: acc.protein_g + (f.protein_g || 0),
            carbs_g: acc.carbs_g + (f.carbs_g || 0),
            fats_g: acc.fats_g + (f.fats_g || 0),
            saturated_fats_g: acc.saturated_fats_g + (f.saturated_fats_g || 0),
            fiber_g: acc.fiber_g + (f.fiber_g || 0),
            sugar_g: acc.sugar_g + (f.sugar_g || 0),
            potassium_mg: acc.potassium_mg + (f.potassium_mg || 0),
            sodium_mg: acc.sodium_mg + (f.sodium_mg || 0),
            iron_mg: acc.iron_mg + (f.iron_mg || 0),
            vitamin_d_mcg: acc.vitamin_d_mcg + (f.vitamin_d_mcg || 0),
            zinc_mg: acc.zinc_mg + (f.zinc_mg || 0),
            magnesium_mg: acc.magnesium_mg + (f.magnesium_mg || 0),
            calcium_mg: acc.calcium_mg + (f.calcium_mg || 0),
            cholesterol_mg: acc.cholesterol_mg + (f.cholesterol_mg || 0),
          }),
          {
            calories: 0,
            protein_g: 0,
            carbs_g: 0,
            fats_g: 0,
            saturated_fats_g: 0,
            fiber_g: 0,
            sugar_g: 0,
            potassium_mg: 0,
            sodium_mg: 0,
            iron_mg: 0,
            vitamin_d_mcg: 0,
            zinc_mg: 0,
            magnesium_mg: 0,
            calcium_mg: 0,
            cholesterol_mg: 0,
          },
        );

        const macros_per_serving = {
          calories: Math.round(totals.calories / servings),
          protein_g: Number((totals.protein_g / servings).toFixed(1)),
          carbs_g: Number((totals.carbs_g / servings).toFixed(1)),
          fats_g: Number((totals.fats_g / servings).toFixed(1)),
          saturated_fats_g: Number(
            (totals.saturated_fats_g / servings).toFixed(1),
          ),
          fiber_g: Number((totals.fiber_g / servings).toFixed(1)),
          sugar_g: Number((totals.sugar_g / servings).toFixed(1)),
          potassium_mg: Math.round(totals.potassium_mg / servings),
          sodium_mg: Math.round(totals.sodium_mg / servings),
          iron_mg: Number((totals.iron_mg / servings).toFixed(1)),
          vitamin_d_mcg: Number((totals.vitamin_d_mcg / servings).toFixed(1)),
          zinc_mg: Number((totals.zinc_mg / servings).toFixed(1)),
          magnesium_mg: Number((totals.magnesium_mg / servings).toFixed(1)),
          calcium_mg: Number((totals.calcium_mg / servings).toFixed(1)),
          cholesterol_mg: Number((totals.cholesterol_mg / servings).toFixed(1)),
        };

        const { error } = await supabase.from("recipes").insert({
          user_id: session.user.id,
          name: stagedName,
          servings,
          ingredients: stagedFoods,
          macros_per_serving,
        });
        if (error) throw error;
        toast.success("Recipe saved!");
      }

      setBuilderMode(null);
      setStagedFoods([]);
      setStagedName("");
      setStagedServings("");
      fetchData();
    } catch (e) {
      toast.error("Failed to save " + builderMode);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSavedEntity = async (
    e: React.MouseEvent,
    id: string,
    table: "saved_meals" | "recipes",
  ) => {
    e.stopPropagation();
    if (
      !confirm(`Delete this ${table === "recipes" ? "recipe" : "saved meal"}?`)
    )
      return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (!error) {
      if (table === "saved_meals")
        setSavedMeals((prev) => prev.filter((m) => m.id !== id));
      else setRecipes((prev) => prev.filter((r) => r.id !== id));
    }
  };

  const availableUnits = baseFood?.custom_servings
    ? [
        ...SERVING_UNITS,
        ...baseFood.custom_servings.map((s: any) => s.description),
      ]
    : SERVING_UNITS;
  const activeTabClass =
    "bg-emerald-900/40 text-emerald-400 font-bold border border-emerald-800/50";
  const inactiveTabClass =
    "text-neutral-400 hover:text-white border border-transparent";
  const inputClass =
    "w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-[16px] sm:text-sm text-white focus:border-emerald-500 outline-none transition-colors";

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-neutral-900 border-t sm:border border-neutral-800 rounded-t-2xl sm:rounded-xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl max-h-[90dvh] sm:max-h-[85vh] flex flex-col">
        <div className="flex justify-between items-center border-b border-neutral-800 pb-3 shrink-0">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            {builderMode ? (
              <span className="text-amber-400 animate-pulse">
                ● {builderMode === "meal" ? "Meal Builder" : "Recipe Builder"}
              </span>
            ) : editingFoodId ? (
              "Edit Custom Food"
            ) : (
              "Log Food"
            )}
          </h3>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white font-mono text-xl sm:text-sm px-2 py-1"
          >
            ✕
          </button>
        </div>

        {(!builderMode || activeTab === "manual") && (
          <div className="flex items-center justify-between bg-neutral-950 p-2 rounded-lg border border-neutral-800 shrink-0">
            <span className="text-xs text-neutral-400 font-mono ml-2">
              Target Section:
            </span>
            <select
              value={formData.meal_type}
              onChange={(e) =>
                setFormData({ ...formData, meal_type: e.target.value })
              }
              className="bg-transparent border-none text-emerald-400 text-sm font-bold focus:ring-0 cursor-pointer outline-none text-right"
            >
              {MEAL_TYPES.map((type) => (
                <option
                  key={type}
                  value={type}
                  className="bg-neutral-900 text-white"
                >
                  {MEAL_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex bg-neutral-950 p-1 rounded-lg border border-neutral-800 text-[11px] sm:text-[10px] md:text-xs font-mono overflow-x-auto custom-scrollbar shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("recent")}
            className={`flex-1 py-2 sm:py-1.5 px-2 whitespace-nowrap rounded-md transition-colors ${activeTab === "recent" ? activeTabClass : inactiveTabClass}`}
          >
            Recent
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("global")}
            className={`flex-1 py-2 sm:py-1.5 px-2 whitespace-nowrap rounded-md transition-colors ${activeTab === "global" ? activeTabClass : inactiveTabClass}`}
          >
            Database
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("custom")}
            className={`flex-1 py-2 sm:py-1.5 px-2 whitespace-nowrap rounded-md transition-colors ${activeTab === "custom" ? activeTabClass : inactiveTabClass}`}
          >
            My Foods
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("meals")}
            className={`flex-1 py-2 sm:py-1.5 px-2 whitespace-nowrap rounded-md transition-colors ${activeTab === "meals" ? activeTabClass : inactiveTabClass}`}
          >
            Meals
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("recipes")}
            className={`flex-1 py-2 sm:py-1.5 px-2 whitespace-nowrap rounded-md transition-colors ${activeTab === "recipes" ? activeTabClass : inactiveTabClass}`}
          >
            Recipes
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("manual")}
            className={`flex-1 py-2 sm:py-1.5 px-2 whitespace-nowrap rounded-md transition-colors ${activeTab === "manual" ? activeTabClass : inactiveTabClass}`}
          >
            Form
          </button>
        </div>

        {activeTab !== "manual" &&
          activeTab !== "meals" &&
          activeTab !== "recipes" && (
            <div className="relative shrink-0">
              <input
                type="text"
                placeholder={`Search ${activeTab === "global" ? "database" : activeTab === "custom" ? "my foods" : "recent"}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={inputClass + " font-mono"}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white font-mono text-xs p-2"
                >
                  ✕
                </button>
              )}
            </div>
          )}

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-2">
          {activeTab === "recent" && (
            <div className="space-y-2">
              {filteredRecent.length === 0 ? (
                <p className="text-xs text-neutral-500 font-mono py-4 text-center">
                  No recent foods.
                </p>
              ) : (
                filteredRecent.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleSelectFood(item)}
                    className="bg-neutral-950 hover:bg-neutral-800 border border-neutral-800/80 rounded-lg p-3 cursor-pointer transition-colors flex justify-between items-center active:scale-[0.98]"
                  >
                    <div>
                      <h4 className="text-sm font-medium text-neutral-200">
                        {item.name || item.food_name}
                      </h4>
                      <p className="text-[11px] sm:text-xs text-neutral-500 font-mono mt-1">
                        {item.serving_size} {item.serving_unit} •{" "}
                        {item.calories} kcal | P: {item.protein_g}g | C:{" "}
                        {item.carbs_g}g | F: {item.fats_g}g
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "global" && (
            <div className="space-y-2">
              {filteredGlobal.length === 0 ? (
                <p className="text-xs text-neutral-500 font-mono py-4 text-center">
                  No database foods match.
                </p>
              ) : (
                filteredGlobal.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleSelectFood(item)}
                    className="bg-neutral-950 hover:bg-emerald-950/20 border border-neutral-800/80 hover:border-emerald-900/50 rounded-lg p-3 cursor-pointer transition-colors flex justify-between items-center active:scale-[0.98]"
                  >
                    <div>
                      <h4 className="text-sm font-medium text-neutral-200 flex items-center gap-2">
                        {item.name}
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                          APP
                        </span>
                      </h4>
                      <p className="text-[11px] sm:text-xs text-neutral-500 font-mono mt-1">
                        {item.serving_size} {item.serving_unit} •{" "}
                        {item.calories} kcal | P: {item.protein_g}g | C:{" "}
                        {item.carbs_g}g | F: {item.fats_g}g
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "custom" && (
            <div className="space-y-2">
              {filteredCustom.length === 0 ? (
                <p className="text-xs text-neutral-500 font-mono py-4 text-center">
                  No custom foods match.
                </p>
              ) : (
                filteredCustom.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleSelectFood(item)}
                    className="group bg-neutral-950 hover:bg-neutral-800 border border-neutral-800/80 rounded-lg p-3 cursor-pointer transition-colors flex justify-between items-center active:scale-[0.98]"
                  >
                    <div>
                      <h4 className="text-sm font-medium text-neutral-200">
                        {item.name}
                      </h4>
                      <p className="text-[11px] sm:text-xs text-neutral-500 font-mono mt-1">
                        {item.serving_size} {item.serving_unit} •{" "}
                        {item.calories} kcal | P: {item.protein_g}g | C:{" "}
                        {item.carbs_g}g | F: {item.fats_g}g
                      </p>
                    </div>
                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectFood(item, true);
                        }}
                        className="text-neutral-500 hover:text-blue-400 font-bold px-3 py-2 text-sm transition-colors"
                        title="Edit"
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteCustomFood(e, item.id)}
                        className="text-neutral-500 hover:text-rose-500 font-bold px-3 py-2 text-sm transition-colors"
                        title="Delete"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "meals" && (
            <div className="space-y-4">
              {builderMode === "meal" ? (
                <BundleBuilder
                  builderMode="meal"
                  stagedFoods={stagedFoods}
                  stagedName={stagedName}
                  setStagedName={setStagedName}
                  stagedServings={stagedServings}
                  setStagedServings={setStagedServings}
                  onCancel={() => {
                    setBuilderMode(null);
                    setStagedFoods([]);
                  }}
                  onAddFood={() => setActiveTab("recent")}
                  onSave={handleSaveBuilder}
                  isSubmitting={isSubmitting}
                />
              ) : (
                <>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search saved meals..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={inputClass + " font-mono mb-3"}
                    />
                  </div>
                  <button
                    onClick={() => setBuilderMode("meal")}
                    className="w-full py-3 rounded-xl border-2 border-dashed border-neutral-800 text-emerald-500 font-bold text-sm hover:border-emerald-500 hover:bg-emerald-950/20 transition-all mb-2"
                  >
                    + Create New Meal Bundle
                  </button>
                  <div className="space-y-2">
                    {filteredMeals.length === 0 ? (
                      <p className="text-xs text-neutral-500 font-mono py-4 text-center">
                        No saved meals.
                      </p>
                    ) : (
                      filteredMeals.map((meal) => {
                        const totalCals = Math.round(
                          meal.foods.reduce(
                            (acc: number, f: any) => acc + (f.calories || 0),
                            0,
                          ),
                        );
                        const totalProtein = meal.foods
                          .reduce(
                            (acc: number, f: any) => acc + (f.protein_g || 0),
                            0,
                          )
                          .toFixed(1);
                        const totalCarbs = meal.foods
                          .reduce(
                            (acc: number, f: any) => acc + (f.carbs_g || 0),
                            0,
                          )
                          .toFixed(1);
                        const totalFats = meal.foods
                          .reduce(
                            (acc: number, f: any) => acc + (f.fats_g || 0),
                            0,
                          )
                          .toFixed(1);
                        return (
                          <div
                            key={meal.id}
                            onClick={() => handleLogSavedMeal(meal)}
                            className="bg-neutral-950 hover:bg-emerald-950/20 border border-neutral-800/80 hover:border-emerald-900/50 rounded-xl p-3 sm:p-4 cursor-pointer transition-colors active:scale-[0.98] group"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h4 className="text-sm font-bold text-neutral-200">
                                  {meal.name}
                                </h4>
                                <p className="text-[11px] text-neutral-500 font-mono mt-0.5">
                                  {meal.foods.length} items • {totalCals} kcal |
                                  P: {totalProtein}g | C: {totalCarbs}g | F:{" "}
                                  {totalFats}g
                                </p>
                              </div>
                              <button
                                onClick={(e) =>
                                  handleDeleteSavedEntity(
                                    e,
                                    meal.id,
                                    "saved_meals",
                                  )
                                }
                                className="text-neutral-600 hover:text-rose-500 font-bold px-2 text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                ✕
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {meal.foods
                                .slice(0, 3)
                                .map((f: any, i: number) => (
                                  <span
                                    key={i}
                                    className="text-[9px] bg-neutral-900 px-1.5 py-0.5 rounded text-neutral-400"
                                  >
                                    {f.food_name.length > 12
                                      ? f.food_name.substring(0, 12) + "..."
                                      : f.food_name}
                                  </span>
                                ))}
                              {meal.foods.length > 3 && (
                                <span className="text-[9px] bg-neutral-900 px-1.5 py-0.5 rounded text-neutral-400">
                                  +{meal.foods.length - 3} more
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === "recipes" && (
            <div className="space-y-4">
              {builderMode === "recipe" ? (
                <BundleBuilder
                  builderMode="recipe"
                  stagedFoods={stagedFoods}
                  stagedName={stagedName}
                  setStagedName={setStagedName}
                  stagedServings={stagedServings}
                  setStagedServings={setStagedServings}
                  onCancel={() => {
                    setBuilderMode(null);
                    setStagedFoods([]);
                  }}
                  onAddFood={() => setActiveTab("recent")}
                  onSave={handleSaveBuilder}
                  isSubmitting={isSubmitting}
                />
              ) : (
                <>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search recipes..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={inputClass + " font-mono mb-3"}
                    />
                  </div>
                  <button
                    onClick={() => setBuilderMode("recipe")}
                    className="w-full py-3 rounded-xl border-2 border-dashed border-neutral-800 text-blue-400 font-bold text-sm hover:border-blue-400 hover:bg-blue-950/20 transition-all mb-2"
                  >
                    + Create New Recipe
                  </button>
                  <div className="space-y-2">
                    {filteredRecipes.length === 0 ? (
                      <p className="text-xs text-neutral-500 font-mono py-4 text-center">
                        No recipes created.
                      </p>
                    ) : (
                      filteredRecipes.map((recipe) => (
                        <div
                          key={recipe.id}
                          onClick={() => handleLogRecipe(recipe)}
                          className="bg-neutral-950 hover:bg-blue-950/20 border border-neutral-800/80 hover:border-blue-900/50 rounded-xl p-3 sm:p-4 cursor-pointer transition-colors active:scale-[0.98] group"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="text-sm font-bold text-neutral-200">
                                {recipe.name}
                              </h4>
                              <p className="text-[11px] text-neutral-500 font-mono mt-0.5">
                                Yields {recipe.servings} servings
                              </p>
                              <p className="text-[11px] text-neutral-400 font-mono mt-1">
                                Per Serving:{" "}
                                {recipe.macros_per_serving.calories} kcal | P:{" "}
                                {recipe.macros_per_serving.protein_g}g | C:{" "}
                                {recipe.macros_per_serving.carbs_g}g | F:{" "}
                                {recipe.macros_per_serving.fats_g}g
                              </p>
                            </div>
                            <button
                              onClick={(e) =>
                                handleDeleteSavedEntity(e, recipe.id, "recipes")
                              }
                              className="text-neutral-600 hover:text-rose-500 font-bold px-2 text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === "manual" && (
            <FoodForm
              formData={formData}
              setFormData={setFormData}
              availableUnits={availableUnits}
              updateMacros={updateMacrosForWeightAndUnit}
              saveAsCustom={saveAsCustom}
              setSaveAsCustom={setSaveAsCustom}
              logMealToDiary={logMealToDiary}
              setLogMealToDiary={setLogMealToDiary}
              builderMode={builderMode}
              editingFoodId={editingFoodId}
              isSubmitting={isSubmitting}
              onClose={onClose}
              onSubmit={handleSubmit}
            />
          )}
        </div>
      </div>
    </div>
  );
}
