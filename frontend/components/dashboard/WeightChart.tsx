"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip } from "recharts";

interface WeightChartProps {
  selectedDate: string;
  onClick: () => void;
}

export default function WeightChart({
  selectedDate,
  onClick,
}: WeightChartProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [weightInput, setWeightInput] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/profile/weight`,
      {
        headers: { Authorization: `Bearer ${session.access_token}` },
      },
    );
    if (res.ok) {
      const data = await res.json();
      setLogs(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleLogWeight = async () => {
    if (!weightInput) return;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profile/weight`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      // Fixed: Logs weight to the active selectedDate instead of hardcoded 'today'
      body: JSON.stringify({
        date: selectedDate,
        weight_kg: parseFloat(weightInput),
      }),
    });

    setWeightInput("");
    fetchLogs();
  };

  // Find the exact weight logged for the date you are currently viewing
  const logForSelectedDate = logs.find((log) => log.date === selectedDate);

  // Display the exact date's weight, otherwise fallback to the most recent weight
  const displayWeight = logForSelectedDate
    ? logForSelectedDate.weight_kg
    : logs.length > 0
      ? logs[logs.length - 1].weight_kg
      : 0;

  const chartData = logs.map((log) => ({
    date: log.date.substring(5), // MM-DD format
    weight: log.weight_kg,
  }));

  const minWeight =
    logs.length > 0 ? Math.min(...logs.map((l) => l.weight_kg)) - 2 : 0;
  const maxWeight =
    logs.length > 0 ? Math.max(...logs.map((l) => l.weight_kg)) + 2 : 100;

  return (
    <div className="bg-neutral-900 rounded-xl p-4 sm:p-6 shadow-sm border border-neutral-800 flex flex-col h-full">
      <div className="flex justify-between items-center mb-4 shrink-0">
        <span className="text-neutral-400 text-sm">
          Weight <span className="hidden sm:inline">& Physique</span>
        </span>
        <div className="flex flex-col items-end">
          <span className="font-mono font-bold text-white text-sm sm:text-base">
            {displayWeight ? `${displayWeight} kg` : "No data"}
          </span>
          {/* Small indicator so you know you are looking at past data */}
          {logForSelectedDate && (
            <span className="text-[10px] text-neutral-500 font-mono mt-0.5">
              Logged {selectedDate.substring(5)}
            </span>
          )}
        </div>
      </div>

      {/* Chart Area triggers the modal */}
      <div className="flex-1 min-h-[120px] cursor-pointer" onClick={onClick}>
        {loading ? (
          <div className="h-full flex items-center justify-center text-xs text-neutral-600 font-mono">
            Loading...
          </div>
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <YAxis domain={[minWeight, maxWeight]} hide />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0a0a0a",
                  borderColor: "#262626",
                  borderRadius: "8px",
                }}
                itemStyle={{ color: "#818cf8", fontWeight: "bold" }}
                labelStyle={{ color: "#737373", fontSize: "12px" }}
              />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="#818cf8"
                strokeWidth={3}
                dot={{
                  r: 4,
                  fill: "#818cf8",
                  strokeWidth: 2,
                  stroke: "#171717",
                }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-xs text-neutral-600 font-mono">
            Log weight to generate chart
          </div>
        )}
      </div>

      <div
        className="mt-4 flex gap-2 shrink-0"
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <input
          type="number"
          step="0.1"
          value={weightInput}
          onChange={(e) => setWeightInput(e.target.value)}
          placeholder={`Log for ${selectedDate.substring(5)}...`}
          className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-sm font-mono text-neutral-400 focus:outline-none focus:border-indigo-600 min-w-0"
        />
        <button
          onClick={handleLogWeight}
          disabled={!weightInput}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 rounded-lg text-xs font-mono transition disabled:opacity-50 cursor-pointer shrink-0"
        >
          Log
        </button>
      </div>
    </div>
  );
}
