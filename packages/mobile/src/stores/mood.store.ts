import type { MoodEntry, Trigger } from "@emovo/shared";
import type { CreateMoodInput } from "@emovo/shared";
import { create } from "zustand";

import { enqueueMoodEntry, flushQueue, getQueueLength } from "../lib/offline-queue";
import { createMoodApi, listMoodsApi } from "../services/mood.api";
import { listTriggersApi } from "../services/trigger.api";

interface MoodState {
  // Entries
  entries: MoodEntry[];
  nextCursor: string | null;
  isLoadingEntries: boolean;

  // Triggers
  triggers: Trigger[];
  isLoadingTriggers: boolean;

  // Offline
  offlineCount: number;

  // Actions
  logMood: (input: CreateMoodInput) => Promise<MoodEntry | null>;
  fetchEntries: (reset?: boolean) => Promise<void>;
  fetchMoreEntries: () => Promise<void>;
  fetchTriggers: () => Promise<void>;
  syncOffline: () => Promise<void>;
  refreshOfflineCount: () => Promise<void>;
}

export const useMoodStore = create<MoodState>((set, get) => ({
  entries: [],
  nextCursor: null,
  isLoadingEntries: false,
  triggers: [],
  isLoadingTriggers: false,
  offlineCount: 0,

  logMood: async (input) => {
    try {
      const entry = await createMoodApi(input);
      set((state) => ({
        entries: [entry, ...state.entries],
      }));
      return entry;
    } catch (err: unknown) {
      // If network error, queue for offline sync
      const isNetworkError =
        err instanceof Error &&
        (err.message.includes("Network Error") || err.message.includes("timeout"));
      if (isNetworkError) {
        await enqueueMoodEntry(input);
        set((state) => ({ offlineCount: state.offlineCount + 1 }));
        return null;
      }
      throw err;
    }
  },

  fetchEntries: async (reset = true) => {
    set({ isLoadingEntries: true });
    try {
      const result = await listMoodsApi({ limit: 20 });
      set({
        entries: reset ? result.entries : [...get().entries, ...result.entries],
        nextCursor: result.cursor,
      });
    } finally {
      set({ isLoadingEntries: false });
    }
  },

  fetchMoreEntries: async () => {
    const { nextCursor, isLoadingEntries, entries } = get();
    if (!nextCursor || isLoadingEntries) return;

    set({ isLoadingEntries: true });
    try {
      const result = await listMoodsApi({ cursor: nextCursor, limit: 20 });
      set({
        entries: [...entries, ...result.entries],
        nextCursor: result.cursor,
      });
    } finally {
      set({ isLoadingEntries: false });
    }
  },

  fetchTriggers: async () => {
    set({ isLoadingTriggers: true });
    try {
      const triggers = await listTriggersApi();
      set({ triggers });
    } finally {
      set({ isLoadingTriggers: false });
    }
  },

  syncOffline: async () => {
    const result = await flushQueue();
    if (result.synced > 0) {
      // Refresh entries after sync
      await get().fetchEntries();
    }
    set({ offlineCount: result.failed });
  },

  refreshOfflineCount: async () => {
    const count = await getQueueLength();
    set({ offlineCount: count });
  },
}));
