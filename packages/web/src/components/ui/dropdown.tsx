"use client";

import { ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";

import { cn } from "@/lib/cn";

interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function Dropdown({ options, value, onChange, placeholder, className }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-10 w-full items-center justify-between rounded-[var(--radius-md)] border border-border-default bg-input-bg px-3 text-sm text-text-primary transition-colors hover:border-brand-green"
      >
        <span>{selected?.label || placeholder || "Select..."}</span>
        <ChevronDown size={16} className={cn("transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute z-10 mt-1 w-full rounded-[var(--radius-md)] border border-border-default bg-surface py-1 shadow-lg">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={cn(
                "w-full px-3 py-2 text-left text-sm transition-colors hover:bg-surface-elevated",
                option.value === value && "font-semibold text-brand-green",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
