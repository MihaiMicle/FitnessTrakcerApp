"use client";

import { useState, useEffect } from "react";

export type WidgetSize = "half" | "full";
export type WidgetType = "goal" | "meal" | "feature";

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  size: WidgetSize;
  height?: number;
}

const DEFAULT_LAYOUT: DashboardWidget[] = [
  { id: "calories", type: "goal", size: "half" },
  { id: "protein", type: "goal", size: "half" },
  { id: "carbs", type: "goal", size: "half" },
  { id: "fats", type: "goal", size: "half" },
  { id: "water", type: "goal", size: "full" },
  { id: "weight_chart", type: "feature", size: "full" }, // Added Weight Tracker
  { id: "breakfast", type: "meal", size: "full" },
  { id: "lunch", type: "meal", size: "full" },
  { id: "dinner", type: "meal", size: "full" },
  { id: "snack", type: "meal", size: "full" },
];

export const NUTRITION_METRICS: Record<
  string,
  {
    label: string;
    unit: string;
    color: string;
    key: string;
    targetKey: string;
    defaultTarget: number;
  }
> = {
  calories: {
    label: "Calories",
    unit: "kcal",
    color: "bg-emerald-500",
    key: "total_calories",
    targetKey: "target_calories",
    defaultTarget: 2500,
  },
  protein: {
    label: "Protein",
    unit: "g",
    color: "bg-blue-500",
    key: "total_protein_g",
    targetKey: "target_protein_g",
    defaultTarget: 180,
  },
  carbs: {
    label: "Carbs",
    unit: "g",
    color: "bg-amber-500",
    key: "total_carbs_g",
    targetKey: "target_carbs_g",
    defaultTarget: 300,
  },
  fats: {
    label: "Fats",
    unit: "g",
    color: "bg-rose-500",
    key: "total_fats_g",
    targetKey: "target_fats_g",
    defaultTarget: 70,
  },
  water: {
    label: "Hydration",
    unit: "L",
    color: "bg-cyan-500",
    key: "total_water_ml",
    targetKey: "target_water_ml",
    defaultTarget: 3000,
  },
  saturated_fats: {
    label: "Sat Fat",
    unit: "g",
    color: "bg-red-500",
    key: "total_saturated_fats_g",
    targetKey: "target_saturated_fats_g",
    defaultTarget: 20,
  },
  fiber: {
    label: "Fiber",
    unit: "g",
    color: "bg-emerald-500",
    key: "total_fiber_g",
    targetKey: "target_fiber_g",
    defaultTarget: 30,
  },
  sugar: {
    label: "Sugar",
    unit: "g",
    color: "bg-purple-500",
    key: "total_sugar_g",
    targetKey: "target_sugar_g",
    defaultTarget: 50,
  },
  potassium: {
    label: "Potassium",
    unit: "mg",
    color: "bg-blue-500",
    key: "total_potassium_mg",
    targetKey: "target_potassium_mg",
    defaultTarget: 4000,
  },
  sodium: {
    label: "Sodium",
    unit: "mg",
    color: "bg-orange-500",
    key: "total_sodium_mg",
    targetKey: "target_sodium_mg",
    defaultTarget: 2300,
  },
  iron: {
    label: "Iron",
    unit: "mg",
    color: "bg-rose-500",
    key: "total_iron_mg",
    targetKey: "target_iron_mg",
    defaultTarget: 8,
  },
  vitamin_d: {
    label: "Vitamin D",
    unit: "mcg",
    color: "bg-indigo-400",
    key: "total_vitamin_d_mcg",
    targetKey: "target_vitamin_d_mcg",
    defaultTarget: 25,
  },
  zinc: {
    label: "Zinc",
    unit: "mg",
    color: "bg-yellow-400",
    key: "total_zinc_mg",
    targetKey: "target_zinc_mg",
    defaultTarget: 11,
  },
  magnesium: {
    label: "Magnesium",
    unit: "mg",
    color: "bg-emerald-400",
    key: "total_magnesium_mg",
    targetKey: "target_magnesium_mg",
    defaultTarget: 400,
  },
  calcium: {
    label: "Calcium",
    unit: "mg",
    color: "bg-cyan-400",
    key: "total_calcium_mg",
    targetKey: "target_calcium_mg",
    defaultTarget: 1200,
  },
  cholesterol: {
    label: "Cholesterol",
    unit: "mg",
    color: "bg-neutral-400",
    key: "total_cholesterol_mg",
    targetKey: "target_cholesterol_mg",
    defaultTarget: 300,
  },
};

// Dictionary for special features
export const FEATURE_METRICS: Record<string, { label: string; color: string }> =
  {
    weight_chart: { label: "Weight & Physique", color: "bg-indigo-500" },
  };

export function useDashboardLayout() {
  const [layout, setLayout] = useState<DashboardWidget[]>(DEFAULT_LAYOUT);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("fitness_dashboard_layout");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setLayout(parsed);
        } else if (parsed.goals && parsed.meals) {
          setLayout([
            ...parsed.goals.map((g: any) => ({ ...g, type: "goal" })),
            ...parsed.meals.map((m: any) => ({
              id: m,
              type: "meal",
              size: "full",
            })),
          ]);
        }
      } catch (e) {
        console.error("Failed to parse layout", e);
      }
    }
    setIsLoaded(true);
  }, []);

  const updateLayout = (newLayout: DashboardWidget[]) => {
    setLayout(newLayout);
    localStorage.setItem("fitness_dashboard_layout", JSON.stringify(newLayout));
  };

  return { layout, updateLayout, isLoaded };
}
