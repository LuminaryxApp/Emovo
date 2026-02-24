"use client";

import {
  Home,
  Calendar,
  BarChart3,
  Users,
  MessageCircle,
  User,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";
import { useAuthStore } from "@/stores/auth.store";

const NAV_ITEMS = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/history", label: "History", icon: Calendar },
  { href: "/insights", label: "Insights", icon: BarChart3 },
  { href: "/community", label: "Community", icon: Users },
  { href: "/messages", label: "Messages", icon: MessageCircle },
  { href: "/profile", label: "Profile", icon: User },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const logout = useAuthStore((s) => s.logout);
  const isAdmin = useAuthStore((s) => s.user?.isAdmin);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-30 flex h-full flex-col border-r border-border-default bg-surface transition-all duration-200",
        collapsed ? "w-16" : "w-60",
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-border-light px-4">
        {!collapsed && (
          <Link href="/home" className="text-xl font-bold text-brand-green">
            Emovo
          </Link>
        )}
        <button
          onClick={onToggle}
          className="rounded-lg p-1.5 text-text-tertiary transition-colors duration-200 hover:bg-surface-elevated hover:text-text-primary"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-1 px-2 py-4">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-brand-green/10 text-brand-green"
                  : "text-text-secondary hover:bg-surface-elevated hover:text-text-primary",
              )}
              title={collapsed ? item.label : undefined}
            >
              {/* Active accent bar */}
              {isActive && (
                <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-brand-green" />
              )}
              <item.icon size={20} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Separator */}
      <div className="mx-auto mb-1 flex items-center justify-center px-2">
        <span className="block h-px w-8 bg-border-default" />
      </div>

      {/* Bottom actions */}
      <div className="space-y-1 border-t border-border-light px-2 py-4">
        {isAdmin && (
          <Link
            href="/admin"
            className={cn(
              "relative flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium text-text-secondary transition-all duration-200 hover:bg-surface-elevated hover:text-text-primary",
              pathname === "/admin" && "bg-brand-green/10 text-brand-green",
            )}
            title={collapsed ? "Admin" : undefined}
          >
            {pathname === "/admin" && (
              <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-brand-green" />
            )}
            <Shield size={20} />
            {!collapsed && <span>Admin</span>}
          </Link>
        )}
        <Link
          href="/settings"
          className={cn(
            "relative flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium text-text-secondary transition-all duration-200 hover:bg-surface-elevated hover:text-text-primary",
            pathname === "/settings" && "bg-brand-green/10 text-brand-green",
          )}
          title={collapsed ? "Settings" : undefined}
        >
          {pathname === "/settings" && (
            <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-brand-green" />
          )}
          <Settings size={20} />
          {!collapsed && <span>Settings</span>}
        </Link>
        <button
          onClick={() => logout()}
          className="flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium text-text-secondary transition-all duration-200 hover:bg-error/10 hover:text-error"
          title={collapsed ? "Log out" : undefined}
        >
          <LogOut size={20} />
          {!collapsed && <span>Log out</span>}
        </button>
      </div>
    </aside>
  );
}
