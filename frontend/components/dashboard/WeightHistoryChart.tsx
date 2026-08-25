'use client';

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface WeightHistoryChartProps {
  logs: any[];
  loading: boolean;
}

function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full flex items-center justify-center text-xs font-mono text-neutral-500">
      {children}
    </div>
  );
}

/** Weight over time, padded two kilos either side of the observed range. */
export default function WeightHistoryChart({
  logs,
  loading,
}: WeightHistoryChartProps) {
  const weights = logs.map((log) => log.weight_kg);
  const data = logs.map((log) => ({ date: log.date, weight: log.weight_kg }));

  return (
    <div className="h-48 sm:h-64 w-full bg-neutral-950 border border-neutral-800 rounded-xl p-4">
      {loading ? (
        <Placeholder>Loading chart...</Placeholder>
      ) : logs.length === 0 ? (
        <Placeholder>No data available</Placeholder>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis
              dataKey="date"
              stroke="#525252"
              fontSize={10}
              tickMargin={10}
            />
            <YAxis
              domain={[Math.min(...weights) - 2, Math.max(...weights) + 2]}
              stroke="#525252"
              fontSize={10}
              width={30}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0a0a0a',
                borderColor: '#262626',
                borderRadius: '8px',
              }}
              itemStyle={{ color: '#818cf8', fontWeight: 'bold' }}
              labelStyle={{ color: '#737373', fontSize: '12px' }}
            />
            <Line
              type="monotone"
              dataKey="weight"
              stroke="#818cf8"
              strokeWidth={3}
              dot={{ r: 4, fill: '#818cf8', strokeWidth: 2, stroke: '#171717' }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
