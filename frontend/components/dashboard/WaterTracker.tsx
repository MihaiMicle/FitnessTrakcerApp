"use client";

import { useState } from "react";
import { DailySummary } from "@/types/nutrition";
import { supabase } from "@/lib/supabase";

interface WaterTrackerProps {
  summary: DailySummary | null;
  onWaterUpdated: (updatedSummary: DailySummary) => void;
}

export default function WaterTracker({
  summary,
  onWaterUpdated,
}: WaterTrackerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customAmount, setCustomAmount] = useState<string>("");

  const targetWater = (summary as any)?.target_water_ml || 3000;
  const currentWater = (summary as any)?.total_water_ml || 0;
  const progress = Math.min((currentWater / targetWater) * 100, 100);

  const currentLiters = parseFloat((currentWater / 1000).toFixed(2));
  const targetLiters = parseFloat((targetWater / 1000).toFixed(2));

  const handleAddWater = async (amount_ml: number) => {
    const targetDate = (summary as any)?.date || (summary as any)?.log_date;
    if (!targetDate || amount_ml === 0) return;

    const finalWater = Math.max(0, currentWater + amount_ml);
    const actualDelta = finalWater - currentWater;
    if (actualDelta === 0) return;

    setIsAdding(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/water`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          date: targetDate,
          amount_ml: actualDelta,
        }),
      });

      if (res.ok) {
        const updatedLog = await res.json();
        onWaterUpdated(updatedLog);
        if (showCustom) {
          setShowCustom(false);
          setCustomAmount("");
        }
      }
    } catch (error) {
      console.error("Failed to log water:", error);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    // Changed: Removed mt-4, added h-full and flex flex-col justify-center
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-6 shadow-sm h-full flex flex-col justify-center">
      <div className="space-y-3 mb-5">
        <div className="flex justify-between text-xs sm:text-sm">
          <span className="text-neutral-400">Hydration</span>
          <span className="font-mono font-bold">
            {currentLiters} / {targetLiters} L
          </span>
        </div>

        <div className="w-full bg-neutral-800 h-2.5 sm:h-3 rounded-full overflow-hidden">
          <div
            className="bg-cyan-500 h-full transition-all duration-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Changed: Added flex-wrap so it wraps smoothly on half-size widgets */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => handleAddWater(-250)}
          disabled={isAdding || currentWater === 0}
          className="flex-1 bg-neutral-950/50 hover:bg-neutral-800 text-neutral-400 border border-neutral-800 py-2 rounded-lg text-xs font-mono font-bold transition disabled:opacity-50 cursor-pointer min-w-[70px]"
        >
          - 250 ml
        </button>
        <button
          onClick={() => handleAddWater(250)}
          disabled={isAdding}
          className="flex-1 bg-cyan-950/30 hover:bg-cyan-900/50 text-cyan-400 border border-cyan-900/50 py-2 rounded-lg text-xs font-mono font-bold transition disabled:opacity-50 cursor-pointer min-w-[70px]"
        >
          + 250 ml
        </button>
        <button
          onClick={() => handleAddWater(500)}
          disabled={isAdding}
          className="flex-1 bg-cyan-950/30 hover:bg-cyan-900/50 text-cyan-400 border border-cyan-900/50 py-2 rounded-lg text-xs font-mono font-bold transition disabled:opacity-50 cursor-pointer min-w-[70px]"
        >
          + 500 ml
        </button>
        <button
          onClick={() => setShowCustom(!showCustom)}
          disabled={isAdding}
          className={`flex-1 py-2 rounded-lg text-xs font-mono font-bold transition disabled:opacity-50 cursor-pointer min-w-[70px] ${
            showCustom
              ? "bg-cyan-900/60 text-cyan-300 border border-cyan-700"
              : "bg-cyan-950/30 hover:bg-cyan-900/50 text-cyan-400 border border-cyan-900/50"
          }`}
        >
          Custom
        </button>
      </div>

      {showCustom && (
        <div className="flex gap-2 mt-3 animate-in fade-in slide-in-from-top-2">
          <input
            type="number"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            placeholder="Amount in ml..."
            className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-sm font-mono text-cyan-400 focus:outline-none focus:border-cyan-600 min-w-0"
          />
          <button
            onClick={() => handleAddWater(-Number(customAmount))}
            disabled={
              isAdding ||
              !customAmount ||
              Number(customAmount) <= 0 ||
              currentWater === 0
            }
            className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold px-3 rounded-lg text-xs font-mono transition disabled:opacity-50 cursor-pointer shrink-0"
          >
            Remove
          </button>
          <button
            onClick={() => handleAddWater(Number(customAmount))}
            disabled={isAdding || !customAmount || Number(customAmount) <= 0}
            className="bg-cyan-600 hover:bg-cyan-500 text-neutral-950 font-bold px-4 rounded-lg text-xs font-mono transition disabled:opacity-50 cursor-pointer shrink-0"
          >
            {isAdding ? "..." : "Add"}
          </button>
        </div>
      )}
    </div>
  );
}
