"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface DataPoint {
  date: string;
  avgMood: number;
  count: number;
}

interface MoodLineChartProps {
  data: DataPoint[];
}

export function MoodLineChart({ data }: MoodLineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data}>
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 11 }} />
        <Tooltip
          contentStyle={{
            borderRadius: 8,
            border: "1px solid var(--color-border-default)",
            fontSize: 12,
          }}
        />
        <Line
          type="monotone"
          dataKey="avgMood"
          stroke="#75863C"
          strokeWidth={2}
          dot={{ fill: "#75863C", r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
