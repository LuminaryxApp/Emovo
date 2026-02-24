import type { PublicProfile, FollowListItem, FollowRequest } from "@emovo/shared";

import { api } from "@/lib/api";

export async function getPublicProfileApi(userId: string): Promise<PublicProfile> {
  const { data } = await api.get(`/users/${userId}/profile`);
  return data.data;
}

export async function followUserApi(userId: string): Promise<{ status: "accepted" | "pending" }> {
  const { data } = await api.post(`/users/${userId}/follow`);
  return data.data;
}

export async function unfollowUserApi(userId: string): Promise<void> {
  await api.delete(`/users/${userId}/follow`);
}

export async function getFollowersApi(
  userId: string,
  params: { cursor?: string; limit?: number },
): Promise<{ items: FollowListItem[]; cursor: string | null }> {
  const { data } = await api.get(`/users/${userId}/followers`, { params });
  return { items: data.data, cursor: data.meta?.cursor ?? null };
}

export async function getFollowingApi(
  userId: string,
  params: { cursor?: string; limit?: number },
): Promise<{ items: FollowListItem[]; cursor: string | null }> {
  const { data } = await api.get(`/users/${userId}/following`, { params });
  return { items: data.data, cursor: data.meta?.cursor ?? null };
}

export async function getFollowRequestsApi(params: {
  cursor?: string;
  limit?: number;
}): Promise<{ items: FollowRequest[]; cursor: string | null }> {
  const { data } = await api.get("/users/me/follow-requests", { params });
  return { items: data.data, cursor: data.meta?.cursor ?? null };
}

export async function getFollowRequestCountApi(): Promise<number> {
  const { data } = await api.get("/users/me/follow-requests/count");
  return data.data.count;
}

export async function acceptFollowRequestApi(requestId: string): Promise<void> {
  await api.post(`/users/me/follow-requests/${requestId}/accept`);
}

export async function declineFollowRequestApi(requestId: string): Promise<void> {
  await api.delete(`/users/me/follow-requests/${requestId}`);
}
