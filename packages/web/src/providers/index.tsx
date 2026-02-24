"use client";

import { useEffect } from "react";

import { ThemeProvider } from "./theme-provider";
import { ToastProvider } from "./toast-provider";

import { useAuthStore } from "@/stores/auth.store";

function AuthHydrator({ children }: { children: React.ReactNode }) {
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthHydrator>{children}</AuthHydrator>
      </ToastProvider>
    </ThemeProvider>
  );
}
