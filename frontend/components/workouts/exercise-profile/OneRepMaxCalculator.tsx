'use client';

import { Calculator } from 'lucide-react';
import type { StrengthLevel } from '@/lib/workouts/standards';

interface StandardBadge {
  level: StrengthLevel;
  ratio: number;
  nextTarget: number | null;
}

interface OneRepMaxCalculatorProps {
  weight: number | '';
  reps: number | '';
  onWeightChange: (value: number | '') => void;
  onRepsChange: (value: number | '') => void;
  oneRepMax: number | null;
  standard: StandardBadge | null;
}

export default function OneRepMaxCalculator({
  weight,
  reps,
  onWeightChange,
  onRepsChange,
  oneRepMax,
  standard,
}: OneRepMaxCalculatorProps) {
  return (
    <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Calculator size={16} className="text-indigo-400" />
        <h3 className="font-bold text-white text-sm tracking-tight uppercase">
          1RM Calculator
        </h3>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="flex-1">
          <label className="text-[10px] text-neutral-500 font-mono uppercase block mb-1">
            Weight (kg)
          </label>
          <input
            type="number"
            value={weight}
            onChange={(e) =>
              onWeightChange(e.target.value === '' ? '' : Number(e.target.value))
            }
            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-sm text-white focus:border-indigo-500 outline-none font-mono"
          />
        </div>
        <div className="flex-1">
          <label className="text-[10px] text-neutral-500 font-mono uppercase block mb-1">
            Reps
          </label>
          <input
            type="number"
            value={reps}
            onChange={(e) =>
              onRepsChange(e.target.value === '' ? '' : Number(e.target.value))
            }
            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-sm text-white focus:border-indigo-500 outline-none font-mono"
          />
        </div>
      </div>

      {oneRepMax && (
        <div className="flex flex-col items-center p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-lg animate-in fade-in">
          <span className="text-[10px] text-indigo-400 font-mono uppercase mb-1">
            Estimated 1RM
          </span>
          <span className="text-3xl font-bold text-white mb-3">
            {oneRepMax} <span className="text-sm text-indigo-300">kg</span>
          </span>

          {/* Worldwide Strength Standard Badge */}
          {standard && (
            <div className="w-full border-t border-indigo-500/20 pt-3 flex flex-col items-center">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-white bg-indigo-600 px-2 py-0.5 rounded uppercase tracking-wider">
                  {standard.level}
                </span>
                <span className="text-xs font-mono text-indigo-300">
                  ({standard.ratio}x BW)
                </span>
              </div>
              {standard.nextTarget && (
                <span className="text-[10px] font-mono text-neutral-400">
                  Next milestone: {standard.nextTarget} kg
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
