'use client';

import { useState, useMemo } from 'react';
import { Activity } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

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
          {isPositive ? '+' : ''} {delta}
        </span>
      </div>
      <span className="text-xl font-bold text-white tracking-tight">
        {value}
      </span>
    </div>
  );
}

export default function CardioAnalytics({ sessions }: { sessions: any[] }) {
  const [timeframe, setTimeframe] = useState(30);

  const { chartData, stats } = useMemo(() => {
    const now = new Date();
    const cutoffDate = new Date(now);
    cutoffDate.setDate(now.getDate() - timeframe);
    const prevCutoffDate = new Date(cutoffDate);
    prevCutoffDate.setDate(prevCutoffDate.getDate() - timeframe);

    const distribution: Record<string, { duration: number; distance: number }> = {};
    let currentDuration = 0, currentDistance = 0;
    let prevDuration = 0, prevDistance = 0;
    let currentWorkouts = 0, prevWorkouts = 0;

    sessions.forEach((session) => {
      if (session.status !== 'completed') return;
      const sessionDate = new Date(session.start_time);
      const isCurrent = sessionDate >= cutoffDate;
      const isPrevious = sessionDate >= prevCutoffDate && sessionDate < cutoffDate;

      if (!isCurrent && !isPrevious) return;

      const dateKey = sessionDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      let hasCardioInSession = false;

      session.exercises?.forEach((ex: any) => {
        if (ex.type === 'cardio' || ex.tracking_fields?.includes('time') || ex.tracking_fields?.includes('distance')) {
          ex.sets?.forEach((s: any) => {
            if (s.completed) {
              const mins = Number(s.duration_minutes) || 0;
              const km = Number(s.distance_km) || 0;
              
              if (mins > 0 || km > 0) hasCardioInSession = true;

              if (isCurrent) {
                currentDuration += mins;
                currentDistance += km;
                if (!distribution[dateKey]) distribution[dateKey] = { duration: 0, distance: 0 };
                distribution[dateKey].duration += mins;
                distribution[dateKey].distance += km;
              } else if (isPrevious) {
                prevDuration += mins;
                prevDistance += km;
              }
            }
          });
        }
      });

      if (hasCardioInSession) {
        if (isCurrent) currentWorkouts++;
        if (isPrevious) prevWorkouts++;
      }
    });

    // Convert mapping to array and sort chronologically
    const sortedData = Object.keys(distribution)
      .map((date) => ({
        date,
        duration: Math.round(distribution[date].duration),
        distance: Math.round(distribution[date].distance * 10) / 10,
      }))
      .reverse(); 

    return {
      chartData: sortedData,
      stats: {
        workouts: { current: currentWorkouts, delta: currentWorkouts - prevWorkouts },
        duration: { current: currentDuration, delta: currentDuration - prevDuration },
        distance: { current: currentDistance, delta: currentDistance - prevDistance },
      },
    };
  }, [sessions, timeframe]);

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-5 shadow-sm w-full">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-bold text-white text-lg tracking-tight flex items-center gap-2">
          <Activity size={18} className="text-rose-500" />
          Cardio Activity
        </h3>
        <select
          value={timeframe}
          onChange={(e) => setTimeframe(Number(e.target.value))}
          className="bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-neutral-300 focus:outline-none focus:border-rose-500 font-mono cursor-pointer"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      <div className="h-48 w-full mb-6">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="date" stroke="#525252" fontSize={10} tickMargin={10} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#262626', borderRadius: '8px' }}
                itemStyle={{ color: '#f43f5e', fontWeight: 'bold' }}
                labelStyle={{ color: '#737373', fontSize: '12px' }}
                formatter={(value: any, name: any) => {
                  if (name === 'duration') return [`${value} min`, 'Time'];
                  if (name === 'distance') return [`${value} km`, 'Distance'];
                  return value;
                }}
              />
              <Bar dataKey="duration" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-xs font-mono text-neutral-500 border border-dashed border-neutral-800 rounded-xl">
            No cardio logged in this period
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Sessions"
          value={stats.workouts.current}
          delta={stats.workouts.delta}
          isPositive={stats.workouts.delta >= 0}
        />
        <StatCard
          label="Total Time"
          value={`${Math.round(stats.duration.current)}m`}
          delta={`${Math.round(stats.duration.delta)}m`}
          isPositive={stats.duration.delta >= 0}
        />
        <StatCard
          label="Distance"
          value={`${(Math.round(stats.distance.current * 10) / 10).toLocaleString()} km`}
          delta={`${(Math.round(stats.distance.delta * 10) / 10).toLocaleString()} km`}
          isPositive={stats.distance.delta >= 0}
        />
        <StatCard
          label="Avg Speed"
          value={stats.duration.current > 0 ? `${(Math.round((stats.distance.current / (stats.duration.current / 60)) * 10) / 10).toLocaleString()} km/h` : '0 km/h'}
          delta={'-'}
          isPositive={true}
        />
      </div>
    </div>
  );
}