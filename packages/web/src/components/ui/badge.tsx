import { cn } from "@/lib/cn";

type StatusType = "pending" | "reviewed" | "actioned" | "dismissed";

interface BadgeProps {
  variant?: "primary" | "muted" | "mood" | "status";
  moodLevel?: number;
  status?: StatusType;
  children: React.ReactNode;
  className?: string;
}

const statusColors: Record<StatusType, string> = {
  pending: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  reviewed: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  actioned: "bg-brand-green/15 text-brand-green",
  dismissed: "bg-gray-500/15 text-gray-500",
};

export function Badge({ variant = "primary", moodLevel, status, children, className }: BadgeProps) {
  const moodColors: Record<number, string> = {
    1: "bg-mood-1/15 text-mood-1",
    2: "bg-mood-2/15 text-mood-2",
    3: "bg-mood-3/15 text-mood-3",
    4: "bg-mood-4/15 text-mood-4",
    5: "bg-mood-5/15 text-mood-5",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        variant === "primary" && "bg-brand-green/10 text-brand-green",
        variant === "muted" && "bg-surface-elevated text-text-secondary",
        variant === "mood" && moodLevel && moodColors[moodLevel],
        variant === "status" && status && statusColors[status],
        className,
      )}
    >
      {children}
    </span>
  );
}
