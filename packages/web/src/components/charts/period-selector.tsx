"use client";

import { cn } from "@/lib/cn";

const PERIODS = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

interface PeriodSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <div className="inline-flex rounded-[var(--radius-md)] border border-border-default bg-surface p-1">
      {PERIODS.map((period) => (
        <button
          key={period.value}
          onClick={() => onChange(period.value)}
          className={cn(
            "rounded-[var(--radius-sm)] px-4 py-1.5 text-sm font-medium transition-colors",
            value === period.value
              ? "bg-brand-green text-white"
              : "text-text-secondary hover:text-text-primary",
          )}
        >
          {period.label}
        </button>
      ))}
    </div>
  );
}
