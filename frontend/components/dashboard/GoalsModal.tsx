"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

interface MealGroupProps {
  label: string;
  mealType: string;
  selectedDate: string;
  isToday: boolean;
  meals: any[];
  onDeleteMeal: (id: string) => void;
  onAddMeal: (payload: any) => Promise<any>;
  onAddMealClick: () => void;
}

// FIXED: Destructured `isToday` so the "Copy To" feature works, and added `meals = []` safety net
export default function MealGroup({
  label,
  mealType,
  selectedDate,
  isToday,
  meals = [],
  onDeleteMeal,
  onAddMeal,
  onAddMealClick,
}: MealGroupProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu if clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSaveAsMeal = async () => {
    setIsMenuOpen(false);
    if (!meals || meals.length === 0) {
      toast.error("No foods logged here yet!");
      return;
    }

    const mealName = prompt(
      `Enter a name to save this ${label} combination:`,
      `My ${label}`,
    );
    if (!mealName || mealName.trim() === "") return;

    toast.loading("Saving meal...", { id: "saveMeal" });

    const cleanFoods = meals.map((m) => ({
      food_name: m.food_name,
      serving_size: m.serving_size,
      serving_unit: m.serving_unit,
      calories: m.calories,
      protein_g: m.protein_g,
      carbs_g: m.carbs_g,
      fats_g: m.fats_g,
      saturated_fats_g: m.saturated_fats_g || 0,
      fiber_g: m.fiber_g || 0,
      sugar_g: m.sugar_g || 0,
      potassium_mg: m.potassium_mg || 0,
      sodium_mg: m.sodium_mg || 0,
      iron_mg: m.iron_mg || 0,
      vitamin_d_mcg: m.vitamin_d_mcg || 0,
      zinc_mg: m.zinc_mg || 0,
      magnesium_mg: m.magnesium_mg || 0,
      calcium_mg: m.calcium_mg || 0,
      cholesterol_mg: m.cholesterol_mg || 0,
    }));

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      const { error } = await supabase.from("saved_meals").insert({
        user_id: session.user.id,
        name: mealName.trim(),
        foods: cleanFoods,
      });
      if (error) throw error;
      toast.success("Meal saved successfully!", { id: "saveMeal" });
    } catch (err: any) {
      toast.error("Failed to save meal", { id: "saveMeal" });
    }
  };

  const handleCopyFromDate = async (fromDate: string) => {
    setIsMenuOpen(false);
    toast.loading(`Fetching meals from ${fromDate}...`, { id: "copyMeal" });
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/diary/${fromDate}`,
        {
          headers: { Authorization: `Bearer ${session.access_token}` },
        },
      );

      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();

      const foodsToCopy = (data.meals || []).filter(
        (m: any) => m.meal_type?.toLowerCase() === mealType?.toLowerCase(),
      );

      if (foodsToCopy.length === 0) {
        toast.error(`No foods logged for ${label} on ${fromDate}.`, {
          id: "copyMeal",
        });
        return;
      }

      toast.loading(`Copying ${foodsToCopy.length} items...`, {
        id: "copyMeal",
      });

      for (const food of foodsToCopy) {
        const cleanFood = { ...food, meal_type: mealType };
        delete cleanFood.id;
        delete cleanFood.date;
        delete cleanFood.created_at;
        delete cleanFood.user_id;

        await onAddMeal(cleanFood);
      }

      toast.success(`Copied ${label} from ${fromDate}!`, { id: "copyMeal" });
    } catch (err) {
      toast.error("Failed to copy meal", { id: "copyMeal" });
    }
  };

  const handleCopyToDate = async (toDate: string) => {
    setIsMenuOpen(false);
    if (!meals || meals.length === 0) {
      toast.error("No foods to copy!");
      return;
    }

    toast.loading(`Copying ${label} to ${toDate}...`, { id: "copyMeal" });
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      for (const food of meals) {
        const cleanFood = { ...food, meal_type: mealType };
        delete cleanFood.id;
        delete cleanFood.date;
        delete cleanFood.created_at;
        delete cleanFood.user_id;

        await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/diary/${toDate}/meals`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ ...cleanFood, date: toDate }),
          },
        );
      }

      toast.success(`Copied to ${toDate}!`, { id: "copyMeal" });
    } catch (err) {
      toast.error("Failed to copy meal", { id: "copyMeal" });
    }
  };

  const safeMeals = meals || [];

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-5 shadow-sm h-full flex flex-col relative">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-white flex items-center gap-2 text-sm sm:text-base tracking-tight">
          {label}
          <span className="text-[10px] bg-neutral-950 px-2 py-0.5 rounded-full text-neutral-500 font-mono border border-neutral-800">
            {safeMeals.length} items
          </span>
        </h3>

        <div className="flex items-center gap-2">
          <button
            onClick={onAddMealClick}
            className="text-[10px] sm:text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white px-2.5 py-1 rounded transition-colors active:scale-95"
          >
            + Add
          </button>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-neutral-500 hover:text-white px-2 py-1 transition-colors flex flex-col gap-0.5"
            >
              <span className="w-1 h-1 bg-current rounded-full"></span>
              <span className="w-1 h-1 bg-current rounded-full"></span>
              <span className="w-1 h-1 bg-current rounded-full"></span>
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-neutral-950 border border-neutral-800 rounded-lg shadow-xl z-20 overflow-hidden animate-in fade-in slide-in-from-top-2 flex flex-col">
                <button
                  onClick={handleSaveAsMeal}
                  className="w-full text-left px-4 py-3 text-xs font-mono text-emerald-400 hover:bg-neutral-900 transition-colors border-b border-neutral-800"
                >
                  + Save as a Bundle
                </button>

                {/* Dynamic "Copy From" Date Picker */}
                <div className="px-4 py-3 border-b border-neutral-800 bg-neutral-950 hover:bg-neutral-900 transition-colors">
                  <label className="text-[10px] uppercase tracking-wider font-mono text-blue-400 mb-1.5 block cursor-pointer">
                    ↶ Copy from date
                  </label>
                  <input
                    type="date"
                    onChange={(e) => {
                      if (e.target.value) handleCopyFromDate(e.target.value);
                    }}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded p-1.5 text-xs text-white font-mono focus:border-blue-500 outline-none transition-colors [color-scheme:dark] cursor-pointer"
                  />
                </div>

                {/* Dynamic "Copy To" Date Picker (Only shows on 'Today') */}
                {isToday && (
                  <div className="px-4 py-3 bg-neutral-950 hover:bg-neutral-900 transition-colors">
                    <label className="text-[10px] uppercase tracking-wider font-mono text-purple-400 mb-1.5 block cursor-pointer">
                      ↷ Copy to date
                    </label>
                    <input
                      type="date"
                      onChange={(e) => {
                        if (e.target.value) handleCopyToDate(e.target.value);
                      }}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded p-1.5 text-xs text-white font-mono focus:border-purple-500 outline-none transition-colors [color-scheme:dark] cursor-pointer"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-2">
        {safeMeals.length === 0 ? (
          <p className="text-[11px] sm:text-xs text-neutral-600 font-mono italic">
            No foods logged for {(label || "").toLowerCase()} yet.
          </p>
        ) : (
          safeMeals.map((meal) => (
            <div
              key={meal.id}
              className="group flex justify-between items-center p-2.5 rounded-lg hover:bg-neutral-950 border border-transparent hover:border-neutral-800/80 transition-colors"
            >
              <div>
                <p className="text-xs sm:text-sm font-medium text-neutral-200">
                  {meal.food_name}
                </p>
                <p className="text-[10px] sm:text-[11px] text-neutral-500 font-mono mt-0.5">
                  {meal.serving_size} {meal.serving_unit} • {meal.calories} kcal
                  | P: {meal.protein_g}g | C: {meal.carbs_g}g | F: {meal.fats_g}
                  g
                </p>
              </div>
              <button
                onClick={() => onDeleteMeal(meal.id)}
                className="text-neutral-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all px-2 py-1 font-bold text-sm"
                title="Remove food"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
