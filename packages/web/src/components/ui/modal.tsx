"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";

import { cn } from "@/lib/cn";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className={cn(
        "m-auto max-w-lg w-full rounded-[var(--radius-xl)] border border-border-default bg-surface p-0 shadow-xl backdrop:bg-black/50",
        className,
      )}
    >
      <div className="flex flex-col">
        {title && (
          <div className="flex items-center justify-between border-b border-border-light px-6 py-4">
            <h2 className="text-lg font-bold text-text-primary">{title}</h2>
            <button
              onClick={onClose}
              className="rounded-full p-1 text-text-tertiary hover:bg-surface-elevated hover:text-text-primary"
            >
              <X size={20} />
            </button>
          </div>
        )}
        <div className="px-6 py-4">{children}</div>
      </div>
    </dialog>
  );
}
