import { MOOD_SCALE } from "@emovo/shared";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
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

import { MoodBarChart } from "../../src/components/charts/MoodBarChart";
import { MoodLineChart } from "../../src/components/charts/MoodLineChart";
import { PeriodSelector } from "../../src/components/charts/PeriodSelector";
import { TriggerPieChart } from "../../src/components/charts/TriggerPieChart";
import { Card, Badge, ProgressBar } from "../../src/components/ui";
import { useMoodStats } from "../../src/hooks/useMoodStats";
import { moodEmojis, moodLabels, type MoodLevel } from "../../src/theme";
import { colors, gradients, cardShadow, cardShadowStrong } from "../../src/theme/colors";
import { spacing, radii, screenPadding, iconSizes } from "../../src/theme/spacing";

type Period = "week" | "month" | "year";

export default function InsightsScreen() {
  const { t } = useTranslation();
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

  // AI Insights placeholder data
  const aiInsights = [
    {
      icon: "bulb-outline" as const,
      color: colors.primary,
      bgColor: "rgba(117, 134, 60, 0.12)",
      title: t("insights.aiCard.morningTitle"),
      description: t("insights.aiCard.morningDesc"),
    },
    {
      icon: "trending-up-outline" as const,
      color: colors.success,
      bgColor: "rgba(117, 134, 60, 0.12)",
      title: t("insights.aiCard.trendTitle"),
      description: t("insights.aiCard.trendDesc"),
    },
    {
      icon: "heart-outline" as const,
      color: colors.accent,
      bgColor: "rgba(111, 152, 184, 0.12)",
      title: t("insights.aiCard.selfCareTitle"),
      description: t("insights.aiCard.selfCareDesc"),
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
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
        {/* Header */}
        <Animated.Text entering={FadeIn.duration(400)} style={styles.title}>
          {t("insights.title")}
        </Animated.Text>
        <Animated.Text entering={FadeIn.duration(400).delay(50)} style={styles.subtitle}>
          {t("insights.subtitle")}
        </Animated.Text>

        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <PeriodSelector value={period} onChange={setPeriod} />
          <Text style={styles.periodHint}>{PERIOD_HINT[period]}</Text>
        </Animated.View>

        {isLoading && !summary ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : hasData ? (
          <>
            {/* Mood Overview Card */}
            <Animated.View entering={FadeInDown.delay(200).springify()}>
              <Card variant="elevated" padding="lg" style={styles.overviewCard}>
                <Text style={styles.overviewTitle}>{t("insights.moodOverview")}</Text>

                <View style={styles.overviewContent}>
                  {/* Left side: Average mood */}
                  <View style={styles.overviewLeft}>
                    <LinearGradient
                      colors={[...gradients.heroCard]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.avgMoodGradient}
                    >
                      <Text style={styles.avgMoodNumber}>{summary.avgMood.toFixed(1)}</Text>
                      <Text style={styles.avgMoodEmoji}>
                        {getMoodForScore(summary.avgMood).emoji}
                      </Text>
                    </LinearGradient>
                    <Text style={styles.avgMoodLabel}>{t("insights.avgMood")}</Text>
                    <Text style={styles.avgMoodSub}>{t("insights.outOf5")}</Text>
                    <Badge variant="primary" size="sm" style={styles.entriesBadge}>
                      {`${summary.entryCount} ${t("insights.entries")}`}
                    </Badge>
                  </View>

                  {/* Divider */}
                  <View style={styles.overviewDivider} />

                  {/* Right side: Mood distribution */}
                  <View style={styles.overviewRight}>
                    <Text style={styles.distributionTitle}>{t("insights.moodDistribution")}</Text>
                    {getMoodDistributionRows().map((row) => (
                      <View key={row.level} style={styles.distRow}>
                        <Text style={styles.distEmoji}>{moodEmojis[row.level]}</Text>
                        <Text style={styles.distLabel}>{moodLabels[row.level]}</Text>
                        <View style={styles.distBarWrap}>
                          <ProgressBar
                            progress={row.percentage}
                            height={6}
                            color={colors.mood[row.level]}
                          />
                        </View>
                        <Text style={styles.distPercent}>{Math.round(row.percentage)}%</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </Card>
            </Animated.View>

            {/* Stats Row */}
            <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.statsRow}>
              <LinearGradient
                colors={[...gradients.warmSurface]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.statCard}
              >
                <Text style={styles.statValue}>{summary.entryCount}</Text>
                <Text style={styles.statLabel}>{t("insights.entries")}</Text>
              </LinearGradient>
              <LinearGradient
                colors={[...gradients.warmSurface]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.statCard}
              >
                <Text style={styles.statValue}>{getMoodForScore(summary.avgMood).emoji}</Text>
                <Text style={styles.statLabel}>{PERIOD_LABELS[period]}</Text>
              </LinearGradient>
            </Animated.View>

            {/* Mood Distribution Chart */}
            <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.chartSection}>
              <MoodBarChart distribution={summary.moodDistribution} />
            </Animated.View>

            {/* Mood Trend Chart */}
            {trend && trend.dataPoints.length >= 2 && (
              <Animated.View
                entering={FadeInDown.delay(500).springify()}
                style={styles.chartSection}
              >
                <MoodLineChart dataPoints={trend.dataPoints} period={period} />
              </Animated.View>
            )}

            {/* Triggers Pie Chart */}
            {triggers && triggers.length > 0 && (
              <Animated.View
                entering={FadeInDown.delay(600).springify()}
                style={styles.chartSection}
              >
                <TriggerPieChart triggers={triggers} />
              </Animated.View>
            )}

            {/* AI Insights Section */}
            <Animated.View entering={FadeInDown.delay(700).springify()} style={styles.aiSection}>
              <Text style={styles.sectionTitle}>{t("insights.aiInsights")}</Text>
              <Text style={styles.sectionSubtitle}>{t("insights.aiInsightsSubtitle")}</Text>

              {aiInsights.map((insight, index) => (
                <Animated.View
                  key={insight.title}
                  entering={FadeInDown.delay(750 + index * 80).springify()}
                >
                  <Card variant="elevated" padding="md" style={styles.insightCard}>
                    <View style={styles.insightRow}>
                      <View
                        style={[styles.insightIconCircle, { backgroundColor: insight.bgColor }]}
                      >
                        <Ionicons name={insight.icon} size={iconSizes.md} color={insight.color} />
                      </View>
                      <View style={styles.insightTextWrap}>
                        <Text style={styles.insightTitle}>{insight.title}</Text>
                        <Text style={styles.insightDesc}>{insight.description}</Text>
                      </View>
                    </View>
                  </Card>
                </Animated.View>
              ))}
            </Animated.View>
          </>
        ) : (
          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📊</Text>
            <Text style={styles.emptyTitle}>{t("insights.noData")}</Text>
            <Text style={styles.emptySubtitle}>{t("insights.noDataSubtitle")}</Text>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: screenPadding.horizontal,
    paddingBottom: spacing.xxl,
  },
  title: {
    fontSize: 28,
    fontFamily: "SourceSerif4_700Bold",
    color: colors.text,
    paddingTop: spacing.md,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  periodHint: {
    fontSize: 12,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textTertiary,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  loadingContainer: {
    paddingVertical: spacing.xxl * 2,
    alignItems: "center",
  },

  // Mood Overview Card
  overviewCard: {
    marginTop: spacing.lg,
  },
  overviewTitle: {
    fontSize: 11,
    fontFamily: "SourceSerif4_600SemiBold",
    color: colors.sectionLabel,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: spacing.md,
  },
  overviewContent: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  overviewLeft: {
    alignItems: "center",
    paddingRight: spacing.md,
    minWidth: 110,
  },
  avgMoodGradient: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    ...cardShadowStrong(),
  },
  avgMoodNumber: {
    fontSize: 28,
    fontFamily: "SourceSerif4_700Bold",
    color: colors.textInverse,
    lineHeight: 32,
  },
  avgMoodEmoji: {
    fontSize: 18,
    marginTop: 2,
  },
  avgMoodLabel: {
    fontSize: 13,
    fontFamily: "SourceSerif4_600SemiBold",
    color: colors.text,
    marginTop: spacing.sm,
  },
  avgMoodSub: {
    fontSize: 11,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textTertiary,
    marginTop: 2,
  },
  entriesBadge: {
    marginTop: spacing.sm,
  },
  overviewDivider: {
    width: 1,
    backgroundColor: colors.border,
    alignSelf: "stretch",
    marginVertical: spacing.xs,
  },
  overviewRight: {
    flex: 1,
    paddingLeft: spacing.md,
  },
  distributionTitle: {
    fontSize: 11,
    fontFamily: "SourceSerif4_600SemiBold",
    color: colors.sectionLabel,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
  },
  distRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  distEmoji: {
    fontSize: 14,
    width: 22,
  },
  distLabel: {
    fontSize: 11,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textSecondary,
    width: 48,
  },
  distBarWrap: {
    flex: 1,
    marginHorizontal: spacing.xs,
  },
  distPercent: {
    fontSize: 11,
    fontFamily: "SourceSerif4_600SemiBold",
    color: colors.text,
    width: 32,
    textAlign: "right",
  },

  // Stats Row
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: spacing.md,
  },
  statCard: {
    flex: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    alignItems: "center",
    ...cardShadow(),
  },
  statValue: {
    fontSize: 24,
    fontFamily: "SourceSerif4_700Bold",
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },

  // Chart Sections
  chartSection: {
    marginTop: spacing.lg,
  },

  // AI Insights Section
  aiSection: {
    marginTop: spacing.xl,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: "SourceSerif4_700Bold",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  insightCard: {
    marginBottom: spacing.sm,
  },
  insightRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  insightIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  insightTextWrap: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 15,
    fontFamily: "SourceSerif4_600SemiBold",
    color: colors.text,
    marginBottom: 2,
  },
  insightDesc: {
    fontSize: 13,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textSecondary,
    lineHeight: 18,
  },

  // Empty State
  emptyContainer: {
    alignItems: "center",
    paddingVertical: spacing.xxl * 2,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: "SourceSerif4_600SemiBold",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textSecondary,
    textAlign: "center",
    maxWidth: 260,
    lineHeight: 20,
  },
});
