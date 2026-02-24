import { forwardRef } from "react";

import { cn } from "@/lib/cn";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-semibold text-text-secondary">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "h-11 w-full rounded-[var(--radius-md)] border bg-input-bg px-3 text-sm text-text-primary placeholder:text-text-tertiary transition-colors focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20",
            error ? "border-error" : "border-border-default",
            className,
          )}
          {...props}
        />
        {error && <p className="text-xs text-error">{error}</p>}
        {helperText && !error && <p className="text-xs text-text-tertiary">{helperText}</p>}
      </div>
    );
  },
);
Input.displayName = "Input";

export { Input };
export type { InputProps };
