'use client';

import React from 'react';
import { calculatePeriodAverages } from '@/lib/weight/averages';
import { Scale, TrendingDown, TrendingUp, Minus } from 'lucide-react';

interface WeightAveragesCardProps {
  logs: { date: string; weight_kg: number }[];
  selectedDate?: string;
}

export default function WeightAveragesCard({
  logs,
  selectedDate,
}: WeightAveragesCardProps) {
  const averages = calculatePeriodAverages(logs, selectedDate);

  if (averages.length === 0) return null;

  return (
    <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between border-b border-neutral-800/60 pb-2.5">
        <div className="flex items-center gap-2">
          <Scale size={16} className="text-indigo-400" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-300">
            Rolling Weight Averages
          </h3>
        </div>
        <span className="text-[10px] font-mono text-neutral-500">
          Last 28 Days
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {averages.map((period) => {
          const hasData = period.avgWeight !== null;
          const delta = period.deltaFromCurrent;
          const isNeutral = delta === 0 || delta === null;
          const isUp = delta !== null && delta > 0;

          return (
            <div
              key={period.days}
              className="bg-neutral-900/70 border border-neutral-800 rounded-lg p-3 flex flex-col justify-between"
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-[11px] font-mono text-neutral-400">
                  {period.label}
                </span>
                {hasData && (
                  <span className="text-[9px] font-mono text-neutral-500">
                    {period.count} {period.count === 1 ? 'entry' : 'entries'}
                  </span>
                )}
              </div>

              <div className="flex items-baseline justify-between mt-1">
                <span className="text-base sm:text-lg font-bold font-mono text-white">
                  {hasData ? `${period.avgWeight} kg` : '—'}
                </span>

                {hasData && delta !== null && (
                  <div
                    className={`flex items-center gap-0.5 text-[10px] font-mono font-bold ${
                      isNeutral
                        ? 'text-neutral-500'
                        : isUp
                          ? 'text-rose-400'
                          : 'text-emerald-400'
                    }`}
                    title="Difference between latest logged weight and this average"
                  >
                    {isNeutral ? (
                      <Minus size={11} />
                    ) : isUp ? (
                      <TrendingUp size={11} />
                    ) : (
                      <TrendingDown size={11} />
                    )}
                    <span>
                      {isUp ? '+' : ''}
                      {delta}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
