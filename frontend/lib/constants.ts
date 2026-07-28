// lib/constants.ts
import { MealType, ServingUnit } from "@/types/nutrition";

// Updated to match the lowercase union types in types/nutrition.ts
export const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

// Helper to display clean, formatted names in your UI dropdowns and dashboard headers
export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

// Supported serving units for forms
export const SERVING_UNITS: ServingUnit[] = ["g", "oz", "lb", "ml", "fl_oz"];

// Default daily targets
export const DEFAULT_MACRO_TARGETS = {
  calories: 2500,
  protein: 180,
  carbs: 300,
  fats: 70,
};
