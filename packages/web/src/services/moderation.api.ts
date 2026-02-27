import type { ReportWithContext } from "@emovo/shared";

import { api } from "@/lib/api";

export async function createReportApi(input: {
  targetType: string;
  targetId: string;
  reason: string;
  description?: string | null;
}) {
  const { data } = await api.post("/moderation/reports", input);
  return data.data;
}

export async function listReportsApi(params: { status?: string; cursor?: string; limit?: number }) {
  const { data } = await api.get("/moderation/reports", { params });
  return {
    reports: data.data as ReportWithContext[],
    cursor: data.meta?.cursor ?? null,
  };
}

export async function getReportApi(id: string) {
  const { data } = await api.get(`/moderation/reports/${id}`);
  return data.data as ReportWithContext;
}

export async function resolveReportApi(
  id: string,
  input: {
    status: string;
    actionTaken?: string;
    adminNote?: string | null;
    suspendDays?: number;
  },
) {
  const { data } = await api.patch(`/moderation/reports/${id}`, input);
  return data.data;
}

export async function getReportStatsApi() {
  const { data } = await api.get("/moderation/reports/stats");
  return data.data as { pending: number };
}

export async function unbanUserApi(userId: string) {
  await api.post(`/moderation/users/${userId}/unban`);
}

// ── Admin User Management ────────────────────────────────────

export interface AdminUser {
  id: string;
  displayName: string;
  username: string | null;
  email: string;
  verificationTier: "none" | "verified" | "official";
  isAdmin: boolean;
  bannedAt: string | null;
  createdAt: string;
}

export async function listUsersApi(params: { q?: string; cursor?: string; limit?: number }) {
  const { data } = await api.get("/admin/users", { params });
  return {
    users: data.data as AdminUser[],
    cursor: data.meta?.cursor ?? null,
  };
}

export async function setVerificationApi(userId: string, tier: "none" | "verified" | "official") {
  const { data } = await api.patch(`/admin/users/${userId}/verification`, { tier });
  return data.data as AdminUser;
}
