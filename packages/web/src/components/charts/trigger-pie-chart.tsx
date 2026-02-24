"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const COLORS = [
  "#75863C",
  "#6F98B8",
  "#EAB308",
  "#F97316",
  "#DC2626",
  "#8FA04E",
  "#5A7D99",
  "#FACC15",
];

interface TriggerData {
  trigger: { id: string; name: string; icon: string | null; isDefault: boolean };
  count: number;
  avgMood: number;
}

interface TriggerPieChartProps {
  data: TriggerData[];
}

export function TriggerPieChart({ data }: TriggerPieChartProps) {
  if (data.length === 0) return null;

  const chartData = data.map((d) => ({ name: d.trigger.name, count: d.count }));

  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="count"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={80}
          innerRadius={40}
          paddingAngle={2}
        >
          {chartData.map((_, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            borderRadius: 8,
            border: "1px solid var(--color-border-default)",
            fontSize: 12,
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: 12 }}
          formatter={(value) => <span className="text-text-secondary">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
