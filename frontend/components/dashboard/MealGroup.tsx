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

export default function MealGroup({
  label,
  mealType,
  selectedDate,
  meals = [],
  onDeleteMeal,
  onAddMeal,
  onAddMealClick,
}: MealGroupProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const extractCleanPayload = (m: any) => ({
    meal_type: mealType,
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
  });

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

    toast.loading("Saving bundle...", { id: "saveMeal" });

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      const cleanFoods = meals.map(extractCleanPayload);

      const { error } = await supabase
        .from("saved_meals")
        .insert({
          user_id: session.user.id,
          name: mealName.trim(),
          foods: cleanFoods,
        });
      if (error) throw error;
      toast.success("Bundle saved successfully!", { id: "saveMeal" });
    } catch (err: any) {
      toast.error("Failed to save bundle", { id: "saveMeal" });
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

      // Uses your backend's verified /logs/{date} route
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/logs/${fromDate}`,
        {
          headers: { Authorization: `Bearer ${session.access_token}` },
        },
      );

      if (res.status === 404) {
        toast.error(`No logs found for ${fromDate}.`, { id: "copyMeal" });
        return;
      }

      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();

      const foodsToCopy = (data.meals || []).filter(
        (m: any) => m.meal_type?.toLowerCase() === mealType?.toLowerCase(),
      );

      if (foodsToCopy.length === 0) {
        toast.error(`No ${label} logged on ${fromDate}.`, { id: "copyMeal" });
        return;
      }

      toast.loading(`Copying ${foodsToCopy.length} items...`, {
        id: "copyMeal",
      });

      for (const food of foodsToCopy) {
        const cleanFood = extractCleanPayload(food);
        await onAddMeal(cleanFood);
      }

      toast.success(`Copied ${label} from ${fromDate}!`, { id: "copyMeal" });
    } catch (err) {
      console.error(err);
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

      // 1. Get or create the daily_log ID for the target date directly via Supabase / backend fetch
      let logRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/logs/${toDate}`,
        {
          headers: { Authorization: `Bearer ${session.access_token}` },
        },
      );

      let dailyLogId;
      if (logRes.ok) {
        const logData = await logRes.json();
        dailyLogId = logData.id;
      }

      // If the log doesn't exist yet, let's create it or use Supabase client to insert directly
      if (!dailyLogId) {
        const { data: newLog, error: logErr } = await supabase
          .from("daily_logs")
          .upsert(
            { user_id: session.user.id, date: toDate },
            { onConflict: "user_id,date" },
          )
          .select("id")
          .single();

        if (logErr) throw logErr;
        dailyLogId = newLog.id;
      }

      // 2. Insert the meals directly into the `meals` table linked to that daily_log_id
      for (const food of meals) {
        const cleanFood = {
          ...extractCleanPayload(food),
          daily_log_id: dailyLogId,
        };

        const { error: insertErr } = await supabase
          .from("meals")
          .insert(cleanFood);

        if (insertErr) throw insertErr;
      }

      toast.success(`Copied to ${toDate}!`, { id: "copyMeal" });
    } catch (err) {
      console.error(err);
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
              <div className="absolute right-0 mt-2 w-48 bg-neutral-950 border border-neutral-800 rounded-lg shadow-xl z-20 overflow-hidden animate-in fade-in slide-in-from-top-2 flex flex-col">
                <button
                  onClick={handleSaveAsMeal}
                  className="w-full text-left px-4 py-3 text-xs font-mono text-emerald-400 hover:bg-neutral-900 transition-colors border-b border-neutral-800"
                >
                  + Save as a Bundle
                </button>

                <div className="relative w-full hover:bg-neutral-900 transition-colors border-b border-neutral-800">
                  <div className="flex justify-between items-center px-4 py-3 text-xs font-mono text-blue-400 pointer-events-none">
                    <span>↶ Copy From</span>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect
                        x="3"
                        y="4"
                        width="18"
                        height="18"
                        rx="2"
                        ry="2"
                      ></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                  </div>
                  <input
                    type="date"
                    onChange={(e) => {
                      if (e.target.value) {
                        handleCopyFromDate(e.target.value);
                        e.target.value = "";
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full [color-scheme:dark]"
                    title="Copy from date"
                  />
                </div>

                <div className="relative w-full hover:bg-neutral-900 transition-colors">
                  <div className="flex justify-between items-center px-4 py-3 text-xs font-mono text-purple-400 pointer-events-none">
                    <span>↷ Copy To</span>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect
                        x="3"
                        y="4"
                        width="18"
                        height="18"
                        rx="2"
                        ry="2"
                      ></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                  </div>
                  <input
                    type="date"
                    onChange={(e) => {
                      if (e.target.value) {
                        handleCopyToDate(e.target.value);
                        e.target.value = "";
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full [color-scheme:dark]"
                    title="Copy to date"
                  />
                </div>
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
