import type { PostWithAuthor, GroupWithMembership } from "@emovo/shared";
import { create } from "zustand";

import {
  listFeedApi,
  likePostApi,
  unlikePostApi,
  deletePostApi,
  createPostApi,
  listMyGroupsApi,
  discoverGroupsApi,
  joinGroupApi,
  leaveGroupApi,
  createGroupApi,
} from "@/services/community.api";

interface CommunityState {
  // Posts / Feed
  posts: PostWithAuthor[];
  cursor: string | null;
  isLoading: boolean;
  hasMore: boolean;

  fetchFeed: (search?: string) => Promise<void>;
  fetchMore: (search?: string) => Promise<void>;
  createPost: (input: {
    content: string;
    moodScore?: number;
    type?: string;
    imageBase64?: string;
  }) => Promise<void>;
  toggleLike: (postId: string) => Promise<void>;
  removePost: (postId: string) => Promise<void>;
  reset: () => void;

  // Groups
  myGroups: GroupWithMembership[];
  discoverGroups: GroupWithMembership[];
  isLoadingGroups: boolean;

  fetchMyGroups: () => Promise<void>;
  fetchDiscoverGroups: (search?: string) => Promise<void>;
  joinGroup: (id: string) => Promise<void>;
  leaveGroup: (id: string) => Promise<void>;
  createGroup: (input: {
    name: string;
    description?: string;
    icon?: string;
    isPublic?: boolean;
  }) => Promise<void>;
}

export const useCommunityStore = create<CommunityState>((set, get) => ({
  // ── Posts / Feed ──────────────────────────────────────────────
  posts: [],
  cursor: null,
  isLoading: false,
  hasMore: true,

  fetchFeed: async (search?: string) => {
    set({ isLoading: true });
    try {
      const result = await listFeedApi({ limit: 20, search: search || undefined });
      set({
        posts: result.posts,
        cursor: result.cursor,
        hasMore: !!result.cursor,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchMore: async (search?: string) => {
    const { cursor, hasMore, isLoading } = get();
    if (!hasMore || isLoading || !cursor) return;

    set({ isLoading: true });
    try {
      const result = await listFeedApi({ cursor, limit: 20, search: search || undefined });
      set((state) => ({
        posts: [...state.posts, ...result.posts],
        cursor: result.cursor,
        hasMore: !!result.cursor,
        isLoading: false,
      }));
    } catch {
      set({ isLoading: false });
    }
  },

  createPost: async (input) => {
    const post = await createPostApi(input);
    set((state) => ({ posts: [post, ...state.posts] }));
  },

  toggleLike: async (postId: string) => {
    const post = get().posts.find((p) => p.id === postId);
    if (!post) return;

    // Optimistic update
    set((state) => ({
      posts: state.posts.map((p) =>
        p.id === postId
          ? {
              ...p,
              isLiked: !p.isLiked,
              likeCount: p.isLiked ? p.likeCount - 1 : p.likeCount + 1,
            }
          : p,
      ),
    }));

    try {
      if (post.isLiked) {
        await unlikePostApi(postId);
      } else {
        await likePostApi(postId);
      }
    } catch {
      // Revert on error
      set((state) => ({
        posts: state.posts.map((p) =>
          p.id === postId
            ? {
                ...p,
                isLiked: post.isLiked,
                likeCount: post.likeCount,
              }
            : p,
        ),
      }));
    }
  },

  removePost: async (postId: string) => {
    await deletePostApi(postId);
    set((state) => ({
      posts: state.posts.filter((p) => p.id !== postId),
    }));
  },

  reset: () => set({ posts: [], cursor: null, hasMore: true }),

  // ── Groups ────────────────────────────────────────────────────
  myGroups: [],
  discoverGroups: [],
  isLoadingGroups: false,

  fetchMyGroups: async () => {
    set({ isLoadingGroups: true });
    try {
      const groups = await listMyGroupsApi();
      set({ myGroups: groups, isLoadingGroups: false });
    } catch {
      set({ isLoadingGroups: false });
    }
  },

  fetchDiscoverGroups: async (search?: string) => {
    set({ isLoadingGroups: true });
    try {
      const result = await discoverGroupsApi({ limit: 30, search });
      set({ discoverGroups: result.groups, isLoadingGroups: false });
    } catch {
      set({ isLoadingGroups: false });
    }
  },

  joinGroup: async (id: string) => {
    await joinGroupApi(id);
    set((state) => {
      const group = state.discoverGroups.find((g) => g.id === id);
      const joined = group
        ? { ...group, isMember: true, role: "member" as const, memberCount: group.memberCount + 1 }
        : null;
      return {
        myGroups: joined ? [...state.myGroups, joined] : state.myGroups,
        discoverGroups: state.discoverGroups.map((g) =>
          g.id === id
            ? { ...g, isMember: true, role: "member" as const, memberCount: g.memberCount + 1 }
            : g,
        ),
      };
    });
  },

  leaveGroup: async (id: string) => {
    await leaveGroupApi(id);
    set((state) => ({
      myGroups: state.myGroups.filter((g) => g.id !== id),
      discoverGroups: state.discoverGroups.map((g) =>
        g.id === id
          ? { ...g, isMember: false, role: null, memberCount: Math.max(0, g.memberCount - 1) }
          : g,
      ),
    }));
  },

  createGroup: async (input) => {
    const group = await createGroupApi(input);
    set((state) => ({ myGroups: [group, ...state.myGroups] }));
  },
}));
