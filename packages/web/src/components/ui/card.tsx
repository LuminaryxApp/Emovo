import { cn } from "@/lib/cn";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated";
  hover?: boolean;
}

export function Card({
  className,
  variant = "default",
  hover = false,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-border-default bg-surface p-4 transition-all duration-200",
        variant === "elevated" && "shadow-md bg-surface-elevated",
        hover && "card-hover",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
