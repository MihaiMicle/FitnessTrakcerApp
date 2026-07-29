export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export type ServingUnit = "g" | "oz" | "lb" | "ml" | "fl_oz";

export interface MealEntry {
  id: string;
  daily_log_id: number;
  meal_type: MealType;
  food_name: string;
  name?: string; // Fallback for Pydantic base field
  foodName?: string; // Fallback for Pydantic camelCase computed field
  quantity_g?: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  created_at?: string;
}

export interface DailySummary {
  id: number;
  user_id: string;
  log_date: string;
  meals: MealEntry[];
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fats_g: number;
  target_calories?: number;
  target_protein_g?: number;
  target_carbs_g?: number;
  target_fats_g?: number;
}

export interface LogMealPayload {
  meal_type: string;
  food_name: string;
  serving_size: number;
  serving_unit: ServingUnit;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  date?: string;

}
