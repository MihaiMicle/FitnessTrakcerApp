"use client";

import { useState } from "react";
import { DailySummary } from "@/types/nutrition";
import { supabase } from "@/lib/supabase";

interface WaterTrackerProps {
  summary: DailySummary | null;
  onWaterUpdated: (updatedSummary: DailySummary) => void;
}

export default function WaterTracker({ summary, onWaterUpdated }: WaterTrackerProps) {
  const [isAdding, setIsAdding] = useState(false);

  const targetWater = summary?.target_water_ml || 3000;
  const currentWater = summary?.total_water_ml || 0;
  const progress = Math.min((currentWater / targetWater) * 100, 100);

  const handleAddWater = async (amount_ml: number) => {
    if (!summary?.log_date) return;
    setIsAdding(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/water`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          date: summary.log_date,
          amount_ml: amount_ml,
        }),
      });

      if (res.ok) {
        const updatedLog = await res.json();
        onWaterUpdated(updatedLog); 
      }
    } catch (error) {
      console.error("Failed to log water:", error);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-sm mt-4">
      <div className="flex justify-between items-end mb-4">
        <div>
          <h3 className="text-sm font-semibold text-neutral-200">Hydration Log</h3>
          <p className="text-xs text-neutral-500 font-mono mt-1">Daily Target: {(targetWater / 1000).toFixed(1)}L</p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold font-mono text-cyan-400">
            {currentWater}
          </span>
          <span className="text-sm text-neutral-500 font-mono ml-1">ml</span>
        </div>
      </div>

      <div className="w-full bg-neutral-950 border border-neutral-800 h-4 rounded-full overflow-hidden mb-5">
        <div
          className="bg-cyan-500 h-full transition-all duration-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => handleAddWater(250)}
          disabled={isAdding}
          className="flex-1 bg-cyan-950/30 hover:bg-cyan-900/50 text-cyan-400 border border-cyan-900/50 py-2 rounded-lg text-xs font-mono font-bold transition disabled:opacity-50 cursor-pointer"
        >
          + 250 ml
        </button>
        <button
          onClick={() => handleAddWater(500)}
          disabled={isAdding}
          className="flex-1 bg-cyan-950/30 hover:bg-cyan-900/50 text-cyan-400 border border-cyan-900/50 py-2 rounded-lg text-xs font-mono font-bold transition disabled:opacity-50 cursor-pointer"
        >
          + 500 ml
        </button>
      </div>
    </div>
  );
}