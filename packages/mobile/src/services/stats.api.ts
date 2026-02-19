import { api } from "./api";

export async function getStatsSummaryApi(params: { period?: string; date?: string }) {
  const { data } = await api.get("/stats/summary", { params });
  return data.data;
}

export async function getStatsTrendApi(params: { period?: string; date?: string }) {
  const { data } = await api.get("/stats/trend", { params });
  return data.data;
}

export async function getStatsTriggersApi(params: { period?: string; date?: string }) {
  const { data } = await api.get("/stats/triggers", { params });
  return data.data;
}
