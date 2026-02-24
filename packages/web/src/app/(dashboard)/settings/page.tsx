"use client";

import {
  Download,
  HelpCircle,
  ChevronDown,
  Monitor,
  Sun,
  Moon,
  Globe,
  Shield,
  Smartphone,
  Mail,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SUPPORTED_LANGUAGES, changeLanguage, getCurrentLanguage } from "@/i18n/config";
import { cn } from "@/lib/cn";
import { useTheme } from "@/providers/theme-provider";
import { useToast } from "@/providers/toast-provider";
import { exportData } from "@/services/export.api";
import { getSessionsApi, deleteSessionApi } from "@/services/user.api";
import type { Session } from "@/services/user.api";
import { useAuthStore } from "@/stores/auth.store";

// ── Toggle Switch (inline) ─────────────────────────────────────────
function ToggleSwitch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2",
        checked ? "bg-brand-green" : "bg-gray-300 dark:bg-gray-600",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200",
          checked ? "translate-x-5" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

// ── Relative time helper ────────────────────────────────────────────
function relativeTime(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

// ── FAQ data ────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  {
    q: "How do I log my mood?",
    a: "Click the '+' button on the home page, select your mood level (1-5), add optional notes and triggers, then click 'Save Entry'.",
  },
  {
    q: "What are triggers?",
    a: "Triggers are activities or events that may affect your mood. You can select from default triggers or create custom ones.",
  },
  {
    q: "Can I export my data?",
    a: "Yes! Use the export buttons below to download your data as JSON or CSV.",
  },
  {
    q: "Is my data private?",
    a: "Absolutely. Your mood notes are encrypted end-to-end. We never share your personal data.",
  },
  {
    q: "How are insights calculated?",
    a: "Insights are based on your mood entries over time. We analyze average mood, distribution, and trigger patterns.",
  },
];

// ── Main Page ───────────────────────────────────────────────────────
export default function SettingsPage() {
  const { addToast } = useToast();
  const { theme, setTheme } = useTheme();
  const { user, updateProfile, logoutAll } = useAuthStore();

  // Export state
  const [exporting, setExporting] = useState<string | null>(null);

  // FAQ state
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Language state
  const [selectedLang, setSelectedLang] = useState(
    () => user?.preferredLanguage || getCurrentLanguage() || "en",
  );
  const [changingLang, setChangingLang] = useState(false);

  // Privacy toggles
  const [isPrivate, setIsPrivate] = useState(user?.isPrivate ?? false);
  const [showRealName, setShowRealName] = useState(user?.showRealName ?? false);
  const [savingPrivacy, setSavingPrivacy] = useState<string | null>(null);

  // Sessions
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [loggingOutAll, setLoggingOutAll] = useState(false);

  // Sync with user when it changes
  useEffect(() => {
    if (user) {
      setIsPrivate(user.isPrivate);
      setShowRealName(user.showRealName);
      setSelectedLang(user.preferredLanguage || getCurrentLanguage() || "en");
    }
  }, [user]);

  // Fetch sessions on mount
  const fetchSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const data = await getSessionsApi();
      setSessions(data);
    } catch {
      addToast("error", "Failed to load sessions");
    } finally {
      setSessionsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // ── Handlers ────────────────────────────────────────────────────

  const handleExport = async (format: "json" | "csv") => {
    setExporting(format);
    try {
      await exportData(format);
      addToast("success", `Data exported as ${format.toUpperCase()}`);
    } catch {
      addToast("error", "Failed to export data");
    } finally {
      setExporting(null);
    }
  };

  const handleLanguageChange = async (code: string) => {
    setChangingLang(true);
    setSelectedLang(code);
    try {
      await changeLanguage(code as Parameters<typeof changeLanguage>[0]);
      await updateProfile({ preferredLanguage: code });
      addToast("success", "Language updated");
    } catch {
      addToast("error", "Failed to update language");
      setSelectedLang(user?.preferredLanguage || getCurrentLanguage() || "en");
    } finally {
      setChangingLang(false);
    }
  };

  const handlePrivacyToggle = async (field: "isPrivate" | "showRealName", value: boolean) => {
    const prev = field === "isPrivate" ? isPrivate : showRealName;
    if (field === "isPrivate") setIsPrivate(value);
    else setShowRealName(value);
    setSavingPrivacy(field);
    try {
      await updateProfile({ [field]: value });
      addToast("success", "Privacy setting updated");
    } catch {
      if (field === "isPrivate") setIsPrivate(prev);
      else setShowRealName(prev);
      addToast("error", "Failed to update setting");
    } finally {
      setSavingPrivacy(null);
    }
  };

  const handleRevokeSession = async (id: string) => {
    setRevokingId(id);
    try {
      await deleteSessionApi(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      addToast("success", "Session revoked");
    } catch {
      addToast("error", "Failed to revoke session");
    } finally {
      setRevokingId(null);
    }
  };

  const handleLogoutAllOther = async () => {
    setLoggingOutAll(true);
    try {
      await logoutAll();
    } catch {
      addToast("error", "Failed to log out other devices");
      setLoggingOutAll(false);
    }
  };

  // ── Theme icons ─────────────────────────────────────────────────

  const themeOptions = [
    { value: "light" as const, label: "Light", icon: Sun },
    { value: "dark" as const, label: "Dark", icon: Moon },
    { value: "system" as const, label: "System", icon: Monitor },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Settings</h1>

      {/* ── 1. Appearance ──────────────────────────────────────── */}
      <Card className="p-4">
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase text-section-label">
          <Sun size={16} />
          Appearance
        </h3>
        <div className="flex gap-2">
          {themeOptions.map((t) => {
            const Icon = t.icon;
            return (
              <Button
                key={t.value}
                variant={theme === t.value ? "primary" : "secondary"}
                size="sm"
                onClick={() => setTheme(t.value)}
              >
                <Icon size={14} className="mr-1.5" />
                {t.label}
              </Button>
            );
          })}
        </div>
      </Card>

      {/* ── 2. Language ────────────────────────────────────────── */}
      <Card className="p-4">
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase text-section-label">
          <Globe size={16} />
          Language
        </h3>
        <div className="relative">
          <select
            value={selectedLang}
            onChange={(e) => handleLanguageChange(e.target.value)}
            disabled={changingLang}
            className={cn(
              "w-full appearance-none rounded-[var(--radius-md)] border border-border-default bg-surface px-3 py-2.5 pr-10 text-sm text-text-primary transition-colors",
              "focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20",
              "dark:bg-surface-elevated",
              changingLang && "opacity-50",
            )}
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.nativeLabel} ({lang.label})
              </option>
            ))}
          </select>
          <ChevronDown
            size={16}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary"
          />
        </div>
      </Card>

      {/* ── 3. Privacy ─────────────────────────────────────────── */}
      <Card className="p-4">
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase text-section-label">
          <Shield size={16} />
          Privacy
        </h3>
        <div className="space-y-4">
          {/* Private Account */}
          <div className="flex items-center justify-between">
            <div className="mr-4">
              <p className="text-sm font-medium text-text-primary">Private Account</p>
              <p className="text-xs text-text-secondary">
                Only approved followers can see your posts
              </p>
            </div>
            <ToggleSwitch
              checked={isPrivate}
              onChange={(v) => handlePrivacyToggle("isPrivate", v)}
              disabled={savingPrivacy === "isPrivate"}
            />
          </div>

          {/* Show Real Name */}
          <div className="flex items-center justify-between">
            <div className="mr-4">
              <p className="text-sm font-medium text-text-primary">Show Real Name</p>
              <p className="text-xs text-text-secondary">Display your real name to other users</p>
            </div>
            <ToggleSwitch
              checked={showRealName}
              onChange={(v) => handlePrivacyToggle("showRealName", v)}
              disabled={savingPrivacy === "showRealName"}
            />
          </div>
        </div>
      </Card>

      {/* ── 4. Active Sessions ─────────────────────────────────── */}
      <Card className="p-4">
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase text-section-label">
          <Smartphone size={16} />
          Active Sessions
        </h3>

        {sessionsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-8 w-16" />
              </div>
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-text-secondary">No active sessions</p>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between rounded-lg border border-border-light px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {session.deviceName || "Unknown device"}
                    </p>
                    {session.current && (
                      <Badge variant="primary" className="shrink-0">
                        Current
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-text-tertiary">
                    Last active {relativeTime(session.lastUsedAt)}
                  </p>
                </div>
                {!session.current && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRevokeSession(session.id)}
                    loading={revokingId === session.id}
                    className="ml-2 shrink-0 text-error hover:text-error"
                  >
                    Revoke
                  </Button>
                )}
              </div>
            ))}

            {sessions.filter((s) => !s.current).length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full"
                onClick={handleLogoutAllOther}
                loading={loggingOutAll}
              >
                Log Out All Other Devices
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* ── 5. Data Export ─────────────────────────────────────── */}
      <Card className="p-4">
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase text-section-label">
          <Download size={16} />
          Export Data
        </h3>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => handleExport("json")}
            loading={exporting === "json"}
          >
            <Download size={16} className="mr-2" />
            Export as JSON
          </Button>
          <Button
            variant="outline"
            onClick={() => handleExport("csv")}
            loading={exporting === "csv"}
          >
            <Download size={16} className="mr-2" />
            Export as CSV
          </Button>
        </div>
      </Card>

      {/* ── 6. Help & FAQ ──────────────────────────────────────── */}
      <Card className="p-4">
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase text-section-label">
          <HelpCircle size={16} />
          Help & FAQ
        </h3>
        <div className="space-y-2">
          {FAQ_ITEMS.map((item, i) => (
            <div key={i} className="border-b border-border-light last:border-0">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="flex w-full items-center justify-between py-3 text-left text-sm font-medium text-text-primary"
              >
                {item.q}
                <ChevronDown
                  size={16}
                  className={cn("shrink-0 transition-transform", openFaq === i && "rotate-180")}
                />
              </button>
              {openFaq === i && <p className="pb-3 text-sm text-text-secondary">{item.a}</p>}
            </div>
          ))}
        </div>

        {/* Contact Support */}
        <a
          href="mailto:support@emovo.app"
          className="mt-4 flex items-center gap-2 text-sm font-medium text-brand-green hover:underline"
        >
          <Mail size={16} />
          Contact Support
        </a>
      </Card>
    </div>
  );
}
