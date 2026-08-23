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
import FoodList from "./FoodList";
import CollectionList from "./CollectionList";
import BarcodeScanner from "./BarcodeScanner";

interface LogMealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMeal: (payload: LogMealPayload) => Promise<any>;
  initialMealType?: string;
  editingLog?: any;
  onUpdateLog?: (id: string, payload: any) => Promise<any>;
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
  editingLog,
  onUpdateLog,
}: LogMealModalProps) {
  const [activeTab, setActiveTab] = useState<
    "recent" | "global" | "custom" | "meals" | "recipes" | "manual" | "scan"
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
  const [editingBundleId, setEditingBundleId] = useState<string | null>(null);
  const [stagedFoods, setStagedFoods] = useState<any[]>([]);
  const [stagedName, setStagedName] = useState("");
  const [stagedServings, setStagedServings] = useState<number | string>("");

  const [saveAsCustom, setSaveAsCustom] = useState(false);
  const [logMealToDiary, setLogMealToDiary] = useState(true);
  const [editingFoodId, setEditingFoodId] = useState<string | null>(null);

  const [unknownUnit, setUnknownUnit] = useState<string | null>(null);
  const [baseFood, setBaseFood] = useState<any | null>(null);

  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    isDestructive: boolean;
    action: () => void;
  } | null>(null);

  const [formData, setFormData] = useState<any>({
    meal_type: "lunch",
    food_name: "",
    brand: "",
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
      if (editingLog) {
        setFormData({
          meal_type: editingLog.meal_type || initialMealType || "lunch",
          food_name: editingLog.food_name || editingLog.name,
          brand: editingLog.brand || "",
          serving_size: editingLog.serving_size,
          serving_unit: editingLog.serving_unit,
          calories: editingLog.calories ?? "",
          protein_g: editingLog.protein_g ?? "",
          carbs_g: editingLog.carbs_g ?? "",
          fats_g: editingLog.fats_g ?? "",
          saturated_fats_g: editingLog.saturated_fats_g ?? "",
          fiber_g: editingLog.fiber_g ?? "",
          sugar_g: editingLog.sugar_g ?? "",
          potassium_mg: editingLog.potassium_mg ?? "",
          sodium_mg: editingLog.sodium_mg ?? "",
          iron_mg: editingLog.iron_mg ?? "",
          vitamin_d_mcg: editingLog.vitamin_d_mcg ?? "",
          zinc_mg: editingLog.zinc_mg ?? "",
          magnesium_mg: editingLog.magnesium_mg ?? "",
          calcium_mg: editingLog.calcium_mg ?? "",
          cholesterol_mg: editingLog.cholesterol_mg ?? "",
        });
        const baseServing =
          editingLog.serving_size || editingLog.quantity_g || 100;
        const defaultUnit = editingLog.serving_unit || "g";
        setBaseFood({ ...editingLog, baseServing, defaultUnit });
        setActiveTab("manual");
        setLogMealToDiary(true);
        setSaveAsCustom(false);
      } else {
        setFormData((prev: any) => ({
          ...prev,
          meal_type: initialMealType || "lunch",
        }));
      }
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
              const rawName = item.name || (item as any).food_name || "";
              const nameKey = rawName.toLowerCase().trim();
              if (!uniqueFoods.has(nameKey) || item.user_id !== null)
                uniqueFoods.set(nameKey, item);
            });
            setCustomFoods(Array.from(uniqueFoods.values()));
          })
          .catch(console.error);
      });
    } else {
      setEditingFoodId(null);
      setEditingBundleId(null);
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
      setConfirmConfig(null);
    }
  }, [isOpen, initialMealType, editingLog]);

  if (!isOpen) return null;

  const safeSearch = searchQuery.toLowerCase().trim();

  // Search logic
  const matchesSearch = (item: any) => {
    const nameMatch = (item.name || item.food_name || "")
      .toLowerCase()
      .includes(safeSearch);
    const brandMatch = (item.brand || "").toLowerCase().includes(safeSearch);
    return nameMatch || brandMatch;
  };

  const filteredRecent = recentFoods.filter(matchesSearch);
  const filteredGlobal = customFoods.filter(
    (f) => f.user_id === null && matchesSearch(f),
  );
  const filteredCustom = customFoods.filter(
    (f) => f.user_id !== null && matchesSearch(f),
  );

  const filteredMeals = savedMeals.filter((m) =>
    (m.name || "").toLowerCase().includes(safeSearch),
  );
  const filteredRecipes = recipes.filter((r) =>
    (r.name || "").toLowerCase().includes(safeSearch),
  );

  const getGramsMultiplier = (unit: string, foodContext: any = baseFood) => {
    if (!unit) return null;
    const cleanUnit = unit.toLowerCase().trim();
    if (UNIT_TO_G[cleanUnit]) return UNIT_TO_G[cleanUnit];

    let parsedServings = foodContext?.custom_servings || [];
    if (typeof parsedServings === "string") {
      try {
        parsedServings = JSON.parse(parsedServings);
      } catch (e) {
        parsedServings = [];
      }
    }

    if (
      parsedServings.length === 0 &&
      (foodContext?.name || foodContext?.food_name)
    ) {
      const matchedCustom = customFoods.find(
        (cf) =>
          (cf.name || "").toLowerCase() ===
          (foodContext.name || foodContext.food_name || "").toLowerCase(),
      );
      if (matchedCustom && matchedCustom.custom_servings) {
        let matchParsed = matchedCustom.custom_servings;
        if (typeof matchParsed === "string") {
          try {
            matchParsed = JSON.parse(matchParsed);
          } catch (e) {
            matchParsed = [];
          }
        }
        parsedServings = matchParsed;
      }
    }

    if (parsedServings && Array.isArray(parsedServings)) {
      const custom = parsedServings.find(
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
    let parsedServings = [];

    try {
      if (typeof food.custom_servings === "string") {
        parsedServings = JSON.parse(food.custom_servings);
      } else if (Array.isArray(food.custom_servings)) {
        parsedServings = food.custom_servings;
      }
    } catch (e) {}

    if (!isEditMode && parsedServings.length === 0) {
      const matchedCustom = customFoods.find(
        (cf) =>
          (cf.name || "").toLowerCase() ===
          (food.name || food.food_name || "").toLowerCase(),
      );
      if (matchedCustom && matchedCustom.custom_servings) {
        try {
          parsedServings =
            typeof matchedCustom.custom_servings === "string"
              ? JSON.parse(matchedCustom.custom_servings)
              : matchedCustom.custom_servings;
        } catch (e) {}
      }
    }

    enrichedFood.custom_servings = parsedServings || [];

    const baseServing =
      enrichedFood.serving_size || enrichedFood.quantity_g || 100;
    const defaultUnit = enrichedFood.serving_unit || "g";
    setBaseFood({ ...enrichedFood, baseServing, defaultUnit });
    setUnknownUnit(null);
    setFormData({
      meal_type: formData.meal_type,
      food_name: enrichedFood.name || enrichedFood.food_name,
      brand: enrichedFood.brand || "",
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
      brand: "",
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      const cleanPayload: any = {
        food_name: formData.food_name,
        brand: formData.brand || "",
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

      if (editingLog && onUpdateLog && logMealToDiary) {
        await onUpdateLog(editingLog.id, {
          ...cleanPayload,
          meal_type: formData.meal_type,
        });
        onClose();
        return;
      }

      if (builderMode && logMealToDiary) {
        setStagedFoods([...stagedFoods, cleanPayload]);
        toast.success(`Added ${cleanPayload.food_name} to ${builderMode}`);
        setActiveTab(builderMode === "meal" ? "meals" : "recipes");
        setIsSubmitting(false);
        return;
      }

      if (saveAsCustom) {
        const dbPayload = {
          name: cleanPayload.food_name,
          brand: cleanPayload.brand,
          serving_size: cleanPayload.serving_size || 1,
          serving_unit: cleanPayload.serving_unit || "serving",
          custom_servings: baseFood?.custom_servings
            ? [...baseFood.custom_servings]
            : [],
          calories: cleanPayload.calories,
          protein_g: cleanPayload.protein_g,
          carbs_g: cleanPayload.carbs_g,
          fats_g: cleanPayload.fats_g,
          saturated_fats_g: cleanPayload.saturated_fats_g,
          fiber_g: cleanPayload.fiber_g,
          sugar_g: cleanPayload.sugar_g,
          potassium_mg: cleanPayload.potassium_mg,
          sodium_mg: cleanPayload.sodium_mg,
          iron_mg: cleanPayload.iron_mg,
          vitamin_d_mcg: cleanPayload.vitamin_d_mcg,
          zinc_mg: cleanPayload.zinc_mg,
          magnesium_mg: cleanPayload.magnesium_mg,
          calcium_mg: cleanPayload.calcium_mg,
          cholesterol_mg: cleanPayload.cholesterol_mg,
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

      if (logMealToDiary && !editingLog)
        await onAddMeal({ ...cleanPayload, meal_type: formData.meal_type });
      onClose();
    } catch (err: any) {
      alert("Failed to process request.");
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
        if (editingBundleId) {
          const { error } = await supabase
            .from("saved_meals")
            .update({ name: stagedName, foods: stagedFoods })
            .eq("id", editingBundleId);
          if (error) throw error;
          toast.success("Meal updated!");
        } else {
          const { error } = await supabase.from("saved_meals").insert({
            user_id: session.user.id,
            name: stagedName,
            foods: stagedFoods,
          });
          if (error) throw error;
          toast.success("Meal saved!");
        }
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
        if (editingBundleId) {
          const { error } = await supabase
            .from("recipes")
            .update({
              name: stagedName,
              servings,
              ingredients: stagedFoods,
              macros_per_serving,
            })
            .eq("id", editingBundleId);
          if (error) throw error;
          toast.success("Recipe updated!");
        } else {
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
      }
      setBuilderMode(null);
      setEditingBundleId(null);
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

  const handleDeleteCustomFoodClick = (e: React.MouseEvent, foodId: string) => {
    e.stopPropagation();
    setConfirmConfig({
      isOpen: true,
      title: "DELETE CUSTOM FOOD",
      message: "Are you sure you want to permanently delete this custom food?",
      confirmText: "Delete",
      isDestructive: true,
      action: async () => {
        setConfirmConfig(null);
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
      },
    });
  };

  const handleLogSavedMealClick = (meal: any) => {
    setConfirmConfig({
      isOpen: true,
      title: "LOG MEAL",
      message: `Log all items from '${meal.name}' into ${MEAL_TYPE_LABELS[formData.meal_type as keyof typeof MEAL_TYPE_LABELS]}?`,
      confirmText: "Log Items",
      isDestructive: false,
      action: async () => {
        setConfirmConfig(null);
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
      },
    });
  };

  const handleDeleteSavedEntityClick = (
    e: React.MouseEvent,
    id: string,
    table: "saved_meals" | "recipes",
  ) => {
    e.stopPropagation();
    setConfirmConfig({
      isOpen: true,
      title: table === "recipes" ? "DELETE RECIPE" : "DELETE MEAL",
      message: `Are you sure you want to permanently delete this ${table === "recipes" ? "recipe" : "saved meal"}?`,
      confirmText: "Delete",
      isDestructive: true,
      action: async () => {
        setConfirmConfig(null);
        const { error } = await supabase.from(table).delete().eq("id", id);
        if (!error) {
          if (table === "saved_meals")
            setSavedMeals((prev) => prev.filter((m) => m.id !== id));
          else setRecipes((prev) => prev.filter((r) => r.id !== id));
          toast.success("Deleted successfully!");
        } else {
          toast.error("Failed to delete.");
        }
      },
    });
  };

  // Dynamic Available Units Calculation during render!
  let parsedBaseServings = baseFood?.custom_servings || [];
  if (typeof parsedBaseServings === "string") {
    try {
      parsedBaseServings = JSON.parse(parsedBaseServings);
    } catch (e) {
      parsedBaseServings = [];
    }
  }

  if (
    parsedBaseServings.length === 0 &&
    (baseFood?.name || baseFood?.food_name)
  ) {
    const matchedCustom = customFoods.find(
      (cf) =>
        (cf.name || "").toLowerCase() ===
        (baseFood.name || baseFood.food_name || "").toLowerCase(),
    );
    if (matchedCustom && matchedCustom.custom_servings) {
      let matchParsed = matchedCustom.custom_servings;
      if (typeof matchParsed === "string") {
        try {
          matchParsed = JSON.parse(matchParsed);
        } catch (e) {
          matchParsed = [];
        }
      }
      parsedBaseServings = matchParsed;
    }
  }

  const availableUnits = Array.from(
    new Set([
      ...SERVING_UNITS,
      ...parsedBaseServings.map((s: any) => s.description),
    ]),
  );

  const activeTabClass =
    "bg-emerald-900/40 text-emerald-400 font-bold border border-emerald-800/50";
  const inactiveTabClass =
    "text-neutral-400 hover:text-white border border-transparent";
  const inputClass =
    "w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-[16px] sm:text-sm text-white focus:border-emerald-500 outline-none transition-colors";

  return (
    <>
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
              ) : editingLog ? (
                "Update Diary Entry"
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
              onClick={() => setActiveTab("scan")}
              className={`flex-1 py-2 sm:py-1.5 px-2 whitespace-nowrap rounded-md transition-colors ${activeTab === "scan" ? activeTabClass : inactiveTabClass}`}
            >
              Scan
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
            activeTab !== "recipes" &&
            activeTab !== "scan" && (
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
              <FoodList
                foods={filteredRecent}
                emptyMessage="No recent foods."
                onSelect={handleSelectFood}
              />
            )}

            {activeTab === "global" && (
              <FoodList
                foods={filteredGlobal}
                emptyMessage="No database foods match."
                onSelect={handleSelectFood}
                showAppBadge
              />
            )}

            {activeTab === "custom" && (
              <FoodList
                foods={filteredCustom}
                emptyMessage="No custom foods match."
                onSelect={handleSelectFood}
                onDelete={handleDeleteCustomFoodClick}
                showActions
              />
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
                      setEditingBundleId(null);
                    }}
                    onAddFood={() => setActiveTab("recent")}
                    onSave={handleSaveBuilder}
                    isSubmitting={isSubmitting}
                  />
                ) : (
                  <CollectionList
                    type="meal"
                    items={filteredMeals}
                    emptyMessage="No saved meals."
                    onLog={handleLogSavedMealClick}
                    onEdit={(e, meal) => {
                      e.stopPropagation();
                      setBuilderMode("meal");
                      setEditingBundleId(meal.id);
                      setStagedName(meal.name);
                      setStagedFoods(meal.foods || []);
                    }}
                    onDelete={handleDeleteSavedEntityClick}
                    onCreateNew={() => {
                      setBuilderMode("meal");
                      setEditingBundleId(null);
                      setStagedName("");
                      setStagedFoods([]);
                    }}
                  />
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
                      setEditingBundleId(null);
                    }}
                    onAddFood={() => setActiveTab("recent")}
                    onSave={handleSaveBuilder}
                    isSubmitting={isSubmitting}
                  />
                ) : (
                  <CollectionList
                    type="recipe"
                    items={filteredRecipes}
                    emptyMessage="No recipes created."
                    onLog={handleLogRecipe}
                    onEdit={(e, recipe) => {
                      e.stopPropagation();
                      setBuilderMode("recipe");
                      setEditingBundleId(recipe.id);
                      setStagedName(recipe.name);
                      setStagedFoods(recipe.ingredients || []);
                      setStagedServings(recipe.servings);
                    }}
                    onDelete={handleDeleteSavedEntityClick}
                    onCreateNew={() => {
                      setBuilderMode("recipe");
                      setEditingBundleId(null);
                      setStagedName("");
                      setStagedFoods([]);
                      setStagedServings("");
                    }}
                  />
                )}
              </div>
            )}

            {activeTab === "scan" && (
              <BarcodeScanner
                onProductFound={(foodData) => {
                  handleSelectFood(foodData, false);
                }}
              />
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
                isEditingLog={!!editingLog}
                isSubmitting={isSubmitting}
                onClose={onClose}
                onSubmit={handleSubmit}
              />
            )}
          </div>
        </div>
      </div>

      {confirmConfig && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-xs w-full p-6 text-white shadow-2xl animate-in fade-in zoom-in-95">
            <h3
              className={`text-lg font-bold font-mono tracking-wider mb-2 ${confirmConfig.isDestructive ? "text-rose-500" : "text-emerald-400"}`}
            >
              {confirmConfig.title}
            </h3>
            <p className="text-sm text-neutral-400 mb-6 font-mono leading-relaxed">
              {confirmConfig.message}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmConfig(null)}
                className="px-4 py-2 rounded font-mono text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmConfig.action}
                className={`px-4 py-2 rounded font-mono text-xs font-bold transition ${confirmConfig.isDestructive ? "bg-rose-600 hover:bg-rose-500 text-white" : "bg-emerald-600 hover:bg-emerald-500 text-white"}`}
              >
                {confirmConfig.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
