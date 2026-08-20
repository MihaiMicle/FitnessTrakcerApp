"use client";

import { useState, useRef, useEffect, useMemo } from "react";
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
  onEditMeal?: (meal: any) => void;
}

const mealOptions = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snacks" },
];

export default function MealGroup({
  label,
  mealType,
  selectedDate,
  meals = [],
  onDeleteMeal,
  onAddMeal,
  onAddMealClick,
  onEditMeal,
}: MealGroupProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [bundleName, setBundleName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [copyModalConfig, setCopyModalConfig] = useState<{
    isOpen: boolean;
    mode: "from" | "to";
  }>({ isOpen: false, mode: "from" });
  const [selectedCopyDate, setSelectedCopyDate] = useState("");
  const [selectedCopyMeal, setSelectedCopyMeal] = useState(mealType);
  const activeDateRef = useRef<HTMLDivElement>(null);

  const [localMeals, setLocalMeals] = useState<any[]>([]);
  const [isManageMode, setIsManageMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    isDestructive: boolean;
    action: () => void;
  } | null>(null);

  useEffect(() => {
    const currentIds = localMeals
      .map((m) => m.id)
      .sort()
      .join(",");
    const newIds = meals
      .map((m) => m.id)
      .sort()
      .join(",");
    if (currentIds !== newIds) {
      setLocalMeals(meals);
    }
  }, [meals, localMeals]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (copyModalConfig.isOpen && activeDateRef.current) {
      activeDateRef.current.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
    }
  }, [copyModalConfig.isOpen]);

  const dateOptions = useMemo(() => {
    const options = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = -14; i <= 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);

      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;

      let displayLabel = dateStr;
      if (i === -1) displayLabel = "Yesterday";
      else if (i === 0) displayLabel = "Today";
      else if (i === 1) displayLabel = "Tomorrow";
      else {
        displayLabel = d.toLocaleDateString("en-GB", {
          weekday: "short",
          day: "numeric",
          month: "short",
        });
      }
      options.push({ value: dateStr, label: displayLabel });
    }
    return options;
  }, []);

  const extractCleanPayload = (m: any, overrideMealType?: string) => ({
    meal_type: overrideMealType || mealType,
    food_name: m.food_name || m.name,
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

  const handleSaveAsMealClick = () => {
    setIsMenuOpen(false);
    if (!meals || meals.length === 0) {
      toast.error("No foods logged here yet!");
      return;
    }
    setBundleName(`My ${label}`);
    setIsPromptOpen(true);
  };

  const confirmSaveBundle = async () => {
    if (!bundleName.trim()) {
      toast.error("Please enter a name for the bundle.");
      return;
    }
    setIsSaving(true);
    toast.loading("Saving bundle...", { id: "saveMeal" });

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");
      const cleanFoods = localMeals.map((m) => extractCleanPayload(m));
      const { error } = await supabase.from("saved_meals").insert({
        user_id: session.user.id,
        name: bundleName.trim(),
        foods: cleanFoods,
      });
      if (error) throw error;
      toast.success("Bundle saved successfully!", { id: "saveMeal" });
      setIsPromptOpen(false);
    } catch (err: any) {
      toast.error("Failed to save meal", { id: "saveMeal" });
    } finally {
      setIsSaving(false);
    }
  };

  const openCopyModal = (mode: "from" | "to") => {
    setIsMenuOpen(false);
    if (mode === "to" && (!meals || meals.length === 0)) {
      toast.error("No foods to copy!");
      return;
    }
    const baseDate = new Date(selectedDate);
    baseDate.setDate(baseDate.getDate() + (mode === "from" ? -1 : 1));
    const year = baseDate.getFullYear();
    const month = String(baseDate.getMonth() + 1).padStart(2, "0");
    const day = String(baseDate.getDate()).padStart(2, "0");
    setSelectedCopyDate(`${year}-${month}-${day}`);
    setSelectedCopyMeal(mealType);
    setCopyModalConfig({ isOpen: true, mode });
  };

  const handleExecuteCopy = async () => {
    setCopyModalConfig({ ...copyModalConfig, isOpen: false });
    const { mode } = copyModalConfig;
    toast.loading(mode === "from" ? `Fetching meals...` : `Copying meals...`, {
      id: "copyMeal",
    });

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      if (mode === "from") {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/logs/${selectedCopyDate}`,
          { headers: { Authorization: `Bearer ${session.access_token}` } },
        );
        if (res.status === 404) {
          toast.error(`No logs found for ${selectedCopyDate}.`, {
            id: "copyMeal",
          });
          return;
        }
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        const foodsToCopy = (data.meals || []).filter(
          (m: any) =>
            m.meal_type?.toLowerCase() === selectedCopyMeal.toLowerCase(),
        );
        if (foodsToCopy.length === 0) {
          toast.error(`No foods logged on ${selectedCopyDate}.`, {
            id: "copyMeal",
          });
          return;
        }

        toast.loading(`Copying ${foodsToCopy.length} items...`, {
          id: "copyMeal",
        });
        for (const food of foodsToCopy)
          await onAddMeal(extractCleanPayload(food));
        toast.success(`Copied into ${label}!`, { id: "copyMeal" });
      } else {
        await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/logs/${selectedCopyDate}`,
          { headers: { Authorization: `Bearer ${session.access_token}` } },
        );
        for (const food of localMeals) {
          const cleanFood = extractCleanPayload(food, selectedCopyMeal);
          let res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/logs/${selectedCopyDate}/meals`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify(cleanFood),
            },
          );
          if (res.status === 404 || res.status === 405) {
            res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/meals`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({ ...cleanFood, date: selectedCopyDate }),
            });
          }
          if (!res.ok) throw new Error(await res.text());
        }
        toast.success(`Copied to ${selectedCopyDate}!`, { id: "copyMeal" });
      }
    } catch (err: any) {
      toast.error(`Failed: ${err.message || "Could not copy meal"}`, {
        id: "copyMeal",
      });
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleBulkDeleteClick = () => {
    if (selectedIds.length === 0) return;
    setConfirmConfig({
      isOpen: true,
      title: "DELETE ITEMS",
      message: `Are you sure you want to delete ${selectedIds.length} items from your diary? This cannot be undone.`,
      confirmText: "Delete Items",
      isDestructive: true,
      action: () => {
        for (const id of selectedIds) {
          onDeleteMeal(id);
        }
        setSelectedIds([]);
        setIsManageMode(false);
        setConfirmConfig(null);
      },
    });
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", "");
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const itemsCopy = [...localMeals];
    const draggedItem = itemsCopy[draggedIndex];
    itemsCopy.splice(draggedIndex, 1);
    itemsCopy.splice(index, 0, draggedItem);
    setDraggedIndex(index);
    setLocalMeals(itemsCopy);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDraggedIndex(null);
  };

  const totalCalories = Math.round(
    localMeals.reduce((sum, m) => sum + (Number(m.calories) || 0), 0),
  );
  const totalProtein = Math.round(
    localMeals.reduce((sum, m) => sum + (Number(m.protein_g) || 0), 0),
  );
  const totalCarbs = Math.round(
    localMeals.reduce((sum, m) => sum + (Number(m.carbs_g) || 0), 0),
  );
  const totalFats = Math.round(
    localMeals.reduce((sum, m) => sum + (Number(m.fats_g) || 0), 0),
  );

  return (
    <>
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-5 shadow-sm h-full flex flex-col relative">
        <div className="flex justify-between items-start sm:items-center mb-4">
          <div className="flex flex-col gap-1.5">
            <h3 className="font-bold text-white flex items-center gap-2 text-sm sm:text-base tracking-tight">
              {label}
              <span className="text-[10px] bg-neutral-950 px-2 py-0.5 rounded-full text-neutral-500 font-mono border border-neutral-800">
                {localMeals.length} items
              </span>
            </h3>

            {localMeals.length > 0 && (
              <div className="text-[10px] font-mono flex items-center gap-2 sm:gap-3 flex-wrap">
                <span className="text-neutral-200">{totalCalories} kcal</span>
                <span className="text-neutral-600 hidden sm:inline">|</span>
                <span className="text-blue-400">P: {totalProtein}g</span>
                <span className="text-amber-400">C: {totalCarbs}g</span>
                <span className="text-rose-400">F: {totalFats}g</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1 sm:mt-0">
            {isManageMode ? (
              <>
                <button
                  onClick={() => {
                    setIsManageMode(false);
                    setSelectedIds([]);
                  }}
                  className="text-[10px] sm:text-xs font-mono font-medium bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white px-3 py-1.5 rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkDeleteClick}
                  disabled={selectedIds.length === 0}
                  className="text-[10px] sm:text-xs font-mono font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500 hover:text-white px-3 py-1.5 rounded transition-colors disabled:opacity-50"
                >
                  Delete ({selectedIds.length})
                </button>
              </>
            ) : (
              <>
                {localMeals.length > 0 && (
                  <button
                    onClick={() => setIsManageMode(true)}
                    className="text-[10px] sm:text-xs font-mono font-medium bg-neutral-950 text-neutral-400 border border-neutral-800 hover:bg-neutral-800 hover:text-white px-2.5 py-1 rounded transition-colors"
                  >
                    Manage
                  </button>
                )}
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
                        onClick={handleSaveAsMealClick}
                        className="w-full text-left px-4 py-3 text-xs font-mono text-emerald-400 hover:bg-neutral-900 transition-colors border-b border-neutral-800"
                      >
                        + Save as a Meal
                      </button>
                      <button
                        onClick={() => openCopyModal("from")}
                        className="w-full flex justify-between items-center px-4 py-3 text-xs font-mono text-blue-400 hover:bg-neutral-900 transition-colors border-b border-neutral-800"
                      >
                        <span>↶ Copy From...</span>
                      </button>
                      <button
                        onClick={() => openCopyModal("to")}
                        className="w-full flex justify-between items-center px-4 py-3 text-xs font-mono text-purple-400 hover:bg-neutral-900 transition-colors"
                      >
                        <span>↷ Copy To...</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex-1 space-y-2">
          {localMeals.length === 0 ? (
            <p className="text-[11px] sm:text-xs text-neutral-600 font-mono italic">
              No foods logged for {(label || "").toLowerCase()} yet.
            </p>
          ) : (
            localMeals.map((meal, idx) => (
              <div
                key={meal.id}
                draggable={!isManageMode}
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragEnd={handleDrop}
                onClick={() => {
                  if (isManageMode) {
                    toggleSelection(meal.id);
                  } else if (onEditMeal) {
                    onEditMeal(meal);
                  }
                }}
                className={`group flex justify-between items-center p-2.5 rounded-lg border transition-all ${
                  isManageMode || onEditMeal ? "cursor-pointer" : ""
                } ${
                  draggedIndex === idx
                    ? "opacity-40 bg-emerald-950/30 border-emerald-500/50 border-dashed"
                    : "bg-transparent border-transparent hover:bg-neutral-950 hover:border-neutral-800/80"
                }`}
              >
                <div className="flex items-center gap-3">
                  {isManageMode ? (
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(meal.id)}
                      readOnly
                      className="w-4 h-4 rounded border-neutral-600 bg-neutral-900 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-neutral-900 cursor-pointer accent-emerald-500 pointer-events-none"
                    />
                  ) : (
                    <div
                      className="cursor-grab active:cursor-grabbing text-neutral-700 hover:text-neutral-400 transition-colors py-2"
                      title="Drag to reorder"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="3" y1="9" x2="21" y2="9"></line>
                        <line x1="3" y1="15" x2="21" y2="15"></line>
                      </svg>
                    </div>
                  )}

                  <div>
                    <p
                      className={`text-xs sm:text-sm font-medium ${selectedIds.includes(meal.id) ? "text-emerald-400" : "text-neutral-200"} transition-colors`}
                    >
                      {meal.food_name || meal.name}
                    </p>
                    <p className="text-[10px] sm:text-[11px] text-neutral-500 font-mono mt-0.5">
                      {meal.serving_size} {meal.serving_unit} • {meal.calories}{" "}
                      kcal | P: {meal.protein_g}g | C: {meal.carbs_g}g | F:{" "}
                      {meal.fats_g}g
                    </p>
                  </div>
                </div>

                {!isManageMode && (
                  <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteMeal(meal.id);
                      }}
                      className="text-neutral-500 hover:text-rose-500 font-bold px-2 py-1 text-sm transition-colors"
                      title="Remove food"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {isPromptOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-sm w-full p-6 text-white shadow-2xl animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold font-mono tracking-wider mb-2">
              SAVE MEAL
            </h3>
            <p className="text-xs text-neutral-400 mb-4 font-mono">
              Enter a name for this {label} combination so you can easily log it
              later.
            </p>
            <input
              type="text"
              autoFocus
              value={bundleName}
              onChange={(e) => setBundleName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && confirmSaveBundle()}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 font-mono text-sm focus:outline-none focus:border-emerald-500 text-white transition-colors mb-6"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsPromptOpen(false)}
                disabled={isSaving}
                className="px-4 py-2 rounded font-mono text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmSaveBundle}
                disabled={isSaving}
                className="px-4 py-2 rounded font-mono text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save Meal"}
              </button>
            </div>
          </div>
        </div>
      )}

      {copyModalConfig.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-t-2xl sm:rounded-xl w-full max-w-md flex flex-col shadow-2xl animate-in slide-in-from-bottom-5 sm:zoom-in-95">
            <div className="flex justify-between items-center p-5 border-b border-neutral-800">
              <h3 className="text-base font-bold text-white tracking-wider">
                {copyModalConfig.mode === "from" ? "Copy from" : "Copy to"}
              </h3>
              <button
                onClick={() =>
                  setCopyModalConfig({ ...copyModalConfig, isOpen: false })
                }
                className="text-neutral-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="flex h-56 py-3 bg-neutral-950 relative">
              <div className="flex-1 overflow-y-auto custom-scrollbar px-3 space-y-1">
                {mealOptions.map((m) => (
                  <div
                    key={m.value}
                    onClick={() => setSelectedCopyMeal(m.value)}
                    className={`px-3 py-2.5 text-center rounded-lg cursor-pointer transition-colors text-sm font-medium ${selectedCopyMeal === m.value ? "bg-neutral-800 text-white shadow-sm border border-neutral-700" : "text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900/50 border border-transparent"}`}
                  >
                    {m.label}
                  </div>
                ))}
              </div>
              <div className="w-px bg-neutral-800 my-2"></div>
              <div className="flex-1 overflow-y-auto custom-scrollbar px-3 space-y-1">
                {dateOptions.map((d) => (
                  <div
                    key={d.value}
                    ref={selectedCopyDate === d.value ? activeDateRef : null}
                    onClick={() => setSelectedCopyDate(d.value)}
                    className={`px-3 py-2.5 text-center rounded-lg cursor-pointer transition-colors text-sm font-medium ${selectedCopyDate === d.value ? "bg-neutral-800 text-white shadow-sm border border-neutral-700" : "text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900/50 border border-transparent"}`}
                  >
                    {d.label}
                  </div>
                ))}
              </div>
            </div>
            <div className="p-5 border-t border-neutral-800 bg-neutral-900 rounded-b-xl">
              <button
                onClick={handleExecuteCopy}
                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold tracking-wide shadow-lg shadow-emerald-900/20 transition-all active:scale-95"
              >
                Log
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmConfig?.isOpen && (
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
