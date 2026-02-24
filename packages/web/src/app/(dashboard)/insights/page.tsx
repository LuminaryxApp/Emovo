"use client";

import type { MoodStats, MoodTrend, TriggerBreakdown } from "@emovo/shared";
import { BarChart3 } from "lucide-react";
import { useEffect, useState } from "react";

import { MoodBarChart } from "@/components/charts/mood-bar-chart";
import { MoodLineChart } from "@/components/charts/mood-line-chart";
import { PeriodSelector } from "@/components/charts/period-selector";
import { TriggerPieChart } from "@/components/charts/trigger-pie-chart";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { getStatsSummaryApi, getStatsTrendApi, getStatsTriggersApi } from "@/services/stats.api";
import { MOOD_EMOJIS, MOOD_HEX } from "@/theme/constants";

export default function InsightsPage() {
  const [period, setPeriod] = useState("week");
  const [stats, setStats] = useState<MoodStats | null>(null);
  const [trend, setTrend] = useState<MoodTrend | null>(null);
  const [triggers, setTriggers] = useState<TriggerBreakdown | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getStatsSummaryApi({ period }),
      getStatsTrendApi({ period }),
      getStatsTriggersApi({ period }),
    ])
      .then(([s, t, tr]) => {
        setStats(s);
        setTrend(t);
        setTriggers(tr);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [period]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-48" />
        </div>
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!stats || stats.entryCount === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-text-primary">Insights</h1>
          <PeriodSelector value={period} onChange={setPeriod} />
        </div>
        <EmptyState
          icon={<BarChart3 size={40} />}
          title="No data yet"
          description="Log some moods to see your insights here."
        />
      </div>
    );
  }

  const dominantMood = stats.moodDistribution
    ? Object.entries(stats.moodDistribution).reduce(
        (max, [k, v]) => ((v as number) > max[1] ? [Number(k), v as number] : max),
        [3, 0],
      )[0]
    : 3;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Insights</h1>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* Mood Overview */}
      <Card className="p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase text-section-label">Mood Overview</h2>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <span className="text-4xl">{MOOD_EMOJIS[dominantMood]}</span>
            <p className="mt-1 text-2xl font-bold text-text-primary">{stats.avgMood.toFixed(1)}</p>
            <p className="text-xs text-text-secondary">out of 5</p>
          </div>
          <div className="flex-1 space-y-2">
            {[5, 4, 3, 2, 1].map((level) => {
              const count =
                (stats.moodDistribution as Record<string, number>)?.[String(level)] || 0;
              return (
                <div key={level} className="flex items-center gap-2 text-xs">
                  <span className="w-6">{MOOD_EMOJIS[level]}</span>
                  <ProgressBar
                    value={count}
                    max={stats.entryCount}
                    color={MOOD_HEX[level]}
                    className="flex-1"
                  />
                  <span className="w-6 text-right text-text-tertiary">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
        <p className="mt-4 text-center text-sm text-text-secondary">
          {stats.entryCount} entries this {period}
        </p>
      </Card>

      {/* Charts grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Distribution chart */}
        <Card className="p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase text-section-label">
            Mood Distribution
          </h2>
          <MoodBarChart distribution={(stats.moodDistribution as Record<number, number>) || {}} />
        </Card>

        {/* Trend chart */}
        <Card className="p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase text-section-label">Mood Trend</h2>
          {trend && trend.dataPoints.length > 0 ? (
            <MoodLineChart data={trend.dataPoints} />
          ) : (
            <p className="py-8 text-center text-sm text-text-tertiary">Not enough data</p>
          )}
        </Card>
      </div>

      {/* Trigger breakdown */}
      {triggers && triggers.triggerBreakdown.length > 0 && (
        <Card className="p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase text-section-label">
            Trigger Breakdown
          </h2>
          <TriggerPieChart data={triggers.triggerBreakdown} />
        </Card>
      )}
    </div>
  );
}
