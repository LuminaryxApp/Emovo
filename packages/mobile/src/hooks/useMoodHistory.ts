import { useEffect, useCallback } from "react";

import { useMoodStore } from "../stores/mood.store";

export function useMoodHistory() {
  const entries = useMoodStore((s) => s.entries);
  const nextCursor = useMoodStore((s) => s.nextCursor);
  const isLoading = useMoodStore((s) => s.isLoadingEntries);
  const fetchEntries = useMoodStore((s) => s.fetchEntries);
  const fetchMore = useMoodStore((s) => s.fetchMoreEntries);

  useEffect(() => {
    fetchEntries(true);
  }, [fetchEntries]);

  const refresh = useCallback(() => {
    return fetchEntries(true);
  }, [fetchEntries]);

  const loadMore = useCallback(() => {
    if (nextCursor && !isLoading) {
      fetchMore();
    }
  }, [nextCursor, isLoading, fetchMore]);

  return {
    entries,
    isLoading,
    hasMore: !!nextCursor,
    refresh,
    loadMore,
  };
}
