"use client";

import { createContext, useCallback, useContext, useState } from "react";

interface Toast {
  id: string;
  type: "success" | "error" | "warning" | "info";
  message: string;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (type: Toast["type"], message: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
  toasts: [],
  addToast: () => {},
  removeToast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type: Toast["type"], message: string) => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, type, message }]);
      setTimeout(() => removeToast(id), 4000);
    },
    [removeToast],
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`animate-in slide-in-from-right rounded-lg px-4 py-3 shadow-lg ${
              toast.type === "success"
                ? "bg-success text-white"
                : toast.type === "error"
                  ? "bg-error text-white"
                  : toast.type === "warning"
                    ? "bg-warning text-text-primary"
                    : "bg-info text-white"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{toast.message}</span>
              <button
                onClick={() => removeToast(toast.id)}
                className="ml-2 opacity-70 hover:opacity-100"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
