"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

interface GoalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateSuccess: () => void;
}

export default function GoalsModal({
  isOpen,
  onClose,
  onUpdateSuccess,
}: GoalsModalProps) {
  const [loading, setLoading] = useState(false);
  const [goalType, setGoalType] = useState("maintain");
  const [profileData, setProfileData] = useState<any>(null);

  const [targets, setTargets] = useState({
    target_calories: 2300,
    target_protein_g: 150,
    target_carbs_g: 250,
    target_fats_g: 60,
    target_water_ml: 3000,
  });

  // Fetch current goals when the modal opens
  useEffect(() => {
    if (isOpen) {
      fetchGoals();
    }
  }, [isOpen]);

  const fetchGoals = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profile/me`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setProfileData(data);
        if (data.goal_type) setGoalType(data.goal_type);

        setTargets({
          target_calories: data.target_calories || 2300,
          target_protein_g: data.target_protein_g || 150,
          target_carbs_g: data.target_carbs_g || 250,
          target_fats_g: data.target_fats_g || 60,
          target_water_ml: data.target_water_ml || 3000,
        });
      }
    } catch (error) {
      console.error("Error fetching goals:", error);
    }
  };

  const handleAutoCalculate = () => {
    if (!profileData?.weight_kg) {
      toast.error("Please set your weight in your Profile first!");
      return;
    }

    toast.loading("Calculating optimal macros...", { id: "calc" });

    // Calculate BMR using Mifflin-St Jeor
    const w = profileData.weight_kg;
    const h = profileData.height_cm || 170; // Fallback if missing
    const a = profileData.age || 25; // Fallback if missing
    const isMale = profileData.gender !== "female";
    const activity = profileData.activity_level || 1.375; // Fallback to lightly active

    const bmr = 10 * w + 6.25 * h - 5 * a + (isMale ? 5 : -161);

    // Calculate TDEE (Maintenance)
    const tdee = bmr * activity;

    // Adjust for Goal
    let cals = tdee;
    if (goalType === "cut") cals -= 500; // 500 cal deficit
    if (goalType === "bulk") cals += 300; // 300 cal surplus

    cals = Math.round(cals);

    // Bodybuilder Macro Split (2.2g Protein/kg, ~0.8g Fat/kg)
    const p = Math.round(w * 2.2);
    const f = Math.round(w * 0.8);

    // Remaining calories go to Carbs
    const c = Math.round((cals - p * 4 - f * 9) / 4);

    setTargets({
      target_calories: cals,
      target_protein_g: p,
      target_fats_g: f,
      target_carbs_g: c,
      target_water_ml: targets.target_water_ml,
    });

    toast.success("Macros auto-calculated!", { id: "calc" });
  };

  const handleSave = async () => {
    setLoading(true);
    toast.loading("Saving goals...", { id: "saveGoals" });

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profile/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ ...targets, goal_type: goalType }),
      });

      if (!res.ok) throw new Error("Failed to save goals");

      toast.success("Goals updated!", { id: "saveGoals" });
      onUpdateSuccess();
      onClose();
    } catch (error) {
      toast.error("Failed to update goals", { id: "saveGoals" });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const inputClass =
    "w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 font-mono text-sm focus:outline-none focus:border-emerald-500 text-white transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-sm w-full p-6 text-white shadow-2xl animate-in fade-in zoom-in-95">
        <div className="flex justify-between items-center border-b border-neutral-800 pb-4 mb-4">
          <h2 className="text-lg font-bold font-mono tracking-wider">
            NUTRITION GOALS
          </h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white font-mono text-sm px-2"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 py-2">
          <div className="space-y-3 pb-2 border-b border-neutral-800">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-xs font-mono text-emerald-400 mb-1">
                  Current Goal
                </label>
                <select
                  value={goalType}
                  onChange={(e) => setGoalType(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 font-mono text-sm focus:outline-none focus:border-emerald-500 text-white transition-colors"
                >
                  <option value="maintain">Maintenance</option>
                  <option value="cut">Fat Loss (Cut)</option>
                  <option value="bulk">Build Muscle (Bulk)</option>
                </select>
              </div>
              <button
                onClick={handleAutoCalculate}
                className="bg-neutral-800 hover:bg-neutral-700 text-emerald-400 border border-neutral-700 hover:border-emerald-500 font-mono text-xs font-bold px-3 py-2.5 rounded-lg transition-colors"
              >
                Auto-Calc
              </button>
            </div>

            {/* Conditional Warning: Muscle Gain + Sedentary */}
            {profileData?.activity_level === 1.2 && goalType === "bulk" && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/50 rounded-lg flex items-start gap-2 text-amber-400 text-xs font-mono animate-in fade-in">
                <svg
                  className="w-4 h-4 shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p>
                  <strong>Tip:</strong> Your current goal is{" "}
                  <strong>Muscle Gain</strong>. A sedentary activity level may
                  lead to excess fat gain instead of muscle.{" "}
                  <strong>
                    Consider increasing your daily activity or step count
                  </strong>{" "}
                  to ensure those extra calories are put to good use!
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-mono text-neutral-400 mb-1">
              Daily Calories (kcal)
            </label>
            <input
              type="number"
              value={targets.target_calories}
              onChange={(e) =>
                setTargets({
                  ...targets,
                  target_calories: Number(e.target.value),
                })
              }
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-mono text-blue-400 mb-1">
                Protein (g)
              </label>
              <input
                type="number"
                value={targets.target_protein_g}
                onChange={(e) =>
                  setTargets({
                    ...targets,
                    target_protein_g: Number(e.target.value),
                  })
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-amber-400 mb-1">
                Carbs (g)
              </label>
              <input
                type="number"
                value={targets.target_carbs_g}
                onChange={(e) =>
                  setTargets({
                    ...targets,
                    target_carbs_g: Number(e.target.value),
                  })
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-rose-400 mb-1">
                Fats (g)
              </label>
              <input
                type="number"
                value={targets.target_fats_g}
                onChange={(e) =>
                  setTargets({
                    ...targets,
                    target_fats_g: Number(e.target.value),
                  })
                }
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-mono text-cyan-400 mb-1">
              Daily Water (ml)
            </label>
            <input
              type="number"
              value={targets.target_water_ml}
              onChange={(e) =>
                setTargets({
                  ...targets,
                  target_water_ml: Number(e.target.value),
                })
              }
              className={inputClass}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-neutral-800 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded font-mono text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 rounded font-mono text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save Goals"}
          </button>
        </div>
      </div>
    </div>
  );
}
