export interface Meal {
  id: string;
  daily_log_id: number;
  name: string;
  food_name?: string; // Handles your Pydantic computed field
  meal_type: "Breakfast" | "Lunch" | "Dinner" | "Snack";
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
}

export interface DailyLog {
  id: number;
  user_id: string;
  date: string;
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fats_g: number;
  meals: Meal[];
}