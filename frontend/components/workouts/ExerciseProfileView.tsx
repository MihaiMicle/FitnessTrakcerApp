'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Calculator,
  History,
  ChevronLeft,
  Dumbbell,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
} from 'lucide-react';
import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { calculateStrengthStandard } from '@/lib/workouts/standards';

interface ExerciseProfileViewProps {
  exercise: any;
  onBack: () => void;
}

export default function ExerciseProfileView({
  exercise,
  onBack,
}: ExerciseProfileViewProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 1RM Calculator State
  const [weight, setWeight] = useState<number | ''>('');
  const [reps, setReps] = useState<number | ''>('');

  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      // Run both network requests in parallel
      const [historyRes, profileRes] = await Promise.all([
        fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/workouts/exercises/${encodeURIComponent(exercise.name)}/history`,
          {
            headers: { Authorization: `Bearer ${session.access_token}` },
          },
        ),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/profile/me`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }),
      ]);

      if (historyRes.ok) {
        const data = await historyRes.json();
        setHistory(data);
      }
      if (profileRes.ok) {
        const data = await profileRes.json();
        setProfile(data);
      }

      setLoading(false);
    };

    fetchData();
  }, [exercise.name]);

  // Performance Intelligence: Find the best historical set for auto-fill
  useEffect(() => {
    if (history.length > 0 && exercise.type === 'strength') {
      let bestSet = null;
      let max1RM = 0;

      history.forEach((set) => {
        if (set.weight_kg && set.reps) {
          const e1RM = set.weight_kg * (1 + 0.0333 * set.reps);
          if (e1RM > max1RM) {
            max1RM = e1RM;
            bestSet = set;
          }
        }
      });

      if (bestSet) {
        setWeight((bestSet as any).weight_kg);
        setReps((bestSet as any).reps);
      }
    }
  }, [history, exercise.type]);

  const calculate1RM = () => {
    if (!weight || !reps || reps <= 0) return null;
    if (reps === 1) return weight;
    return Math.round(weight * (1 + 0.0333 * reps));
  };

  const oneRepMax = calculate1RM();
  const TypeIcon = exercise.type === 'strength' ? Dumbbell : Activity;

  // Calculate worldwide strength standard if data is available
  const standard = oneRepMax && profile
  ? calculateStrengthStandard(
      exercise.name, 
      oneRepMax,
      profile.weight_kg,
      profile.gender, 
      profile.age
    )
  : null;

  // Group history by date for the list view
  const groupedHistory = useMemo(() => {
    const groups: Record<string, any[]> = {};
    history.forEach((set) => {
      // Use YYYY-MM-DD to group accurately, then format for display
      const dateKey = new Date(set.created_at).toISOString().split('T')[0];
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(set);
    });
    return groups;
  }, [history]);

  // Generate Chart Data & Progression Stats
  const { chartData, progression } = useMemo(() => {
    if (history.length === 0 || exercise.type !== 'strength') {
      return { chartData: [], progression: null };
    }

    const statsByDate: Record<
      string,
      { dateObj: Date; maxWeight: number; totalVolume: number }
    > = {};

    history.forEach((set) => {
      if (set.weight_kg && set.reps) {
        const dateObj = new Date(set.created_at);
        const dateKey = dateObj.toISOString().split('T')[0];
        const volume = set.weight_kg * set.reps;

        if (!statsByDate[dateKey]) {
          statsByDate[dateKey] = {
            dateObj,
            maxWeight: set.weight_kg,
            totalVolume: volume,
          };
        } else {
          statsByDate[dateKey].maxWeight = Math.max(
            statsByDate[dateKey].maxWeight,
            set.weight_kg,
          );
          statsByDate[dateKey].totalVolume += volume;
        }
      }
    });

    // Convert to array and sort chronologically (oldest to newest) for the chart
    const sortedData = Object.values(statsByDate)
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
      .map((stat) => ({
        date: stat.dateObj.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        }),
        maxWeight: Math.round(stat.maxWeight * 10) / 10,
        totalVolume: Math.round(stat.totalVolume * 10) / 10,
      }));

    // Calculate progression delta (Last session vs Previous session based on Max Weight)
    let progressionStat = null;
    if (sortedData.length >= 2) {
      const current = sortedData[sortedData.length - 1].maxWeight;
      const previous = sortedData[sortedData.length - 2].maxWeight;
      const diff = current - previous;
      progressionStat = { diff: Math.round(diff * 10) / 10, current, previous };
    }

    return { chartData: sortedData, progression: progressionStat };
  }, [history, exercise.type]);

  const minChartValue =
    chartData.length > 0
      ? Math.floor(Math.min(...chartData.map((d) => d.maxWeight)) * 0.9)
      : 0;

  return (
    <div className="flex flex-col h-full bg-neutral-900">
      <div className="flex items-center gap-3 p-4 border-b border-neutral-800 shrink-0">
        <button
          onClick={onBack}
          className="text-neutral-500 hover:text-white transition"
        >
          <ChevronLeft size={24} />
        </button>
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            {exercise.name} <TypeIcon size={16} className="text-indigo-400" />
          </h2>
          <span className="text-[10px] text-neutral-500 font-mono uppercase tracking-wider">
            {exercise.primary_muscle} • {exercise.equipment}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        {/* Performance Statistics & Chart (Strength Only) */}
        {exercise.type === 'strength' && chartData.length > 0 && (
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
                  {progression.diff} kg Max Lift
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
                  <YAxis domain={[minChartValue, 'dataMax + 5']} hide />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0a0a0a',
                      borderColor: '#262626',
                      borderRadius: '8px',
                    }}
                    itemStyle={{ color: '#34d399', fontWeight: 'bold' }}
                    labelStyle={{ color: '#737373', fontSize: '10px' }}
                    formatter={(value, name) => {
                      if (name === 'maxWeight')
                        return [`${value} kg`, 'Max Weight'];
                      if (name === 'totalVolume')
                        return [`${value} kg`, 'Total Volume'];
                      return value;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="maxWeight"
                    stroke="#34d399"
                    strokeWidth={2}
                    dot={{
                      r: 3,
                      fill: '#34d399',
                      strokeWidth: 2,
                      stroke: '#171717',
                    }}
                    activeDot={{ r: 5 }}
                  />
                  {/* Invisible line just to feed totalVolume data to the tooltip */}
                  <Line
                    type="monotone"
                    dataKey="totalVolume"
                    stroke="transparent"
                    dot={false}
                    activeDot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[9px] text-neutral-500 font-mono text-center mt-2">
              Progression based on Max Weight lifted per session
            </p>
          </div>
        )}

        {/* 1RM Calculator */}
        {exercise.type === 'strength' && (
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
                    setWeight(
                      e.target.value === '' ? '' : Number(e.target.value),
                    )
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
                    setReps(e.target.value === '' ? '' : Number(e.target.value))
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
                  {oneRepMax}{' '}
                  <span className="text-sm text-indigo-300">kg</span>
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
        )}

        {/* Historical Performances List */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <History size={16} className="text-emerald-400" />
            <h3 className="font-bold text-white text-sm tracking-tight uppercase">
              Past Performances
            </h3>
          </div>

          {loading ? (
            <p className="text-xs text-neutral-500 font-mono animate-pulse">
              Loading history...
            </p>
          ) : history.length === 0 ? (
            <p className="text-xs text-neutral-500 font-mono p-4 border border-dashed border-neutral-800 rounded-lg text-center">
              No past records found.
            </p>
          ) : (
            <div className="space-y-4">
              {Object.keys(groupedHistory)
                .sort((a, b) => new Date(b).getTime() - new Date(a).getTime()) // Sort dates newest first
                .map((dateKey) => {
                  const sets = groupedHistory[dateKey];
                  const displayDate = new Date(dateKey).toLocaleDateString(
                    undefined,
                    { weekday: 'short', month: 'short', day: 'numeric' },
                  );
                  return (
                    <div
                      key={dateKey}
                      className="bg-neutral-950 border border-neutral-800 rounded-xl p-3"
                    >
                      <h4 className="text-xs font-bold text-indigo-300 mb-2 border-b border-neutral-800/50 pb-1">
                        {displayDate}
                      </h4>
                      <div className="space-y-1">
                        {sets.map((set: any, idx: number) => (
                          <div
                            key={idx}
                            className="flex justify-between items-center text-xs font-mono"
                          >
                            <span className="text-neutral-500">
                              Set {set.set_number}
                            </span>
                            <div className="text-neutral-300">
                              {set.weight_kg && `${set.weight_kg}kg `}
                              {set.reps && `x ${set.reps} reps `}
                              {set.duration_minutes &&
                                `${set.duration_minutes}m `}
                              {set.distance_km && `${set.distance_km}km `}
                              {set.rir != null && (
                                <span className="text-neutral-600">
                                  (RIR {set.rir})
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
