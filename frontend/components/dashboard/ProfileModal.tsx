"use client";

import { useEffect, useState } from "react";
import {
  getProfile,
  updateProfile,
  recalculateGoals,
  UserProfileData,
} from "@/lib/api";
import { supabase } from "@/lib/supabase";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateSuccess?: () => void;
}

export default function ProfileModal({
  isOpen,
  onClose,
  onUpdateSuccess,
}: ProfileModalProps) {
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      getProfile().then((data) => {
        setProfile(data);
        setLoading(false);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (
    field: keyof UserProfileData,
    value: string | number,
  ) => {
    if (!profile) return;
    setProfile({ ...profile, [field]: value } as any);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      setSaving(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        console.error("No active authentication token found!");
        return;
      }

      const sanitizedProfile = {
        ...profile,
        weight_kg: Number(profile.weight_kg) || 0,
        height_cm: Number(profile.height_cm) || 0,
        age: Number(profile.age) || 0,
        target_calories: Number(profile.target_calories) || 0,
        target_protein_g: Number(profile.target_protein_g) || 0,
        target_carbs_g: Number(profile.target_carbs_g) || 0,
        target_fats_g: Number(profile.target_fats_g) || 0,
        activity_level: Number(profile.activity_level) || 1.2,
      };

      await updateProfile(token, sanitizedProfile);

      if (onUpdateSuccess) onUpdateSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to update profile:", error);
      alert("Failed to save profile. Please check your inputs and try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleRecalculate = async () => {
  if (!profile) return;

  try {
    setSaving(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (!token) {
      console.error("No active authentication token found!");
      return;
    }

    const sanitizedProfile = {
      ...profile,
      weight_kg: Number(profile.weight_kg) || 0,
      height_cm: Number(profile.height_cm) || 0,
      age: Number(profile.age) || 0,
      target_calories: Number(profile.target_calories) || 0,
      target_protein_g: Number(profile.target_protein_g) || 0,
      target_carbs_g: Number(profile.target_carbs_g) || 0,
      target_fats_g: Number(profile.target_fats_g) || 0,
      activity_level: Number(profile.activity_level) || 1.2,
    };

    await updateProfile(token, sanitizedProfile);

    const updated = await recalculateGoals(token);

    setProfile(updated);
    if (onUpdateSuccess) onUpdateSuccess();
  } catch (error) {
    console.error("Failed to auto-calculate and save:", error);
    alert("Failed to recalculate. Please check your inputs.");
  } finally {
    setSaving(false);
  }
};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg max-w-2xl w-full p-6 text-white font-sans relative my-8 shadow-2xl">
        {/* Header & Close Button */}
        <div className="flex justify-between items-center border-b border-neutral-800 pb-4 mb-6">
          <h2 className="text-lg font-bold font-mono tracking-wider">GOALS</h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white font-mono text-sm px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 transition"
          >
            ✕ ESC
          </button>
        </div>

        {loading || !profile ? (
          <div className="py-12 text-center text-neutral-400 font-mono text-sm">
            Loading metrics...
          </div>
        ) : (
          <form
            onSubmit={handleSave}
            className="space-y-6 max-h-[70vh] overflow-y-auto pr-2"
          >
            {/* Physical Measures Section */}
            <div className="space-y-3">
              <h3 className="text-xs font-mono text-neutral-400 uppercase tracking-wider">
                Physical Measures
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-mono text-neutral-400 mb-1">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={profile.weight_kg ?? ""}
                    onChange={(e) =>
                      handleChange(
                        "weight_kg",
                        e.target.value === "" ? "" : parseFloat(e.target.value)
                      )
                    }
                    className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 font-mono text-sm focus:outline-none focus:border-neutral-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-neutral-400 mb-1">
                    Height (cm)
                  </label>
                  <input
                    type="number"
                    value={profile.height_cm ?? ""}
                    onChange={(e) =>
                      handleChange(
                        "height_cm",
                        e.target.value === "" ? "" : parseFloat(e.target.value)
                      )
                    }
                    className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 font-mono text-sm focus:outline-none focus:border-neutral-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-neutral-400 mb-1">
                    Age
                  </label>
                  <input
                    type="number"
                    value={profile.age ?? ""}
                    onChange={(e) =>
                      handleChange(
                        "age",
                        e.target.value === "" ? "" : parseInt(e.target.value, 10)
                      )
                    }
                    className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 font-mono text-sm focus:outline-none focus:border-neutral-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-neutral-400 mb-1">
                    Gender
                  </label>
                  <select
                    value={profile.gender}
                    onChange={(e) => handleChange("gender", e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 font-mono text-sm focus:outline-none focus:border-neutral-600"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-mono text-neutral-400 mb-1">
                    Activity Level
                  </label>
                  <select
                    value={profile.activity_level}
                    onChange={(e) =>
                      handleChange("activity_level", parseFloat(e.target.value))
                    }
                    className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 font-mono text-sm focus:outline-none focus:border-neutral-600"
                  >
                    <option value={1.2}>Sedentary (Little workout)</option>
                    <option value={1.375}>
                      Lightly Active (1-3 days/week)
                    </option>
                    <option value={1.55}>
                      Moderately Active (3-5 days/week)
                    </option>
                    <option value={1.725}>
                      Very Active (6-7 days hard training)
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono text-neutral-400 mb-1">
                    Current Goal
                  </label>
                  <select
                    value={profile.goal_type}
                    onChange={(e) => handleChange("goal_type", e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 font-mono text-sm focus:outline-none focus:border-neutral-600"
                  >
                    <option value="cut">Cut (-300 kcal deficit)</option>
                    <option value="maintain">Maintain (TDEE)</option>
                    <option value="bulk">Bulk (+300 kcal surplus)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Macro Targets Section */}
            <div className="space-y-3 pt-2 border-t border-neutral-800">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-mono text-neutral-400 uppercase tracking-wider">
                  Daily Targets
                </h3>
                <button
                  type="button"
                  onClick={handleRecalculate}
                  disabled={saving}
                  className="text-xs font-mono bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-3 py-1 rounded transition border border-neutral-700 disabled:opacity-50"
                >
                  Auto-Calculate
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-mono text-neutral-300 mb-1">
                    Calories
                  </label>
                  <input
                    type="number"
                    value={profile.target_calories ?? ""}
                    onChange={(e) =>
                      handleChange(
                        "target_calories",
                        e.target.value === "" ? "" : parseInt(e.target.value, 10)
                      )
                    }
                    className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 font-mono text-sm font-bold text-white focus:outline-none focus:border-neutral-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono mb-1">
                    Protein (g)
                  </label>
                  <input
                    type="number"
                    value={profile.target_protein_g ?? ""}
                    onChange={(e) =>
                      handleChange(
                        "target_protein_g",
                        e.target.value === "" ? "" : parseInt(e.target.value, 10)
                      )
                    }
                    className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 font-mono text-sm font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono mb-1">
                    Carbs (g)
                  </label>
                  <input
                    type="number"
                    value={profile.target_carbs_g ?? ""}
                    onChange={(e) =>
                      handleChange(
                        "target_carbs_g",
                        e.target.value === "" ? "" : parseInt(e.target.value, 10)
                      )
                    }
                    className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 font-mono text-sm font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono mb-1">
                    Fats (g)
                  </label>
                  <input
                    type="number"
                    value={profile.target_fats_g ?? ""}
                    onChange={(e) =>
                      handleChange(
                        "target_fats_g",
                        e.target.value === "" ? "" : parseInt(e.target.value, 10)
                      )
                    }
                    className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 font-mono text-sm font-bold focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>
              <details className="mt-2.5 text-xs text-neutral-400 group">
                <summary className="cursor-pointer leading-relaxed hover:text-neutral-300 transition-colors list-none [&::-webkit-details-marker]:hidden flex items-start justify-between gap-2 select-none">
                  <span>
                    Macronutrient Calorie Conversions: 1g of protein = 4 kcal,
                    1g of carbs = 4 kcal, 1g of fat = 9 kcal. Adjust your macro
                    targets accordingly to ensure they align with your total
                    calorie goal.
                  </span>

                  {/* Animated chevron arrow that rotates when clicked */}
                  <svg
                    className="w-4 h-4 text-neutral-500 group-open:rotate-180 transition-transform duration-200 shrink-0 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </summary>

                {/* The expandable details section */}
                <div className="mt-2 pt-2 border-t border-neutral-800/80 text-neutral-300 leading-relaxed max-h-64 overflow-y-auto pr-2 space-y-4 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent">
                  {/* 1. Sedentary Adults */}
                  <div>
                    <h4 className="font-semibold text-neutral-100 flex items-center gap-1.5">
                      <span></span> Sedentary Adults (Low Activity / Desk Job)
                    </h4>
                    <p className="text-neutral-400 italic mb-1">
                      Focus: Meeting baseline physiological needs without
                      gaining unwanted fat.
                    </p>
                    <ul className="list-disc list-inside space-y-0.5 pl-1 text-neutral-300">
                      <li>
                        <span className="text-white font-medium">Protein:</span>{" "}
                        0.8 to 1.2 g/kg of body weight (20% of daily calories).
                        Supports cellular repair and prevents muscle loss.
                      </li>
                      <li>
                        <span className="text-white font-medium">Fats:</span>{" "}
                        0.4 to 0.7 g/kg of body weight (20% to 25% of daily
                        calories). Essential for standard hormone balance and
                        absorbing vitamins.
                      </li>
                      <li>
                        <span className="text-white font-medium">
                          Carbohydrates:
                        </span>{" "}
                        40% of daily calories (remaining balance). Scaled down
                        to prevent excess energy from storing as fat.
                      </li>
                    </ul>
                  </div>

                  {/* 2. Fitness Enthusiasts */}
                  <div>
                    <h4 className="font-semibold text-neutral-100 flex items-center gap-1.5">
                      <span></span> Fitness Enthusiasts (Moderate Exercise, 3–5
                      days/week)
                    </h4>
                    <p className="text-neutral-400 italic mb-1">
                      Focus: General fitness improvement, moderate weight
                      lifting, or light running.
                    </p>
                    <ul className="list-disc list-inside space-y-0.5 pl-1 text-neutral-300">
                      <li>
                        <span className="text-white font-medium">Protein:</span>{" "}
                        1.2 to 1.6 g/kg of body weight (20% to 25% of daily
                        calories). Helps repair muscle tissues broken down
                        during workouts.
                      </li>
                      <li>
                        <span className="text-white font-medium">Fats:</span>{" "}
                        0.7 to 1.0 g/kg of body weight (25% to 30% of daily
                        calories). Provides sustained baseline energy.
                      </li>
                      <li>
                        <span className="text-white font-medium">
                          Carbohydrates:
                        </span>{" "}
                        45% to 50% of daily calories (remaining balance).
                        Recharges muscle glycogen stores used during your
                        sessions.
                      </li>
                    </ul>
                  </div>

                  {/* 3. Strength Athletes & Bodybuilders */}
                  <div>
                    <h4 className="font-semibold text-neutral-100 flex items-center gap-1.5">
                      <span></span> Strength Athletes & Bodybuilders (High
                      Intensity / Muscle Gain)
                    </h4>
                    <p className="text-neutral-400 italic mb-1">
                      Focus: Maximizing muscle hypertrophy, power, and
                      high-intensity resistance recovery.
                    </p>
                    <ul className="list-disc list-inside space-y-0.5 pl-1 text-neutral-300">
                      <li>
                        <span className="text-white font-medium">Protein:</span>{" "}
                        1.6 to 2.5 g/kg of body weight (25% to 30% of daily
                        calories). Optimizes muscle protein synthesis and
                        recovery.
                      </li>
                      <li>
                        <span className="text-white font-medium">Fats:</span>{" "}
                        0.8 to 1.2 g/kg of body weight (20% to 30% of daily
                        calories). Regulates crucial muscle-building hormones
                        like testosterone.
                      </li>
                      <li>
                        <span className="text-white font-medium">
                          Carbohydrates:
                        </span>{" "}
                        40% to 50% of daily calories (remaining balance). Fuels
                        explosive power output during heavy lifts.
                      </li>
                    </ul>
                  </div>

                  {/* 4. Endurance Athletes */}
                  <div>
                    <h4 className="font-semibold text-neutral-100 flex items-center gap-1.5">
                      <span></span> Endurance Athletes (Runners, Cyclists,
                      Triathletes)
                    </h4>
                    <p className="text-neutral-400 italic mb-1">
                      Focus: Sustaining long-duration cardiovascular output and
                      preventing performance crashes.
                    </p>
                    <ul className="list-disc list-inside space-y-0.5 pl-1 text-neutral-300">
                      <li>
                        <span className="text-white font-medium">Protein:</span>{" "}
                        1.2 to 1.4 g/kg of body weight (20% of daily calories).
                        Prevents muscle wasting during extreme mileage.
                      </li>
                      <li>
                        <span className="text-white font-medium">Fats:</span>{" "}
                        1.0 to 1.4 g/kg of body weight (30% to 35% of daily
                        calories). Helps the body tap into efficient,
                        long-lasting fuel reserves.
                      </li>
                      <li>
                        <span className="text-white font-medium">
                          Carbohydrates:
                        </span>{" "}
                        55% to 60% of daily calories (remaining balance).
                        Maximum allowable percentage to ensure glycogen stores
                        never hit zero.
                      </li>
                    </ul>
                  </div>

                  {/* 5. Fat Loss Phase */}
                  <div>
                    <h4 className="font-semibold text-neutral-100 flex items-center gap-1.5">
                      <span></span> 5. Individuals in a Fat Loss Phase (Calorie
                      Deficit)
                    </h4>
                    <p className="text-neutral-400 italic mb-1">
                      Focus: Preserving lean muscle tissue while maximizing fat
                      burning.
                    </p>
                    <ul className="list-disc list-inside space-y-0.5 pl-1 text-neutral-300">
                      <li>
                        <span className="text-white font-medium">Protein:</span>{" "}
                        2.0 to 2.5 g/kg of body weight (30% of daily calories).
                        Highly satiating to keep hunger low and prevent muscle
                        loss.
                      </li>
                      <li>
                        <span className="text-white font-medium">Fats:</span>{" "}
                        0.4 to 0.6 g/kg of body weight (20% of daily calories).
                        Kept at the lower end of the spectrum to minimize total
                        daily calorie intake.
                      </li>
                      <li>
                        <span className="text-white font-medium">
                          Carbohydrates:
                        </span>{" "}
                        40% to 50% of daily calories (remaining balance). Kept
                        structured enough to support training intensity so your
                        workout quality does not suffer.
                      </li>
                    </ul>
                  </div>
                </div>
              </details>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-neutral-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded font-mono text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded font-mono text-xs bg-white hover:bg-neutral-200 text-black font-bold transition disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}