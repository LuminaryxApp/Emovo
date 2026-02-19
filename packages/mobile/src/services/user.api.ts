import type { User, UserProfile } from "@emovo/shared";

import { api } from "./api";

export async function getMeApi(): Promise<User> {
  const { data } = await api.get("/users/me");
  return data.data;
}

export async function updateProfileApi(updates: UserProfile): Promise<User> {
  const { data } = await api.patch("/users/me", updates);
  return data.data;
}

export async function deleteAccountApi(): Promise<void> {
  await api.delete("/users/me");
}

export interface Session {
  id: string;
  deviceName: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  current: boolean;
}

export async function getSessionsApi(currentSessionId?: string): Promise<Session[]> {
  const { data } = await api.get("/sessions", {
    headers: currentSessionId ? { "X-Session-Id": currentSessionId } : {},
  });
  return data.data;
}

export async function deleteSessionApi(id: string): Promise<void> {
  await api.delete(`/sessions/${id}`);
}
