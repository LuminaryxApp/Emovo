import type {
  PostWithAuthor,
  Comment,
  GroupWithMembership,
  ConversationPreview,
  Message,
} from "@emovo/shared";

import { api } from "./api";

// ── Posts / Feed ──────────────────────────────────────────────

export async function createPostApi(input: { content: string; moodScore?: number; type?: string }) {
  const { data } = await api.post("/community/posts", input);
  return data.data as PostWithAuthor;
}

export async function listFeedApi(params: { cursor?: string; limit?: number }) {
  const { data } = await api.get("/community/feed", { params });
  return { posts: data.data as PostWithAuthor[], cursor: data.meta?.cursor ?? null };
}

export async function deletePostApi(id: string) {
  await api.delete(`/community/posts/${id}`);
}

// ── Likes ─────────────────────────────────────────────────────

export async function likePostApi(id: string) {
  const { data } = await api.post(`/community/posts/${id}/like`);
  return data.data;
}

export async function unlikePostApi(id: string) {
  await api.delete(`/community/posts/${id}/like`);
}

// ── Comments ──────────────────────────────────────────────────

export async function listCommentsApi(postId: string, params: { cursor?: string; limit?: number }) {
  const { data } = await api.get(`/community/posts/${postId}/comments`, { params });
  return { comments: data.data as Comment[], cursor: data.meta?.cursor ?? null };
}

export async function createCommentApi(postId: string, input: { content: string }) {
  const { data } = await api.post(`/community/posts/${postId}/comments`, input);
  return data.data as Comment;
}

// ── Groups ────────────────────────────────────────────────────

export async function createGroupApi(input: {
  name: string;
  description?: string;
  icon?: string;
  isPublic?: boolean;
}) {
  const { data } = await api.post("/community/groups", input);
  return data.data as GroupWithMembership;
}

export async function listMyGroupsApi() {
  const { data } = await api.get("/community/groups");
  return data.data as GroupWithMembership[];
}

export async function discoverGroupsApi(params: { cursor?: string; limit?: number }) {
  const { data } = await api.get("/community/groups/discover", { params });
  return { groups: data.data as GroupWithMembership[], cursor: data.meta?.cursor ?? null };
}

export async function joinGroupApi(id: string) {
  const { data } = await api.post(`/community/groups/${id}/join`);
  return data.data;
}

export async function leaveGroupApi(id: string) {
  await api.delete(`/community/groups/${id}/leave`);
}

// ── Conversations / Messages ──────────────────────────────────

export async function listConversationsApi(params: { cursor?: string; limit?: number }) {
  const { data } = await api.get("/community/conversations", { params });
  return { conversations: data.data as ConversationPreview[], cursor: data.meta?.cursor ?? null };
}

export async function createConversationApi(input: { participantIds: string[]; type?: string }) {
  const { data } = await api.post("/community/conversations", input);
  return data.data as ConversationPreview;
}

export async function listMessagesApi(
  conversationId: string,
  params: { cursor?: string; limit?: number },
) {
  const { data } = await api.get(`/community/conversations/${conversationId}/messages`, { params });
  return { messages: data.data as Message[], cursor: data.meta?.cursor ?? null };
}

export async function sendMessageApi(
  conversationId: string,
  input: { content: string; type?: string },
) {
  const { data } = await api.post(`/community/conversations/${conversationId}/messages`, input);
  return data.data as Message;
}

export async function markConversationReadApi(conversationId: string) {
  await api.patch(`/community/conversations/${conversationId}/read`);
}
