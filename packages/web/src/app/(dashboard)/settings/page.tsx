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
import { useTranslation } from "react-i18next";

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

// ── FAQ keys ────────────────────────────────────────────────────────
const FAQ_KEYS = ["q1", "q2", "q3", "q4", "q5"] as const;

// ── Main Page ───────────────────────────────────────────────────────
export default function SettingsPage() {
  const { t } = useTranslation();
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
      addToast("error", t("settings.sessionsLoadFailed"));
    } finally {
      setSessionsLoading(false);
    }
  }, [addToast, t]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // ── Handlers ────────────────────────────────────────────────────

  const handleExport = async (format: "json" | "csv") => {
    setExporting(format);
    try {
      await exportData(format);
      addToast("success", t("settings.dataExported", { format: format.toUpperCase() }));
    } catch {
      addToast("error", t("settings.exportFailed"));
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
      addToast("success", t("settings.languageUpdated"));
    } catch {
      addToast("error", t("settings.languageUpdateFailed"));
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
      addToast("success", t("settings.privacyUpdated"));
    } catch {
      if (field === "isPrivate") setIsPrivate(prev);
      else setShowRealName(prev);
      addToast("error", t("settings.privacyUpdateFailed"));
    } finally {
      setSavingPrivacy(null);
    }
  };

  const handleRevokeSession = async (id: string) => {
    setRevokingId(id);
    try {
      await deleteSessionApi(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      addToast("success", t("settings.sessionRevoked"));
    } catch {
      addToast("error", t("settings.sessionRevokeFailed"));
    } finally {
      setRevokingId(null);
    }
  };

  const handleLogoutAllOther = async () => {
    setLoggingOutAll(true);
    try {
      await logoutAll();
    } catch {
      addToast("error", t("settings.logoutFailed"));
      setLoggingOutAll(false);
    }
  };

  // ── Theme icons ─────────────────────────────────────────────────

  const themeOptions = [
    { value: "light" as const, labelKey: "settings.light", icon: Sun },
    { value: "dark" as const, labelKey: "settings.dark", icon: Moon },
    { value: "system" as const, labelKey: "settings.system", icon: Monitor },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">{t("settings.title")}</h1>

      {/* ── 1. Appearance ──────────────────────────────────────── */}
      <Card className="p-4">
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase text-section-label">
          <Sun size={16} />
          {t("settings.appearance")}
        </h3>
        <div className="flex gap-2">
          {themeOptions.map((opt) => {
            const Icon = opt.icon;
            return (
              <Button
                key={opt.value}
                variant={theme === opt.value ? "primary" : "secondary"}
                size="sm"
                onClick={() => setTheme(opt.value)}
              >
                <Icon size={14} className="mr-1.5" />
                {t(opt.labelKey)}
              </Button>
            );
          })}
        </div>
      </Card>

      {/* ── 2. Language ────────────────────────────────────────── */}
      <Card className="p-4">
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase text-section-label">
          <Globe size={16} />
          {t("settings.language")}
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
          {t("settings.privacy")}
        </h3>
        <div className="space-y-4">
          {/* Private Account */}
          <div className="flex items-center justify-between">
            <div className="mr-4">
              <p className="text-sm font-medium text-text-primary">
                {t("settings.privateAccount")}
              </p>
              <p className="text-xs text-text-secondary">{t("settings.privateAccountDesc")}</p>
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
              <p className="text-sm font-medium text-text-primary">{t("settings.showRealName")}</p>
              <p className="text-xs text-text-secondary">{t("settings.showRealNameDesc")}</p>
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
          {t("settings.activeSessions")}
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
          <p className="text-sm text-text-secondary">{t("settings.noSessions")}</p>
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
                      {session.deviceName || t("settings.unknownDevice")}
                    </p>
                    {session.current && (
                      <Badge variant="primary" className="shrink-0">
                        {t("settings.current")}
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
                    {t("settings.revoke")}
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
                {t("settings.logoutAllDevices")}
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* ── 5. Data Export ─────────────────────────────────────── */}
      <Card className="p-4">
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase text-section-label">
          <Download size={16} />
          {t("settings.exportData")}
        </h3>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => handleExport("json")}
            loading={exporting === "json"}
          >
            <Download size={16} className="mr-2" />
            {t("settings.exportJson")}
          </Button>
          <Button
            variant="outline"
            onClick={() => handleExport("csv")}
            loading={exporting === "csv"}
          >
            <Download size={16} className="mr-2" />
            {t("settings.exportCsv")}
          </Button>
        </div>
      </Card>

      {/* ── 6. Help & FAQ ──────────────────────────────────────── */}
      <Card className="p-4">
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase text-section-label">
          <HelpCircle size={16} />
          {t("settings.helpFaq")}
        </h3>
        <div className="space-y-2">
          {FAQ_KEYS.map((key, i) => (
            <div key={key} className="border-b border-border-light last:border-0">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="flex w-full items-center justify-between py-3 text-left text-sm font-medium text-text-primary"
              >
                {t(`settings.faq.${key}`)}
                <ChevronDown
                  size={16}
                  className={cn("shrink-0 transition-transform", openFaq === i && "rotate-180")}
                />
              </button>
              {openFaq === i && (
                <p className="pb-3 text-sm text-text-secondary">{t(`settings.faq.a${i + 1}`)}</p>
              )}
            </div>
          ))}
        </div>

        {/* Contact Support */}
        <a
          href="mailto:support@emovo.app"
          className="mt-4 flex items-center gap-2 text-sm font-medium text-brand-green hover:underline"
        >
          <Mail size={16} />
          {t("settings.contactSupport")}
        </a>
      </Card>
    </div>
  );
}
