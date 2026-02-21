import type { CreateMoodInput, UpdateMoodInput, ApiResponse, MoodCalendar } from "@emovo/shared";

import { api } from "./api";

export async function createMoodApi(input: CreateMoodInput) {
  const { data } = await api.post("/moods", input);
  return data.data;
}

export async function listMoodsApi(params: {
  cursor?: string;
  limit?: number;
  from?: string;
  to?: string;
}) {
  const { data } = await api.get("/moods", { params });
  return { entries: data.data, cursor: data.meta?.cursor ?? null };
}

export async function getMoodApi(id: string) {
  const { data } = await api.get(`/moods/${id}`);
  return data.data;
}

export async function updateMoodApi(id: string, input: UpdateMoodInput) {
  const { data } = await api.patch(`/moods/${id}`, input);
  return data.data;
}

export async function deleteMoodApi(id: string) {
  await api.delete(`/moods/${id}`);
}

export async function getMoodCalendarApi(month: string) {
  const { data } = await api.get<ApiResponse<MoodCalendar>>("/moods/calendar", {
    params: { month },
  });
  return data.data;
}
