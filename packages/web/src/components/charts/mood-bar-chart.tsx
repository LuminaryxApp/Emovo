"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

import { MOOD_LABELS, MOOD_HEX } from "@/theme/constants";

interface MoodBarChartProps {
  distribution: Record<number, number>;
}

export function MoodBarChart({ distribution }: MoodBarChartProps) {
  const data = [1, 2, 3, 4, 5].map((level) => ({
    name: MOOD_LABELS[level],
    value: distribution[level] || 0,
    level,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data}>
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
        <Tooltip
          contentStyle={{
            borderRadius: 8,
            border: "1px solid var(--color-border-default)",
            fontSize: 12,
          }}
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((entry) => (
            <Cell key={entry.level} fill={MOOD_HEX[entry.level]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
