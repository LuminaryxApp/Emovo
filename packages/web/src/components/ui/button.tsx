import { forwardRef } from "react";

import { cn } from "@/lib/cn";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center rounded-[var(--radius-md)] font-semibold transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-brand-green text-white hover:bg-brand-green-dark shadow-sm hover:shadow-md":
              variant === "primary",
            "bg-surface text-text-primary hover:bg-surface-elevated border border-border-default":
              variant === "secondary",
            "border-2 border-brand-green text-brand-green hover:bg-brand-green hover:text-white":
              variant === "outline",
            "text-text-secondary hover:bg-surface-elevated hover:text-text-primary":
              variant === "ghost",
            "bg-error text-white hover:bg-red-700": variant === "danger",
          },
          {
            "h-8 px-3 text-sm": size === "sm",
            "h-10 px-4 text-sm": size === "md",
            "h-12 px-6 text-base": size === "lg",
          },
          className,
        )}
        {...props}
      >
        {loading ? (
          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : null}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";

export { Button };
export type { ButtonProps };
