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
} from "lucide-react";
import { useEffect, useState, useCallback } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { listReportsApi, resolveReportApi, getReportStatsApi } from "@/services/moderation.api";
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

export default function AdminPage() {
  const isAdmin = useAuthStore((s) => s.user?.isAdmin);

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
          <h1 className="text-2xl font-bold text-text-primary">Moderation</h1>
          <p className="text-sm text-text-secondary">Review and act on reported content</p>
        </div>
      </div>

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
