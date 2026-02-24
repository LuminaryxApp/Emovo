import type { Notification } from "@emovo/shared";

import { api } from "@/lib/api";

export async function listNotificationsApi(params: { cursor?: string; limit?: number }) {
  const { data } = await api.get("/notifications", { params });
  return {
    notifications: data.data as Notification[],
    cursor: data.meta?.cursor ?? null,
  };
}

export async function markNotificationReadApi(id: string) {
  await api.patch(`/notifications/${id}/read`);
}

export async function getUnreadCountApi(): Promise<number> {
  const { data } = await api.get("/notifications/unread-count");
  return data.data.count;
}
