import type { ReportWithContext } from "@emovo/shared";

import { api } from "./api";

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
