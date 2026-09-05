'use client';

import { BarChart3, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { chartFloor, type DailyStat, type ProgressionStat } from '@/lib/workouts/exerciseHistory';

interface ExercisePerformanceChartProps {
  chartData: DailyStat[];
  progression: ProgressionStat | null;
  isStrength: boolean;
}

export default function ExercisePerformanceChart({
  chartData,
  progression,
  isStrength,
}: ExercisePerformanceChartProps) {
  if (chartData.length === 0) return null;

  const minChartValue = chartFloor(chartData);

  return (
    <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 size={16} className="text-emerald-400" />
          <h3 className="font-bold text-white text-sm tracking-tight uppercase">
            Performance Stats
          </h3>
        </div>

        {/* Progression Badge */}
        {progression && (
          <div
            className={`flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-1 rounded-md border ${
              progression.diff > 0
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : progression.diff < 0
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  : 'bg-neutral-800 text-neutral-400 border-neutral-700'
            }`}
          >
            {progression.diff > 0 ? (
              <TrendingUp size={12} />
            ) : progression.diff < 0 ? (
              <TrendingDown size={12} />
            ) : (
              <Minus size={12} />
            )}
            {progression.diff > 0 ? '+' : ''}
            {progression.diff}{' '}
            {progression.type === 'strength'
              ? 'kg Max Lift'
              : progression.type === 'distance'
                ? 'km'
                : 'min'}
          </div>
        )}
      </div>

      {/* Recharts Line Chart */}
      <div className="h-32 w-full mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <XAxis
              dataKey="date"
              stroke="#525252"
              fontSize={9}
              tickMargin={8}
              tickFormatter={(val) => val.split(' ')[0]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0a0a0a',
                borderColor: '#262626',
                borderRadius: '8px',
              }}
              itemStyle={{
                color: isStrength ? '#34d399' : '#f43f5e',
                fontWeight: 'bold',
              }}
              labelStyle={{ color: '#737373', fontSize: '10px' }}
              formatter={(value, name) => {
                if (name === 'maxWeight') return [`${value} kg`, 'Max Weight'];
                if (name === 'totalVolume') return [`${value} kg`, 'Total Volume'];
                if (name === 'totalDistance') return [`${value} km`, 'Distance'];
                if (name === 'totalTime') return [`${value} min`, 'Duration'];
                return value;
              }}
            />
            {isStrength ? (
              <>
                <YAxis domain={[minChartValue, 'dataMax + 5']} hide />
                <Line
                  type="monotone"
                  dataKey="maxWeight"
                  stroke="#34d399"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#34d399', strokeWidth: 2, stroke: '#171717' }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="totalVolume"
                  stroke="transparent"
                  dot={false}
                  activeDot={false}
                />
              </>
            ) : (
              <>
                <YAxis hide />
                <Line
                  type="monotone"
                  dataKey={
                    chartData.some((d) => d.totalDistance > 0)
                      ? 'totalDistance'
                      : 'totalTime'
                  }
                  stroke="#f43f5e"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#f43f5e', strokeWidth: 2, stroke: '#171717' }}
                  activeDot={{ r: 5 }}
                />
              </>
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[9px] text-neutral-500 font-mono text-center mt-2">
        Progression based on{' '}
        {isStrength ? 'Max Weight lifted' : 'Total Distance / Time'} per session
      </p>
    </div>
  );
}
