"use client";

import { useEffect, useState, FormEvent } from "react";
import { getDailyLog, logMeal, deleteMeal, DailySummary } from "@/lib/api";

export default function Dashboard() {
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // We use `any` for form UI state so inputs can cleanly hold empty strings "" while typing
  const [formData, setFormData] = useState<any>({
    meal_type: "lunch",
    food_name: "",
    serving_size: 100,
    serving_unit: "g",
    calories: "",
    protein_g: "",
    carbs_g: "",
    fats_g: "",
  });

  const USER_ID = 7;
  const TODAY = new Date().toISOString().split("T")[0];

  const TARGETS = {
    calories: 2500,
    protein: 180,
    carbs: 300,
    fats: 70,
  };

  const refreshData = async () => {
    try {
      const data = await getDailyLog(USER_ID, TODAY);
      setSummary(data);
    } catch (err) {
      console.error("Error fetching summary:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, [TODAY]);

  const handleDeleteMeal = async (mealId: number) => {
    try {
      await deleteMeal(mealId);
      await refreshData();
    } catch (err) {
      alert("Failed to delete meal entry.");
    }
  };

  const handleCreateMeal = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Attach user_id and date explicitly to satisfy relational Pydantic schemas
      const cleanPayload = {
        ...formData,
        user_id: USER_ID,
        date: TODAY,
        serving_size: Number(formData.serving_size) || 0,
        calories: Number(formData.calories) || 0,
        protein_g: Number(formData.protein_g) || 0,
        carbs_g: Number(formData.carbs_g) || 0,
        fats_g: Number(formData.fats_g) || 0,
      };

      await logMeal(USER_ID, cleanPayload as any);
      setIsModalOpen(false);
      
      // Reset form back to clean empty inputs
      setFormData({
        meal_type: "lunch",
        food_name: "",
        serving_size: 100,
        serving_unit: "g",
        calories: "",
        protein_g: "",
        carbs_g: "",
        fats_g: "",
      });
      
      await refreshData();
    } catch (err: any) {
      console.error("FastAPI Error:", err);
      
      // Smart formatting for FastAPI 422 Pydantic Validation errors
      let errorMessage = "Failed to log meal.";
      if (err?.detail && Array.isArray(err.detail)) {
        // Extracts the exact field name and reason (e.g., "Field 'meal_type': Input should be 'LUNCH'...")
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

  if (loading) return <div className="p-8 text-white">Loading nutrition engine...</div>;

  const calProgress = Math.min(((summary?.total_calories || 0) / TARGETS.calories) * 100, 100);
  const protProgress = Math.min(((summary?.total_protein_g || 0) / TARGETS.protein) * 100, 100);
  const carbsProgress = Math.min(((summary?.total_carbs_g || 0) / TARGETS.carbs) * 100, 100);
  const fatsProgress = Math.min(((summary?.total_fats_g || 0) / TARGETS.fats) * 100, 100);
  
  // Define the display order and matching schema strings
  const MEAL_CATEGORIES = [
    { id: "breakfast", label: "Breakfast" },
    { id: "lunch", label: "Lunch" },
    { id: "dinner", label: "Dinner" },
    { id: "pre_workout", label: "Pre-Workout" },
    { id: "post_workout", label: "Post-Workout" },
    { id: "snack", label: "Snacks" },
  ];

  // Group the raw array of logs by meal_type and calculate subtotals
  const groupedMeals = MEAL_CATEGORIES.map((category) => {
    // Safely filter summary?.meals (handling loading/undefined states)
    const items = (summary?.meals || []).filter(
      (m: any) => m.meal_type?.toLowerCase() === category.id
    );

    // Calculate meal-specific macro subtotals
    const totalCalories = items.reduce((sum, m: any) => sum + (m.calories || 0), 0);
    const totalProtein = items.reduce((sum, m: any) => sum + (m.protein_g || 0), 0);
    const totalCarbs = items.reduce((sum, m: any) => sum + (m.carbs_g || 0), 0);
    const totalFats = items.reduce((sum, m: any) => sum + (m.fats_g || 0), 0);

    return {
      ...category,
      items,
      totalCalories,
      totalProtein,
      totalCarbs,
      totalFats,
    };
  });

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-6 md:p-12 relative">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="border-b border-neutral-800 pb-6 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Daily Nutrition Dashboard</h1>
            <p className="text-neutral-400 text-sm mt-1">Date: {TODAY}</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm"
          >
            <span>+</span> Log Meal
          </button>
        </header>

        {/* 2x2 Macro Progress Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-800 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-400">Calories</span>
              <span className="font-mono font-bold">
                {summary?.total_calories || 0} / {TARGETS.calories} kcal
              </span>
            </div>
            <div className="w-full bg-neutral-800 h-3 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${calProgress}%` }} />
            </div>
          </div>

          <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-800 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-400">Protein</span>
              <span className="font-mono font-bold">
                {summary?.total_protein_g || 0} / {TARGETS.protein} g
              </span>
            </div>
            <div className="w-full bg-neutral-800 h-3 rounded-full overflow-hidden">
              <div className="bg-blue-500 h-full transition-all duration-500" style={{ width: `${protProgress}%` }} />
            </div>
          </div>

          <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-800 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-400">Carbs</span>
              <span className="font-mono font-bold">
                {summary?.total_carbs_g || 0} / {TARGETS.carbs} g
              </span>
            </div>
            <div className="w-full bg-neutral-800 h-3 rounded-full overflow-hidden">
              <div className="bg-amber-500 h-full transition-all duration-500" style={{ width: `${carbsProgress}%` }} />
            </div>
          </div>

          <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-800 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-400">Fats</span>
              <span className="font-mono font-bold">
                {summary?.total_fats_g || 0} / {TARGETS.fats} g
              </span>
            </div>
            <div className="w-full bg-neutral-800 h-3 rounded-full overflow-hidden">
              <div className="bg-rose-500 h-full transition-all duration-500" style={{ width: `${fatsProgress}%` }} />
            </div>
          </div>
        </div>

        {/* Grouped Categorized Meals List */}
        <div className="space-y-6 mt-8">
          {groupedMeals.map((group) => (
            <div 
              key={group.id} 
              className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-sm"
            >
              {/* Category Header with Macro Subtotals */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-800 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-white">{group.label}</h3>
                  <span className="text-xs font-medium bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded-full">
                    {group.items.length} {group.items.length === 1 ? "item" : "items"}
                  </span>
                </div>
                
                {group.items.length > 0 && (
                  <div className="flex items-center gap-3 text-xs font-mono text-neutral-400 mt-2 sm:mt-0">
                    <span><strong className="text-white">{group.totalCalories}</strong> kcal</span>
                    <span>•</span>
                    <span><strong className="text-emerald-400">{group.totalProtein.toFixed(1)}g</strong> P</span>
                    <span><strong className="text-blue-400">{group.totalCarbs.toFixed(1)}g</strong> C</span>
                    <span><strong className="text-rose-400">{group.totalFats.toFixed(1)}g</strong> F</span>
                  </div>
                )}
              </div>

              {/* Food Entries Inside This Category */}
              {group.items.length === 0 ? (
                <p className="text-sm text-neutral-600 italic py-2">No foods logged for {group.label.toLowerCase()} yet.</p>
              ) : (
                <div className="divide-y divide-neutral-800">
                  {group.items.map((meal: any) => (
                    <div key={meal.id} className="py-4 flex justify-between items-center group">
                      <div>
                        <h4 className="font-medium text-neutral-200">{meal.food_name}</h4>
                        <p className="text-xs text-neutral-400 font-mono mt-0.5">
                          {meal.quantity_g || meal.serving_size || 0}g serving
                        </p>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right font-mono text-sm">
                          <div className="text-neutral-200">{meal.calories} kcal</div>
                          <div className="text-xs text-neutral-400">
                            P: {meal.protein_g}g | C: {meal.carbs_g}g | F: {meal.fats_g}g
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteMeal(meal.id)}
                          className="text-neutral-500 hover:text-rose-500 p-2 transition-colors text-lg font-bold"
                          title="Delete meal"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Modal Overlay for Logging Meals */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-md w-full p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-4">
              <h3 className="text-lg font-semibold">Log a New Meal</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-neutral-400 hover:text-white">×</button>
            </div>

            <form onSubmit={handleCreateMeal} className="space-y-4">
              <div>
                <label className="text-xs text-neutral-400 block mb-1">Food Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Chicken Breast & Rice"
                  value={formData.food_name}
                  onChange={(e) => setFormData({ ...formData, food_name: e.target.value })}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Meal Type</label>
                  <select
                    value={formData.meal_type}
                    onChange={(e) => setFormData({ ...formData, meal_type: e.target.value })}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="dinner">Dinner</option>
                    <option value="snack">Snack</option>
                    <option value="pre_workout">Pre-Workout</option>
                    <option value="post_workout">Post-Workout</option>
                  </select>
                </div>

                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-neutral-400 block mb-1">Serving</label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="100"
                      value={formData.serving_size}
                      onChange={(e) => setFormData({ ...formData, serving_size: e.target.value === "" ? "" : e.target.value })}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-sm font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="w-20">
                    <label className="text-xs text-neutral-400 block mb-1">Unit</label>
                    <select
                      value={formData.serving_unit}
                      onChange={(e) => setFormData({ ...formData, serving_unit: e.target.value as any })}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-sm focus:outline-none focus:border-emerald-500"
                    >
                      <option value="g">g</option>
                      <option value="oz">oz</option>
                      <option value="lb">lb</option>
                      <option value="ml">ml</option>
                      <option value="fl_oz">fl oz</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Macro Inputs */}
              <div className="grid grid-cols-2 gap-4 border-t border-neutral-800 pt-4">
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Calories (kcal)</label>
                  <input
                    type="number"
                    required
                    placeholder="0"
                    value={formData.calories}
                    onChange={(e) => setFormData({ ...formData, calories: e.target.value === "" ? "" : e.target.value })}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-sm font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Protein (g)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="0"
                    value={formData.protein_g}
                    onChange={(e) => setFormData({ ...formData, protein_g: e.target.value === "" ? "" : e.target.value })}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-sm font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Carbs (g)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="0"
                    value={formData.carbs_g}
                    onChange={(e) => setFormData({ ...formData, carbs_g: e.target.value === "" ? "" : e.target.value })}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-sm font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Fats (g)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="0"
                    value={formData.fats_g}
                    onChange={(e) => setFormData({ ...formData, fats_g: e.target.value === "" ? "" : e.target.value })}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-sm font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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
      )}
    </main>
  );
}