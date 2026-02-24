import type { MoodEntry } from "@emovo/shared";
import { create } from "zustand";

import { createMoodApi, listMoodsApi } from "@/services/mood.api";
import { listTriggersApi, TriggerResponse } from "@/services/trigger.api";

interface MoodState {
  entries: MoodEntry[];
  triggers: TriggerResponse[];
  cursor: string | null;
  isLoading: boolean;
  hasMore: boolean;

  fetchEntries: (params?: { from?: string; to?: string }) => Promise<void>;
  fetchMoreEntries: () => Promise<void>;
  fetchTriggers: () => Promise<void>;
  logMood: (input: {
    moodScore: number;
    note?: string;
    triggerIds?: string[];
    clientEntryId: string;
    loggedAt?: string;
  }) => Promise<void>;
  reset: () => void;
}

export const useMoodStore = create<MoodState>((set, get) => ({
  entries: [],
  triggers: [],
  cursor: null,
  isLoading: false,
  hasMore: true,

  fetchEntries: async (params) => {
    set({ isLoading: true });
    try {
      const result = await listMoodsApi({ ...params, limit: 20 });
      set({
        entries: result.entries,
        cursor: result.cursor,
        hasMore: !!result.cursor,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchMoreEntries: async () => {
    const { cursor, hasMore, isLoading } = get();
    if (!hasMore || isLoading || !cursor) return;

    set({ isLoading: true });
    try {
      const result = await listMoodsApi({ cursor, limit: 20 });
      set((state) => ({
        entries: [...state.entries, ...result.entries],
        cursor: result.cursor,
        hasMore: !!result.cursor,
        isLoading: false,
      }));
    } catch {
      set({ isLoading: false });
    }
  },

  fetchTriggers: async () => {
    try {
      const triggers = await listTriggersApi();
      set({ triggers });
    } catch {
      // Ignore
    }
  },

  logMood: async (input) => {
    const entry = await createMoodApi(input);
    set((state) => ({
      entries: [entry, ...state.entries],
    }));
  },

  reset: () => set({ entries: [], cursor: null, hasMore: true }),
}));
