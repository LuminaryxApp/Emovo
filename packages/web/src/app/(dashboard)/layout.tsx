"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { useAuthStore } from "@/stores/auth.store";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-cream">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-green border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-brand-cream">
      {/* Sidebar - hidden on mobile */}
      <div className="hidden lg:block">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Main content area */}
      <div
        className={`transition-all duration-200 lg:${sidebarCollapsed ? "ml-16" : "ml-60"}`}
        style={{
          marginLeft:
            typeof window !== "undefined" && window.innerWidth >= 1024
              ? sidebarCollapsed
                ? 64
                : 240
              : 0,
        }}
      >
        <Header />
        <main className="mx-auto max-w-5xl px-4 py-6 pb-20 lg:px-6 lg:pb-6">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <MobileNav />
    </div>
  );
}
