'use client';
import { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { calculateMuscleDistribution } from '@/lib/workouts/stats';

// ... (Keep the StatCard and formatDuration helper functions the exact same) ...
function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

interface StatCardProps {
  label: string;
  value: string | number;
  delta: string | number;
  isPositive: boolean;
}

function StatCard({ label, value, delta, isPositive }: StatCardProps) {
  return (
    <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between shadow-sm">
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs text-neutral-400 font-mono">{label}</span>
        <span
          className={`text-[10px] font-mono flex items-center gap-1 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}
        >
          {isPositive ? '↑' : '↓'} {delta}
        </span>
      </div>
      <span className="text-xl font-bold text-white tracking-tight">
        {value}
      </span>
    </div>
  );
}

export default function MuscleDistribution({ sessions }: { sessions: any[] }) {
  const [timeframe, setTimeframe] = useState(30);
  const [exerciseDict, setExerciseDict] = useState<Record<string, string>>({});

  // Fetch exercises and map them to their primary muscles
  useEffect(() => {
    const fetchExercises = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/workouts/exercises`,
          {
            headers: { Authorization: `Bearer ${session.access_token}` },
          },
        );
        if (res.ok) {
          const data = await res.json();
          const dict: Record<string, string> = {};
          data.forEach((e: any) => {
            if (e.primary_muscle) dict[e.name] = e.primary_muscle;
          });
          setExerciseDict(dict);
        }
      } catch (err) {
        console.error('Failed to load exercise dictionary', err);
      }
    };

    fetchExercises();
  }, []);

  // Pass the dictionary into the calculator
  const { chartData, stats } = useMemo(
    () => calculateMuscleDistribution(sessions, exerciseDict, timeframe),
    [sessions, timeframe, exerciseDict],
  );

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-5 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-bold text-white text-lg tracking-tight">
          Distribution
        </h3>
        <select
          value={timeframe}
          onChange={(e) => setTimeframe(Number(e.target.value))}
          className="bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-neutral-300 focus:outline-none focus:border-indigo-500 font-mono cursor-pointer"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      <div className="h-64 w-full mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
            <PolarGrid stroke="#262626" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fill: '#a3a3a3', fontSize: 10, fontFamily: 'monospace' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0a0a0a',
                borderColor: '#262626',
                borderRadius: '8px',
              }}
              itemStyle={{
                color: '#fff',
                fontSize: '12px',
                fontFamily: 'monospace',
              }}
            />
            <Radar
              name="Previous"
              dataKey="previous"
              stroke="#525252"
              fill="#525252"
              fillOpacity={0.3}
            />
            <Radar
              name="Current"
              dataKey="current"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.5}
            />
          </RadarChart>
        </ResponsiveContainer>

        <div className="flex justify-center gap-4 text-[10px] font-mono text-neutral-400 mt-2">
          <span className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>Current
          </span>
          <span className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-neutral-500"></div>Previous
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Workouts"
          value={stats.workouts.current}
          delta={Math.abs(stats.workouts.delta)}
          isPositive={stats.workouts.delta >= 0}
        />
        <StatCard
          label="Duration"
          value={formatDuration(stats.duration.current)}
          delta={formatDuration(Math.abs(stats.duration.delta))}
          isPositive={stats.duration.delta >= 0}
        />
        <StatCard
          label="Volume"
          value={`${stats.volume.current.toLocaleString()} kg`}
          delta={`${Math.abs(stats.volume.delta).toLocaleString()} kg`}
          isPositive={stats.volume.delta >= 0}
        />
        <StatCard
          label="Sets"
          value={stats.sets.current}
          delta={Math.abs(stats.sets.delta)}
          isPositive={stats.sets.delta >= 0}
        />
      </div>
    </div>
  );
}
