"use client";

import type { ReportWithContext, ReportAction, ReportStatus } from "@emovo/shared";
import { formatDistanceToNow } from "date-fns";
import {
  Shield,
  Clock,
  Eye,
  CheckCircle,
  XCircle,
  Gavel,
  FileText,
  MessageSquare,
  User,
  Mail,
  Trash2,
  AlertTriangle,
  UserX,
  Ban,
  Users,
  Search,
  BadgeCheck,
} from "lucide-react";
import { useEffect, useState, useCallback, useRef } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  listReportsApi,
  resolveReportApi,
  getReportStatsApi,
  listUsersApi,
  setVerificationApi,
  type AdminUser,
} from "@/services/moderation.api";
import { useAuthStore } from "@/stores/auth.store";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

type FilterTab = "all" | "pending" | "reviewed" | "actioned" | "dismissed";

const TABS: { value: FilterTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "reviewed", label: "Reviewed" },
  { value: "actioned", label: "Actioned" },
  { value: "dismissed", label: "Dismissed" },
];

const STATUS_COLOR_STRIP: Record<string, string> = {
  pending: "bg-amber-500",
  reviewed: "bg-blue-500",
  actioned: "bg-green-600",
  dismissed: "bg-gray-400",
};

const TARGET_TYPE_META: Record<string, { label: string; icon: React.ReactNode }> = {
  post: { label: "Post", icon: <FileText size={12} /> },
  comment: { label: "Comment", icon: <MessageSquare size={12} /> },
  user: { label: "User", icon: <User size={12} /> },
  message: { label: "Message", icon: <Mail size={12} /> },
};

const REASON_COLORS: Record<string, string> = {
  spam: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
  harassment: "bg-red-500/10 text-red-600 dark:text-red-400",
  hate_speech: "bg-red-700/10 text-red-700 dark:text-red-400",
  inappropriate: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  self_harm: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  other: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
};

function reasonLabel(reason: string) {
  return reason.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

type PageTab = "moderation" | "users";

export default function AdminPage() {
  const isAdmin = useAuthStore((s) => s.user?.isAdmin);
  const [pageTab, setPageTab] = useState<PageTab>("moderation");

  /* ---- data state ---- */
  const [allReports, setAllReports] = useState<ReportWithContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingCountFromApi, setPendingCountFromApi] = useState(0);

  /* ---- UI state ---- */
  const [activeTab, setActiveTab] = useState<FilterTab>("pending");
  const [resolveTarget, setResolveTarget] = useState<ReportWithContext | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [resolving, setResolving] = useState(false);

  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  /* ---- load reports ---- */
  const fetchReports = useCallback(() => {
    if (!isAdmin) return;
    setLoading(true);
    setCursor(null);
    listReportsApi({ limit: 50 })
      .then((r) => {
        setAllReports(r.reports);
        setCursor(r.cursor);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    getReportStatsApi()
      .then((s) => setPendingCountFromApi(s.pending))
      .catch(() => {});
  }, [isAdmin]);

  const loadMore = useCallback(() => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    listReportsApi({ limit: 50, cursor })
      .then((r) => {
        setAllReports((prev) => [...prev, ...r.reports]);
        setCursor(r.cursor);
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  }, [cursor, loadingMore]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  /* ---- derived counts ---- */
  const counts = {
    pending: pendingCountFromApi || allReports.filter((r) => r.status === "pending").length,
    reviewed: allReports.filter((r) => r.status === "reviewed").length,
    actioned: allReports.filter((r) => r.status === "actioned").length,
    dismissed: allReports.filter((r) => r.status === "dismissed").length,
  };

  /* ---- filtered list ---- */
  const filtered =
    activeTab === "all" ? allReports : allReports.filter((r) => r.status === activeTab);

  /* ---- resolve handler ---- */
  const handleResolve = async (actionTaken: string) => {
    if (!resolveTarget) return;
    setResolving(true);
    try {
      const status: ReportStatus = actionTaken === "dismissed" ? "dismissed" : "actioned";
      const action = actionTaken as ReportAction;
      await resolveReportApi(resolveTarget.id, {
        status,
        actionTaken,
        adminNote: adminNote.trim() || null,
      });
      setAllReports((prev) =>
        prev.map((r) =>
          r.id === resolveTarget.id
            ? { ...r, status, actionTaken: action, adminNote: adminNote.trim() || null }
            : r,
        ),
      );
      if (status === "dismissed" || status === "actioned") {
        setPendingCountFromApi((c) => Math.max(0, c - 1));
      }
      setResolveTarget(null);
      setAdminNote("");
    } catch {
      // Resolve failed
    } finally {
      setResolving(false);
    }
  };

  /* ---- access guard ---- */
  if (!isAdmin) {
    return (
      <EmptyState
        icon={<Shield size={40} />}
        title="Access Denied"
        description="You do not have admin access."
      />
    );
  }

  /* ================================================================ */
  /*  Render                                                          */
  /* ================================================================ */

  return (
    <div className="space-y-8">
      {/* ---- Page Header ---- */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-brand-green/10">
          <Shield size={20} className="text-brand-green" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Admin Panel</h1>
          <p className="text-sm text-text-secondary">Manage moderation and users</p>
        </div>
      </div>

      {/* ---- Top-level Tabs ---- */}
      <div className="border-b border-border-default">
        <nav className="-mb-px flex gap-6">
          <button
            onClick={() => setPageTab("moderation")}
            className={`relative flex items-center gap-2 whitespace-nowrap pb-3 text-sm font-semibold transition-colors ${
              pageTab === "moderation"
                ? "text-brand-green"
                : "text-text-tertiary hover:text-text-secondary"
            }`}
          >
            <Gavel size={16} />
            Moderation
            {pendingCountFromApi > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[11px] font-bold text-white">
                {pendingCountFromApi}
              </span>
            )}
            {pageTab === "moderation" && (
              <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-brand-green" />
            )}
          </button>
          <button
            onClick={() => setPageTab("users")}
            className={`relative flex items-center gap-2 whitespace-nowrap pb-3 text-sm font-semibold transition-colors ${
              pageTab === "users"
                ? "text-brand-green"
                : "text-text-tertiary hover:text-text-secondary"
            }`}
          >
            <Users size={16} />
            Users
            {pageTab === "users" && (
              <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-brand-green" />
            )}
          </button>
        </nav>
      </div>

      {pageTab === "users" && <UsersPanel />}

      {pageTab === "moderation" && (
        <>
          {/* ============================================================ */}
          {/*  Stats Overview                                              */}
          {/* ============================================================ */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              icon={<Clock size={20} />}
              count={counts.pending}
              label="Pending"
              color="amber"
              loading={loading}
            />
            <StatCard
              icon={<Eye size={20} />}
              count={counts.reviewed}
              label="Reviewed"
              color="blue"
              loading={loading}
            />
            <StatCard
              icon={<CheckCircle size={20} />}
              count={counts.actioned}
              label="Actioned"
              color="green"
              loading={loading}
            />
            <StatCard
              icon={<XCircle size={20} />}
              count={counts.dismissed}
              label="Dismissed"
              color="gray"
              loading={loading}
            />
          </div>

          {/* ============================================================ */}
          {/*  Filter Tabs                                                 */}
          {/* ============================================================ */}
          <div className="border-b border-border-default">
            <nav className="-mb-px flex gap-6" aria-label="Report status filter">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.value;
                return (
                  <button
                    key={tab.value}
                    onClick={() => setActiveTab(tab.value)}
                    className={`relative whitespace-nowrap pb-3 text-sm font-semibold transition-colors ${
                      isActive ? "text-brand-green" : "text-text-tertiary hover:text-text-secondary"
                    }`}
                  >
                    {tab.label}
                    {tab.value === "pending" && counts.pending > 0 && (
                      <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[11px] font-bold text-white">
                        {counts.pending}
                      </span>
                    )}
                    {isActive && (
                      <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-brand-green" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* ============================================================ */}
          {/*  Report List                                                 */}
          {/* ============================================================ */}
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<CheckCircle size={40} />}
              title="No reports"
              description={
                activeTab === "all"
                  ? "There are no reports to display."
                  : `No ${activeTab} reports right now.`
              }
            />
          ) : (
            <div className="space-y-4 animate-stagger">
              {filtered.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  onTakeAction={() => {
                    setResolveTarget(report);
                    setAdminNote("");
                  }}
                />
              ))}
              {cursor && activeTab === "all" && (
                <div className="flex justify-center pt-4">
                  <Button variant="secondary" onClick={loadMore} disabled={loadingMore}>
                    {loadingMore ? "Loading..." : "Load More Reports"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ============================================================ */}
      {/*  Action Modal                                                */}
      {/* ============================================================ */}
      <Modal
        open={!!resolveTarget}
        onClose={() => {
          setResolveTarget(null);
          setAdminNote("");
        }}
        title="Moderate Report"
        className="max-w-xl"
      >
        {resolveTarget && (
          <div className="space-y-5">
            {/* Content preview */}
            {resolveTarget.targetContent && (
              <div className="rounded-[var(--radius-md)] border border-border-light bg-input-bg p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                  Reported content
                </p>
                <p className="mt-1 text-sm text-text-primary line-clamp-4">
                  {resolveTarget.targetContent}
                </p>
              </div>
            )}

            {/* Admin note */}
            <Textarea
              label="Admin Notes"
              placeholder="Add context or reasoning for this action..."
              rows={3}
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
            />

            {/* Action buttons grid */}
            <div>
              <p className="mb-2 text-sm font-semibold text-text-secondary">Choose action</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <ActionButton
                  label="Dismiss"
                  icon={<XCircle size={18} />}
                  className="border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  disabled={resolving}
                  onClick={() => handleResolve("dismissed")}
                />
                <ActionButton
                  label="Remove Content"
                  icon={<Trash2 size={18} />}
                  className="border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-600 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50"
                  disabled={resolving}
                  onClick={() => handleResolve("content_removed")}
                />
                <ActionButton
                  label="Warn User"
                  icon={<AlertTriangle size={18} />}
                  className="border-yellow-300 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 dark:border-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400 dark:hover:bg-yellow-900/50"
                  disabled={resolving}
                  onClick={() => handleResolve("user_warned")}
                />
                <ActionButton
                  label="Suspend User"
                  icon={<UserX size={18} />}
                  className="border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100 dark:border-orange-600 dark:bg-orange-900/30 dark:text-orange-400 dark:hover:bg-orange-900/50"
                  disabled={resolving}
                  onClick={() => handleResolve("user_suspended")}
                />
                <ActionButton
                  label="Ban User"
                  icon={<Ban size={18} />}
                  className="border-red-300 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-600 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                  disabled={resolving}
                  onClick={() => handleResolve("user_banned")}
                />
              </div>
            </div>

            {/* Cancel */}
            <div className="flex justify-end border-t border-border-light pt-4">
              <Button
                variant="ghost"
                onClick={() => {
                  setResolveTarget(null);
                  setAdminNote("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ================================================================== */
/*  Stat Card                                                         */
/* ================================================================== */

function StatCard({
  icon,
  count,
  label,
  color,
  loading,
}: {
  icon: React.ReactNode;
  count: number;
  label: string;
  color: "amber" | "blue" | "green" | "gray";
  loading: boolean;
}) {
  const colorMap = {
    amber: {
      bg: "bg-amber-500/10",
      text: "text-amber-600 dark:text-amber-400",
      icon: "text-amber-500",
    },
    blue: {
      bg: "bg-blue-500/10",
      text: "text-blue-600 dark:text-blue-400",
      icon: "text-blue-500",
    },
    green: {
      bg: "bg-green-600/10",
      text: "text-green-600 dark:text-green-400",
      icon: "text-green-600 dark:text-green-500",
    },
    gray: {
      bg: "bg-gray-500/10",
      text: "text-gray-600 dark:text-gray-400",
      icon: "text-gray-500",
    },
  };
  const c = colorMap[color];

  return (
    <Card className="relative overflow-hidden p-4">
      <div className="flex items-start justify-between">
        <div>
          {loading ? (
            <Skeleton className="mb-1 h-8 w-12" />
          ) : (
            <p className={`text-3xl font-bold ${c.text}`}>{count}</p>
          )}
          <p className="mt-1 text-sm font-semibold text-text-secondary">{label}</p>
        </div>
        <div className={`flex h-9 w-9 items-center justify-center rounded-full ${c.bg}`}>
          <span className={c.icon}>{icon}</span>
        </div>
      </div>
    </Card>
  );
}

/* ================================================================== */
/*  Report Card                                                       */
/* ================================================================== */

function ReportCard({
  report,
  onTakeAction,
}: {
  report: ReportWithContext;
  onTakeAction: () => void;
}) {
  const strip = STATUS_COLOR_STRIP[report.status] ?? "bg-gray-400";
  const typeMeta = TARGET_TYPE_META[report.targetType] ?? {
    label: report.targetType,
    icon: <FileText size={12} />,
  };
  const reasonColor =
    REASON_COLORS[report.reason] ?? "bg-gray-500/10 text-gray-600 dark:text-gray-400";

  return (
    <Card className="relative overflow-hidden p-0 animate-fade-in">
      <div className="flex">
        {/* Left color strip */}
        <div className={`w-1 shrink-0 rounded-l-[var(--radius-lg)] ${strip}`} />

        {/* Content */}
        <div className="flex-1 p-4">
          {/* Header */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Target type badge */}
            <span className="inline-flex items-center gap-1 rounded-full bg-surface-elevated px-2.5 py-0.5 text-xs font-semibold text-text-secondary">
              {typeMeta.icon}
              {typeMeta.label}
            </span>

            {/* Reason badge */}
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${reasonColor}`}
            >
              {reasonLabel(report.reason)}
            </span>

            {/* Status badge for non-pending */}
            {report.status !== "pending" && (
              <Badge variant="muted" className="capitalize">
                {report.status}
              </Badge>
            )}

            {/* Timestamp */}
            <span className="ml-auto text-xs text-text-tertiary">
              {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}
            </span>
          </div>

          {/* Content preview */}
          {report.targetContent && (
            <p className="mt-2.5 text-sm leading-relaxed text-text-primary line-clamp-2">
              {report.targetContent}
            </p>
          )}

          {/* Description (reporter note) */}
          {report.description && (
            <p className="mt-1.5 text-xs italic text-text-tertiary line-clamp-1">
              &ldquo;{report.description}&rdquo;
            </p>
          )}

          {/* Footer */}
          <div className="mt-3 flex items-center justify-between">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-tertiary">
              <span>
                Reported by:{" "}
                <span className="font-semibold text-text-secondary">
                  {report.reporter?.displayName ?? "Unknown"}
                </span>
              </span>
              {report.targetAuthor && (
                <span>
                  Author:{" "}
                  <span className="font-semibold text-text-secondary">
                    {report.targetAuthor.displayName}
                  </span>
                </span>
              )}
            </div>

            {report.status === "pending" && (
              <Button size="sm" variant="secondary" onClick={onTakeAction}>
                <Gavel size={14} className="mr-1.5" />
                Take Action
              </Button>
            )}

            {report.status !== "pending" && report.actionTaken && (
              <span className="text-xs font-semibold text-text-tertiary">
                {report.actionTaken.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ================================================================== */
/*  Action Button (modal)                                              */
/* ================================================================== */

function ActionButton({
  label,
  icon,
  className,
  disabled,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  className: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`flex items-center gap-2 rounded-[var(--radius-md)] border px-3 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${className}`}
    >
      {icon}
      {label}
    </button>
  );
}

/* ================================================================== */
/*  Verification Badge (web)                                           */
/* ================================================================== */

const TIER_META: Record<string, { label: string; color: string; bg: string }> = {
  none: { label: "None", color: "text-text-tertiary", bg: "bg-gray-500/10" },
  verified: { label: "Verified", color: "text-[#6F98B8]", bg: "bg-[#6F98B8]/10" },
  official: { label: "Official", color: "text-brand-green", bg: "bg-brand-green/10" },
};

function VerificationBadgeWeb({ tier }: { tier: string }) {
  if (tier === "none") return null;
  const meta = TIER_META[tier] ?? TIER_META.none;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${meta.bg} ${meta.color}`}
    >
      <BadgeCheck size={12} />
      {meta.label}
    </span>
  );
}

/* ================================================================== */
/*  Users Panel                                                        */
/* ================================================================== */

function UsersPanel() {
  const [usersList, setUsersList] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [userSearch, setUserSearch] = useState("");
  const [userCursor, setUserCursor] = useState<string | null>(null);
  const [loadingMoreUsers, setLoadingMoreUsers] = useState(false);
  const [changingTier, setChangingTier] = useState<string | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchUsers = useCallback((q?: string) => {
    setLoadingUsers(true);
    setUserCursor(null);
    listUsersApi({ q: q || undefined, limit: 20 })
      .then((r) => {
        setUsersList(r.users);
        setUserCursor(r.cursor);
      })
      .catch(() => {})
      .finally(() => setLoadingUsers(false));
  }, []);

  const loadMoreUsers = useCallback(() => {
    if (!userCursor || loadingMoreUsers) return;
    setLoadingMoreUsers(true);
    listUsersApi({ q: userSearch || undefined, cursor: userCursor, limit: 20 })
      .then((r) => {
        setUsersList((prev) => [...prev, ...r.users]);
        setUserCursor(r.cursor);
      })
      .catch(() => {})
      .finally(() => setLoadingMoreUsers(false));
  }, [userCursor, loadingMoreUsers, userSearch]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearchChange = (value: string) => {
    setUserSearch(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => fetchUsers(value), 300);
  };

  const handleTierChange = async (userId: string, newTier: "none" | "verified" | "official") => {
    setChangingTier(userId);
    try {
      const updated = await setVerificationApi(userId, newTier);
      setUsersList((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, verificationTier: updated.verificationTier } : u,
        ),
      );
    } catch {
      // Failed to update
    } finally {
      setChangingTier(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
        <input
          type="text"
          placeholder="Search by name, username, or email..."
          value={userSearch}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full rounded-[var(--radius-md)] border border-border-default bg-input-bg py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-tertiary focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
        />
      </div>

      {/* User list */}
      {loadingUsers ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : usersList.length === 0 ? (
        <EmptyState
          icon={<Users size={40} />}
          title="No users found"
          description="Try a different search term."
        />
      ) : (
        <div className="space-y-2">
          {usersList.map((u) => (
            <Card key={u.id} className="p-4">
              <div className="flex items-center gap-4">
                {/* User info */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-green/10 text-sm font-bold text-brand-green">
                  {u.displayName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-text-primary">
                      {u.displayName}
                    </span>
                    <VerificationBadgeWeb tier={u.verificationTier} />
                    {u.isAdmin && (
                      <span className="rounded-full bg-brand-green/10 px-2 py-0.5 text-[10px] font-bold uppercase text-brand-green">
                        Admin
                      </span>
                    )}
                    {u.bannedAt && (
                      <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-red-500">
                        Banned
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-text-tertiary">
                    {u.username && <span>@{u.username}</span>}
                    <span>{u.email}</span>
                  </div>
                </div>

                {/* Verification dropdown */}
                <select
                  value={u.verificationTier}
                  disabled={changingTier === u.id}
                  onChange={(e) =>
                    handleTierChange(u.id, e.target.value as "none" | "verified" | "official")
                  }
                  className="rounded-[var(--radius-md)] border border-border-default bg-input-bg px-3 py-1.5 text-xs font-semibold text-text-primary focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green disabled:opacity-50"
                >
                  <option value="none">No Badge</option>
                  <option value="verified">✓ Verified</option>
                  <option value="official">★ Official</option>
                </select>
              </div>
            </Card>
          ))}

          {userCursor && (
            <div className="flex justify-center pt-4">
              <Button variant="secondary" onClick={loadMoreUsers} disabled={loadingMoreUsers}>
                {loadingMoreUsers ? "Loading..." : "Load More Users"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
