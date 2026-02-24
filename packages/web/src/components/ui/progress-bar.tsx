import { cn } from "@/lib/cn";

interface ProgressBarProps {
  value: number;
  max?: number;
  color?: string;
  className?: string;
}

export function ProgressBar({ value, max = 100, color, className }: ProgressBarProps) {
  const percentage = Math.min(100, (value / max) * 100);

  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-border-light", className)}>
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{
          width: `${percentage}%`,
          backgroundColor: color || "var(--color-brand-green)",
        }}
      />
    </div>
  );
}
