import type {
  PostWithAuthor,
  Comment,
  GroupWithMembership,
  ConversationPreview,
} from "@emovo/shared";
import { create } from "zustand";

import {
  createPostApi,
  listFeedApi,
  deletePostApi,
  likePostApi,
  unlikePostApi,
  listCommentsApi,
  createCommentApi,
  createGroupApi,
  listMyGroupsApi,
  discoverGroupsApi,
  joinGroupApi,
  leaveGroupApi,
  listConversationsApi,
  createConversationApi,
  markConversationReadApi,
} from "../services/community.api";

interface CommunityState {
  // Feed
  posts: PostWithAuthor[];
  feedCursor: string | null;
  isLoadingFeed: boolean;

  // Groups
  myGroups: GroupWithMembership[];
  discoverGroups: GroupWithMembership[];
  isLoadingGroups: boolean;

  // Conversations
  conversations: ConversationPreview[];
  isLoadingConversations: boolean;

  // Feed actions
  fetchFeed: (reset?: boolean) => Promise<void>;
  fetchMoreFeed: () => Promise<void>;
  createPost: (input: {
    content: string;
    moodScore?: number;
    type?: string;
  }) => Promise<PostWithAuthor>;
  deletePost: (id: string) => Promise<void>;
  toggleLike: (postId: string) => Promise<void>;

  // Comment actions
  fetchComments: (
    postId: string,
    cursor?: string,
  ) => Promise<{ comments: Comment[]; cursor: string | null }>;
  createComment: (postId: string, content: string) => Promise<Comment>;

  // Group actions
  fetchMyGroups: () => Promise<void>;
  fetchDiscoverGroups: () => Promise<void>;
  joinGroup: (id: string) => Promise<void>;
  leaveGroup: (id: string) => Promise<void>;
  createGroup: (input: {
    name: string;
    description?: string;
    icon?: string;
    isPublic?: boolean;
  }) => Promise<GroupWithMembership>;

  // Conversation actions
  fetchConversations: () => Promise<void>;
  createConversation: (participantIds: string[]) => Promise<ConversationPreview>;
  markAsRead: (conversationId: string) => Promise<void>;
}

export const useCommunityStore = create<CommunityState>((set, get) => ({
  // ── Initial state ───────────────────────────────────────────

  posts: [],
  feedCursor: null,
  isLoadingFeed: false,

  myGroups: [],
  discoverGroups: [],
  isLoadingGroups: false,

  conversations: [],
  isLoadingConversations: false,

  // ── Feed ────────────────────────────────────────────────────

  fetchFeed: async (reset = true) => {
    set({ isLoadingFeed: true });
    try {
      const result = await listFeedApi({ limit: 20 });
      set({
        posts: reset ? result.posts : [...get().posts, ...result.posts],
        feedCursor: result.cursor,
      });
    } finally {
      set({ isLoadingFeed: false });
    }
  },

  fetchMoreFeed: async () => {
    const { feedCursor, isLoadingFeed, posts } = get();
    if (!feedCursor || isLoadingFeed) return;

    set({ isLoadingFeed: true });
    try {
      const result = await listFeedApi({ cursor: feedCursor, limit: 20 });
      set({
        posts: [...posts, ...result.posts],
        feedCursor: result.cursor,
      });
    } finally {
      set({ isLoadingFeed: false });
    }
  },

  createPost: async (input) => {
    const post = await createPostApi(input);
    set((state) => ({ posts: [post, ...state.posts] }));
    return post;
  },

  deletePost: async (id) => {
    await deletePostApi(id);
    set((state) => ({ posts: state.posts.filter((p) => p.id !== id) }));
  },

  toggleLike: async (postId) => {
    const { posts } = get();
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    const wasLiked = post.isLiked;

    // Optimistic update
    set((state) => ({
      posts: state.posts.map((p) =>
        p.id === postId
          ? { ...p, isLiked: !wasLiked, likeCount: p.likeCount + (wasLiked ? -1 : 1) }
          : p,
      ),
    }));

    try {
      if (wasLiked) {
        await unlikePostApi(postId);
      } else {
        await likePostApi(postId);
      }
    } catch (e) {
      // Revert on error
      set((state) => ({
        posts: state.posts.map((p) =>
          p.id === postId
            ? { ...p, isLiked: wasLiked, likeCount: p.likeCount + (wasLiked ? 1 : -1) }
            : p,
        ),
      }));
      throw e;
    }
  },

  // ── Comments ────────────────────────────────────────────────

  fetchComments: async (postId, cursor) => {
    return listCommentsApi(postId, { cursor, limit: 20 });
  },

  createComment: async (postId, content) => {
    const comment = await createCommentApi(postId, { content });
    // Increment comment count on the post
    set((state) => ({
      posts: state.posts.map((p) =>
        p.id === postId ? { ...p, commentCount: p.commentCount + 1 } : p,
      ),
    }));
    return comment;
  },

  // ── Groups ──────────────────────────────────────────────────

  fetchMyGroups: async () => {
    set({ isLoadingGroups: true });
    try {
      const groups = await listMyGroupsApi();
      set({ myGroups: groups });
    } finally {
      set({ isLoadingGroups: false });
    }
  },

  fetchDiscoverGroups: async () => {
    set({ isLoadingGroups: true });
    try {
      const result = await discoverGroupsApi({ limit: 20 });
      set({ discoverGroups: result.groups });
    } finally {
      set({ isLoadingGroups: false });
    }
  },

  joinGroup: async (id) => {
    await joinGroupApi(id);
    // Move from discover to my groups
    set((state) => {
      const group = state.discoverGroups.find((g) => g.id === id);
      if (!group) return state;
      const updated: GroupWithMembership = {
        ...group,
        isMember: true,
        role: "member",
        memberCount: group.memberCount + 1,
      };
      return {
        myGroups: [...state.myGroups, updated],
        discoverGroups: state.discoverGroups.map((g) => (g.id === id ? updated : g)),
      };
    });
  },

  leaveGroup: async (id) => {
    await leaveGroupApi(id);
    set((state) => ({
      myGroups: state.myGroups.filter((g) => g.id !== id),
      discoverGroups: state.discoverGroups.map((g) =>
        g.id === id ? { ...g, isMember: false, role: null, memberCount: g.memberCount - 1 } : g,
      ),
    }));
  },

  createGroup: async (input) => {
    const group = await createGroupApi(input);
    set((state) => ({ myGroups: [group, ...state.myGroups] }));
    return group;
  },

  // ── Conversations ───────────────────────────────────────────

  fetchConversations: async () => {
    set({ isLoadingConversations: true });
    try {
      const result = await listConversationsApi({ limit: 30 });
      set({ conversations: result.conversations });
    } finally {
      set({ isLoadingConversations: false });
    }
  },

  createConversation: async (participantIds) => {
    const conversation = await createConversationApi({ participantIds });
    set((state) => ({ conversations: [conversation, ...state.conversations] }));
    return conversation;
  },

  markAsRead: async (conversationId) => {
    await markConversationReadApi(conversationId);
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, unreadCount: 0 } : c,
      ),
    }));
  },
}));
