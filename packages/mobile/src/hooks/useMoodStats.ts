import { useState, useEffect, useCallback } from "react";

import { getStatsSummaryApi, getStatsTrendApi, getStatsTriggersApi } from "../services/stats.api";

type Period = "week" | "month" | "year";

interface Summary {
  avgMood: number;
  entryCount: number;
  moodDistribution: Record<number, number>;
  topTriggers: Array<{
    trigger: { name: string; icon: string | null };
    count: number;
    avgMood: number;
  }>;
}

interface Trend {
  dataPoints: Array<{ date: string; avgMood: number; count: number }>;
}

interface TriggerBreakdown {
  trigger: { name: string };
  count: number;
  avgMood: number;
}

export function useMoodStats(period: Period) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [trend, setTrend] = useState<Trend | null>(null);
  const [triggers, setTriggers] = useState<TriggerBreakdown[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const [summaryData, trendData, triggersData] = await Promise.all([
        getStatsSummaryApi({ period }),
        getStatsTrendApi({ period }),
        getStatsTriggersApi({ period }),
      ]);
      setSummary(summaryData);
      setTrend(trendData);
      setTriggers(triggersData.triggerBreakdown || []);
    } catch {
      // Silent fail — show empty state
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    summary,
    trend,
    triggers,
    isLoading,
    refresh: fetchStats,
  };
}
