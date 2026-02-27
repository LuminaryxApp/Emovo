import { MOOD_SCALE } from "@emovo/shared";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { MoodTrendChart } from "../../src/components/charts/MoodTrendChart";
import { PeriodSelector } from "../../src/components/charts/PeriodSelector";
import { TriggerBreakdown } from "../../src/components/charts/TriggerBreakdown";
import { ProgressBar } from "../../src/components/ui";
import { useMoodStats } from "../../src/hooks/useMoodStats";
import { moodEmojis, moodLabels, getMoodGradient, type MoodLevel } from "../../src/theme";
import { useTheme } from "../../src/theme/ThemeContext";
import { cardShadow, cardShadowStrong } from "../../src/theme/colors";
import { spacing, radii, screenPadding, iconSizes } from "../../src/theme/spacing";

type Period = "week" | "month" | "year";

export default function InsightsScreen() {
  const { t } = useTranslation();
  const { colors, gradients } = useTheme();
  const [period, setPeriod] = useState<Period>("week");
  const { summary, trend, triggers, isLoading, refresh } = useMoodStats(period);

  const PERIOD_LABELS: Record<Period, string> = {
    week: t("insights.thisWeek"),
    month: t("insights.thisMonth"),
    year: t("insights.thisYear"),
  };

  const PERIOD_HINT: Record<Period, string> = {
    week: t("insights.periodHint.week"),
    month: t("insights.periodHint.month"),
    year: t("insights.periodHint.year"),
  };

  const getMoodForScore = (score: number) => {
    return MOOD_SCALE.find((m) => m.score === Math.round(score)) || MOOD_SCALE[2];
  };

  const hasData = summary && summary.entryCount > 0;

  // Convert moodDistribution to percentages
  const getMoodDistributionRows = () => {
    if (!summary?.moodDistribution) return [];
    const total = summary.entryCount;
    if (total === 0) return [];

    return ([5, 4, 3, 2, 1] as MoodLevel[]).map((level) => {
      const count = summary.moodDistribution[level] || 0;
      const percentage = (count / total) * 100;
      return { level, count, percentage };
    });
  };

  // Find best mood day from trend
  const bestDay = useMemo(() => {
    if (!trend || trend.dataPoints.length === 0) return null;
    let best = trend.dataPoints[0];
    for (const dp of trend.dataPoints) {
      if (dp.avgMood > best.avgMood) best = dp;
    }
    const date = new Date(best.date);
    return {
      label: date.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
      mood: best.avgMood,
    };
  }, [trend]);

  // Compute insights from actual data
  const computedInsights = useMemo(() => {
    const insights: Array<{
      icon: keyof typeof Ionicons.glyphMap;
      color: string;
      gradientColors: readonly [string, string];
      title: string;
      description: string;
    }> = [];

    if (!summary || summary.entryCount === 0) return insights;

    // 1. Mood trend insight
    if (trend && trend.dataPoints.length >= 2) {
      const pts = trend.dataPoints;
      const recentHalf = pts.slice(Math.floor(pts.length / 2));
      const olderHalf = pts.slice(0, Math.floor(pts.length / 2));
      const recentAvg = recentHalf.reduce((s, p) => s + p.avgMood, 0) / recentHalf.length;
      const olderAvg = olderHalf.reduce((s, p) => s + p.avgMood, 0) / olderHalf.length;
      const diff = recentAvg - olderAvg;

      if (Math.abs(diff) >= 0.3) {
        const improving = diff > 0;
        insights.push({
          icon: improving ? "trending-up-outline" : "trending-down-outline",
          color: improving ? colors.success : colors.error,
          gradientColors: improving
            ? (gradients.primary as unknown as [string, string])
            : (gradients.danger as unknown as [string, string]),
          title: improving
            ? t("insights.computed.trendUpTitle", "Mood is improving")
            : t("insights.computed.trendDownTitle", "Mood has dipped"),
          description: improving
            ? t(
                "insights.computed.trendUpDesc",
                "Your average mood has been trending upward recently. Keep doing what works for you!",
              )
            : t(
                "insights.computed.trendDownDesc",
                "Your mood has been lower recently. Be gentle with yourself and consider what might help.",
              ),
        });
      } else {
        insights.push({
          icon: "analytics-outline",
          color: colors.primary,
          gradientColors: gradients.primary as unknown as [string, string],
          title: t("insights.computed.stableTitle", "Mood is steady"),
          description: t(
            "insights.computed.stableDesc",
            "Your mood has been fairly consistent. Stability is a sign of good emotional balance.",
          ),
        });
      }
    }

    // 2. Top trigger insight
    if (triggers.length > 0) {
      const topTrigger = triggers[0];
      insights.push({
        icon: "bulb-outline",
        color: colors.primary,
        gradientColors: gradients.accent as unknown as [string, string],
        title: t("insights.computed.topTriggerTitle", "Top factor: {{name}}", {
          name: topTrigger.trigger.name,
        }),
        description:
          topTrigger.avgMood >= 3.5
            ? t(
                "insights.computed.topTriggerPositive",
                '"{{name}}" appears most often and is linked to a positive mood (avg {{avg}}). It seems to be good for you!',
                { name: topTrigger.trigger.name, avg: topTrigger.avgMood.toFixed(1) },
              )
            : t(
                "insights.computed.topTriggerNegative",
                '"{{name}}" appears most often and is linked to a lower mood (avg {{avg}}). You may want to reflect on this pattern.',
                { name: topTrigger.trigger.name, avg: topTrigger.avgMood.toFixed(1) },
              ),
      });
    }

    // 3. Distribution insight
    if (summary.moodDistribution) {
      const total = summary.entryCount;
      const highMood = (summary.moodDistribution[4] || 0) + (summary.moodDistribution[5] || 0);
      const lowMood = (summary.moodDistribution[1] || 0) + (summary.moodDistribution[2] || 0);
      const highPct = Math.round((highMood / total) * 100);
      const lowPct = Math.round((lowMood / total) * 100);

      if (highPct >= 60) {
        insights.push({
          icon: "sunny-outline",
          color: colors.success,
          gradientColors: ["#4A7A2E", "#75863C"] as [string, string],
          title: t("insights.computed.mostlyPositiveTitle", "Mostly positive"),
          description: t(
            "insights.computed.mostlyPositiveDesc",
            "{{pct}}% of your entries this period are positive (4-5). You're in a good place!",
            { pct: highPct },
          ),
        });
      } else if (lowPct >= 60) {
        insights.push({
          icon: "heart-outline",
          color: colors.accent,
          gradientColors: gradients.accent as unknown as [string, string],
          title: t("insights.computed.mostlyLowTitle", "Tough period"),
          description: t(
            "insights.computed.mostlyLowDesc",
            "{{pct}}% of your entries this period are on the lower side (1-2). Remember, tracking is the first step to understanding.",
            { pct: lowPct },
          ),
        });
      } else {
        insights.push({
          icon: "swap-horizontal-outline",
          color: colors.accent,
          gradientColors: gradients.accent as unknown as [string, string],
          title: t("insights.computed.mixedTitle", "Mixed emotions"),
          description: t(
            "insights.computed.mixedDesc",
            "Your moods have been varied this period. That's completely normal — emotions naturally fluctuate.",
          ),
        });
      }
    }

    // 4. Consistency
    if (period === "week" && summary.entryCount < 4) {
      insights.push({
        icon: "calendar-outline",
        color: colors.textSecondary,
        gradientColors: ["#8A8A8A", "#5C5C5C"] as [string, string],
        title: t("insights.computed.logMoreTitle", "Log more often"),
        description: t(
          "insights.computed.logMoreDesc",
          "You logged {{count}} times this week. Try to log daily for more accurate insights.",
          { count: summary.entryCount },
        ),
      });
    } else if (period === "week" && summary.entryCount >= 6) {
      insights.push({
        icon: "checkmark-circle-outline",
        color: colors.success,
        gradientColors: gradients.primary as unknown as [string, string],
        title: t("insights.computed.consistentTitle", "Great consistency"),
        description: t(
          "insights.computed.consistentDesc",
          "You logged {{count}} times this week. Consistent tracking leads to better self-awareness.",
          { count: summary.entryCount },
        ),
      });
    }

    return insights;
  }, [summary, trend, triggers, period, t, colors, gradients]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* ── Header ─────────────────────────────────────────────── */}
        <Animated.View entering={FadeIn.duration(400)} style={styles.headerRow}>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>{t("insights.title")}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {t("insights.subtitle")}
            </Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <PeriodSelector value={period} onChange={setPeriod} />
          <Text style={[styles.periodHint, { color: colors.textTertiary }]}>
            {PERIOD_HINT[period]}
          </Text>
        </Animated.View>

        {isLoading && !summary ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : hasData ? (
          <>
            {/* ── Hero Mood Score ─────────────────────────────── */}
            <Animated.View entering={FadeInDown.delay(200).springify()}>
              <LinearGradient
                colors={[...gradients.heroCard]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroCard}
              >
                <View style={styles.heroContent}>
                  {/* Big mood score */}
                  <View style={styles.heroScoreSection}>
                    <View style={styles.heroScoreCircle}>
                      <Text style={styles.heroScoreNumber}>{summary.avgMood.toFixed(1)}</Text>
                      <Text style={styles.heroScoreEmoji}>
                        {getMoodForScore(summary.avgMood).emoji}
                      </Text>
                    </View>
                    <Text style={styles.heroScoreLabel}>{t("insights.avgMood")}</Text>
                    <Text style={styles.heroScoreSub}>{t("insights.outOf5")}</Text>
                  </View>

                  {/* Quick stats */}
                  <View style={styles.heroStats}>
                    <View style={styles.heroStatItem}>
                      <Text style={styles.heroStatValue}>{summary.entryCount}</Text>
                      <Text style={styles.heroStatLabel}>{t("insights.entries")}</Text>
                    </View>
                    <View
                      style={[styles.heroStatDivider, { backgroundColor: "rgba(255,255,255,0.2)" }]}
                    />
                    <View style={styles.heroStatItem}>
                      <Text style={styles.heroStatValue}>{PERIOD_LABELS[period]}</Text>
                      <Text style={styles.heroStatLabel}>{t("insights.period", "Period")}</Text>
                    </View>
                    {bestDay && (
                      <>
                        <View
                          style={[
                            styles.heroStatDivider,
                            { backgroundColor: "rgba(255,255,255,0.2)" },
                          ]}
                        />
                        <View style={styles.heroStatItem}>
                          <Text style={styles.heroStatValue}>
                            {moodEmojis[Math.round(bestDay.mood) as MoodLevel] || "😊"}
                          </Text>
                          <Text style={styles.heroStatLabel}>
                            {t("insights.bestDay", "Best Day")}
                          </Text>
                        </View>
                      </>
                    )}
                  </View>
                </View>
              </LinearGradient>
            </Animated.View>

            {/* ── Mood Distribution ──────────────────────────── */}
            <Animated.View entering={FadeInDown.delay(300).springify()}>
              <View style={[styles.sectionCard, { backgroundColor: colors.cardBackground }]}>
                <View style={styles.sectionHeader}>
                  <View
                    style={[styles.sectionIconCircle, { backgroundColor: colors.primaryMuted }]}
                  >
                    <Ionicons name="bar-chart-outline" size={16} color={colors.primary} />
                  </View>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    {t("insights.moodDistribution")}
                  </Text>
                </View>

                {getMoodDistributionRows().map((row) => (
                  <View key={row.level} style={styles.distRow}>
                    <Text style={styles.distEmoji}>{moodEmojis[row.level]}</Text>
                    <View style={styles.distBarSection}>
                      <View style={styles.distLabelRow}>
                        <Text style={[styles.distLabel, { color: colors.textSecondary }]}>
                          {moodLabels[row.level]}
                        </Text>
                        <Text style={[styles.distPercent, { color: colors.text }]}>
                          {Math.round(row.percentage)}%
                        </Text>
                      </View>
                      <ProgressBar
                        progress={row.percentage}
                        gradient={getMoodGradient(row.level)}
                        height={8}
                      />
                    </View>
                    <Text style={[styles.distCount, { color: colors.textTertiary }]}>
                      {row.count}
                    </Text>
                  </View>
                ))}
              </View>
            </Animated.View>

            {/* ── Mood Trend Chart ────────────────────────────── */}
            {trend && trend.dataPoints.length >= 2 && (
              <Animated.View
                entering={FadeInDown.delay(400).springify()}
                style={styles.chartSection}
              >
                <MoodTrendChart dataPoints={trend.dataPoints} period={period} />
              </Animated.View>
            )}

            {/* ── Trigger Breakdown ────────────────────────────── */}
            {triggers && triggers.length > 0 && (
              <Animated.View
                entering={FadeInDown.delay(500).springify()}
                style={styles.chartSection}
              >
                <TriggerBreakdown triggers={triggers} />
              </Animated.View>
            )}

            {/* ── AI Insights ─────────────────────────────────── */}
            {computedInsights.length > 0 && (
              <Animated.View
                entering={FadeInDown.delay(600).springify()}
                style={styles.insightsSection}
              >
                <View style={styles.insightsHeader}>
                  <View
                    style={[styles.sectionIconCircle, { backgroundColor: colors.primaryMuted }]}
                  >
                    <Ionicons name="sparkles-outline" size={16} color={colors.primary} />
                  </View>
                  <View>
                    <Text style={[styles.insightsTitle, { color: colors.text }]}>
                      {t("insights.aiInsights")}
                    </Text>
                    <Text style={[styles.insightsSubtitle, { color: colors.textSecondary }]}>
                      {t("insights.aiInsightsSubtitle")}
                    </Text>
                  </View>
                </View>

                {computedInsights.map((insight, index) => (
                  <Animated.View
                    key={insight.title}
                    entering={FadeInDown.delay(650 + index * 80).springify()}
                  >
                    <View style={[styles.insightCard, { backgroundColor: colors.cardBackground }]}>
                      <LinearGradient
                        colors={[...insight.gradientColors]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={styles.insightAccentBar}
                      />
                      <View style={styles.insightBody}>
                        <View
                          style={[
                            styles.insightIconCircle,
                            { backgroundColor: insight.color + "18" },
                          ]}
                        >
                          <Ionicons name={insight.icon} size={iconSizes.sm} color={insight.color} />
                        </View>
                        <View style={styles.insightTextWrap}>
                          <Text style={[styles.insightTitle, { color: colors.text }]}>
                            {insight.title}
                          </Text>
                          <Text style={[styles.insightDesc, { color: colors.textSecondary }]}>
                            {insight.description}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </Animated.View>
                ))}
              </Animated.View>
            )}

            {/* Bottom spacer */}
            <View style={{ height: spacing.xxl }} />
          </>
        ) : (
          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.emptyContainer}>
            <LinearGradient
              colors={[...gradients.heroCard]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.emptyIconCircle}
            >
              <Ionicons name="analytics-outline" size={36} color="#FFFFFF" />
            </LinearGradient>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>{t("insights.noData")}</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {t("insights.noDataSubtitle")}
            </Text>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: screenPadding.horizontal,
    paddingBottom: spacing.xxl + 40,
  },

  // ── Header ────────────────────────────────────────────
  headerRow: {
    paddingTop: spacing.md,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 28,
    fontFamily: "SourceSerif4_700Bold",
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "SourceSerif4_400Regular",
    lineHeight: 20,
  },
  periodHint: {
    fontSize: 12,
    fontFamily: "SourceSerif4_400Regular",
    textAlign: "center",
    marginTop: spacing.sm,
  },
  loadingContainer: {
    paddingVertical: spacing.xxl * 2,
    alignItems: "center",
  },

  // ── Hero Mood Score Card ──────────────────────────────
  heroCard: {
    borderRadius: radii.xxl,
    marginTop: spacing.lg,
    overflow: "hidden",
    ...cardShadowStrong(),
  },
  heroContent: {
    padding: spacing.lg,
    alignItems: "center",
  },
  heroScoreSection: {
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  heroScoreCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  heroScoreNumber: {
    fontSize: 36,
    fontFamily: "SourceSerif4_700Bold",
    color: "#FFFFFF",
    lineHeight: 40,
  },
  heroScoreEmoji: {
    fontSize: 22,
    marginTop: 2,
  },
  heroScoreLabel: {
    fontSize: 14,
    fontFamily: "SourceSerif4_600SemiBold",
    color: "rgba(255, 255, 255, 0.9)",
  },
  heroScoreSub: {
    fontSize: 12,
    fontFamily: "SourceSerif4_400Regular",
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 2,
  },
  heroStats: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: radii.lg,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    width: "100%",
  },
  heroStatItem: {
    flex: 1,
    alignItems: "center",
  },
  heroStatValue: {
    fontSize: 16,
    fontFamily: "SourceSerif4_700Bold",
    color: "#FFFFFF",
  },
  heroStatLabel: {
    fontSize: 11,
    fontFamily: "SourceSerif4_400Regular",
    color: "rgba(255, 255, 255, 0.7)",
    marginTop: 2,
  },
  heroStatDivider: {
    width: 1,
    height: 28,
  },

  // ── Section Card (Mood Distribution) ──────────────────
  sectionCard: {
    borderRadius: radii.xxl,
    padding: spacing.lg,
    marginTop: spacing.lg,
    ...cardShadow(),
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md + 4,
    gap: spacing.sm + 2,
  },
  sectionIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "SourceSerif4_700Bold",
  },
  distRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm + 4,
    gap: spacing.sm,
  },
  distEmoji: {
    fontSize: 20,
    width: 28,
    textAlign: "center",
  },
  distBarSection: {
    flex: 1,
  },
  distLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  distLabel: {
    fontSize: 12,
    fontFamily: "SourceSerif4_400Regular",
  },
  distPercent: {
    fontSize: 12,
    fontFamily: "SourceSerif4_600SemiBold",
  },
  distCount: {
    fontSize: 12,
    fontFamily: "SourceSerif4_600SemiBold",
    width: 24,
    textAlign: "right",
  },

  // ── Charts ────────────────────────────────────────────
  chartSection: {
    marginTop: spacing.lg,
  },

  // ── AI Insights ───────────────────────────────────────
  insightsSection: {
    marginTop: spacing.xl,
  },
  insightsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
    gap: spacing.sm + 2,
  },
  insightsTitle: {
    fontSize: 18,
    fontFamily: "SourceSerif4_700Bold",
  },
  insightsSubtitle: {
    fontSize: 12,
    fontFamily: "SourceSerif4_400Regular",
    marginTop: 1,
  },
  insightCard: {
    flexDirection: "row",
    borderRadius: radii.xl,
    marginBottom: spacing.sm + 2,
    overflow: "hidden",
    ...cardShadow(),
  },
  insightAccentBar: {
    width: 4,
  },
  insightBody: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    gap: spacing.md,
  },
  insightIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  insightTextWrap: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 15,
    fontFamily: "SourceSerif4_600SemiBold",
    marginBottom: 3,
  },
  insightDesc: {
    fontSize: 13,
    fontFamily: "SourceSerif4_400Regular",
    lineHeight: 18,
  },

  // ── Empty State ───────────────────────────────────────
  emptyContainer: {
    alignItems: "center",
    paddingVertical: spacing.xxl * 2,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: "SourceSerif4_600SemiBold",
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "SourceSerif4_400Regular",
    textAlign: "center",
    maxWidth: 260,
    lineHeight: 20,
  },
});
