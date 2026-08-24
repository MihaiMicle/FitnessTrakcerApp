"use client";

import { useState, FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

interface LogWorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  onSuccess: () => void;
}

export default function LogWorkoutModal({
  isOpen,
  onClose,
  selectedDate,
  onSuccess,
}: LogWorkoutModalProps) {
  const [isCardio, setIsCardio] = useState(false);
  const [exerciseName, setExerciseName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Strength State - Swapped rpe for rir
  const [sets, setSets] = useState([
    { set: 1, weight_kg: "", reps: "", rir: "" },
  ]);

  // Cardio State
  const [cardio, setCardio] = useState({
    duration_minutes: 30,
    incline: 13.5,
    speed: 4.1,
  });

  const handleAddSet = () => {
    setSets([
      ...sets,
      { set: sets.length + 1, weight_kg: "", reps: "", rir: "" },
    ]);
  };

  const handleRemoveSet = (index: number) => {
    if (sets.length === 1) return;
    const newSets = sets.filter((_, i) => i !== index);
    setSets(newSets.map((s, i) => ({ ...s, set: i + 1 })));
  };

  const handleSetChange = (index: number, field: string, value: string) => {
    const newSets = [...sets];
    newSets[index] = { ...newSets[index], [field]: value };
    setSets(newSets);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!exerciseName.trim()) {
      toast.error("Please enter an exercise name.");
      return;
    }

    setIsSubmitting(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const cleanSets = isCardio
        ? []
        : sets.map((s) => ({
            set: s.set,
            weight_kg: Number(s.weight_kg) || 0,
            reps: Number(s.reps) || 0,
            // Safely parse RIR so "0" doesn't get dropped
            rir: s.rir !== "" ? Number(s.rir) : null,
          }));

      const payload = {
        date: selectedDate,
        exercise_name: exerciseName,
        is_cardio: isCardio,
        working_sets: cleanSets,
        duration_minutes: isCardio
          ? Number(cardio.duration_minutes) || null
          : null,
        incline: isCardio ? Number(cardio.incline) || null : null,
        speed: isCardio ? Number(cardio.speed) || null : null,
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/workouts/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save workout");

      toast.success("Exercise logged!");
      setExerciseName("");
      setSets([{ set: 1, weight_kg: "", reps: "", rir: "" }]);
      onSuccess();
      onClose();
    } catch (err) {
      toast.error("Error saving exercise.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const inputClass =
    "w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-sm text-white focus:border-indigo-500 outline-none transition-colors font-mono";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto">
      <div className="bg-neutral-900 border-t sm:border border-neutral-800 rounded-t-2xl sm:rounded-xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl max-h-[90dvh] flex flex-col animate-in slide-in-from-bottom-4 sm:zoom-in-95">
        <div className="flex justify-between items-center border-b border-neutral-800 pb-3 shrink-0">
          <h3 className="text-lg font-bold text-white tracking-wider font-mono">
            LOG TRAINING
          </h3>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white font-mono text-xl sm:text-sm px-2"
          >
            ✕
          </button>
        </div>

        <div className="flex bg-neutral-950 p-1 rounded-lg border border-neutral-800 font-mono text-xs shrink-0">
          <button
            type="button"
            onClick={() => setIsCardio(false)}
            className={`flex-1 py-2 rounded-md transition-colors ${
              !isCardio
                ? "bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            Strength
          </button>
          <button
            type="button"
            onClick={() => setIsCardio(true)}
            className={`flex-1 py-2 rounded-md transition-colors ${
              isCardio
                ? "bg-rose-600 hover:bg-rose-500 text-white font-bold"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            Cardio
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-5"
        >
          <div>
            <label className="text-xs text-neutral-400 block mb-1 font-mono uppercase tracking-wider">
              Movement
            </label>
            <input
              type="text"
              required
              autoFocus
              value={exerciseName}
              onChange={(e) => setExerciseName(e.target.value)}
              placeholder={
                isCardio ? "e.g., Treadmill" : "e.g., Barbell Bench Press"
              }
              className={inputClass}
            />
          </div>

          {!isCardio ? (
            <div className="space-y-3">
              <div className="flex text-[10px] text-neutral-500 font-mono uppercase tracking-wider px-1">
                <span className="w-8 text-center">Set</span>
                <span className="flex-1 text-center">Weight (kg)</span>
                <span className="flex-1 text-center">Reps</span>
                <span className="flex-1 text-center">RIR</span>
                <span className="w-6"></span>
              </div>

              {sets.map((s, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <div className="w-8 text-center text-xs font-bold text-neutral-500 font-mono">
                    {s.set}
                  </div>
                  <input
                    type="number"
                    step="any"
                    required
                    value={s.weight_kg}
                    onChange={(e) =>
                      handleSetChange(idx, "weight_kg", e.target.value)
                    }
                    className={`${inputClass} text-center flex-1`}
                  />
                  <input
                    type="number"
                    required
                    value={s.reps}
                    onChange={(e) =>
                      handleSetChange(idx, "reps", e.target.value)
                    }
                    className={`${inputClass} text-center flex-1`}
                  />
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder="opt"
                    value={s.rir}
                    onChange={(e) =>
                      handleSetChange(idx, "rir", e.target.value)
                    }
                    className={`${inputClass} text-center flex-1 text-indigo-300 placeholder:text-neutral-700`}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveSet(idx)}
                    disabled={sets.length === 1}
                    className="w-6 text-rose-500/50 hover:text-rose-500 font-bold transition-colors disabled:opacity-0"
                  >
                    ✕
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddSet}
                className="w-full py-2 border-2 border-dashed border-neutral-800 hover:border-indigo-500/50 hover:bg-indigo-500/5 rounded-lg text-indigo-400 font-mono text-xs transition-colors mt-2"
              >
                + Add Set
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-neutral-400 block mb-1 font-mono text-center">
                  Mins
                </label>
                <input
                  type="number"
                  required
                  value={cardio.duration_minutes}
                  onChange={(e) =>
                    setCardio({
                      ...cardio,
                      duration_minutes: Number(e.target.value),
                    })
                  }
                  className={`${inputClass} text-center text-rose-300`}
                />
              </div>
              <div>
                <label className="text-xs text-neutral-400 block mb-1 font-mono text-center">
                  Incline
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={cardio.incline}
                  onChange={(e) =>
                    setCardio({ ...cardio, incline: Number(e.target.value) })
                  }
                  className={`${inputClass} text-center text-rose-300`}
                />
              </div>
              <div>
                <label className="text-xs text-neutral-400 block mb-1 font-mono text-center">
                  Speed
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={cardio.speed}
                  onChange={(e) =>
                    setCardio({ ...cardio, speed: Number(e.target.value) })
                  }
                  className={`${inputClass} text-center text-rose-300`}
                />
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-neutral-800 mt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-mono text-neutral-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-6 py-2.5 rounded-lg text-xs font-mono font-bold transition-colors disabled:opacity-50 ${
                isCardio
                  ? "bg-rose-600 hover:bg-rose-500 text-white"
                  : "bg-indigo-600 hover:bg-indigo-500 text-white"
              }`}
            >
              {isSubmitting ? "Saving..." : "Log Training"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
