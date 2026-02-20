import { MOOD_SCALE } from "@emovo/shared";
import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { MoodBarChart } from "../../src/components/charts/MoodBarChart";
import { MoodLineChart } from "../../src/components/charts/MoodLineChart";
import { PeriodSelector } from "../../src/components/charts/PeriodSelector";
import { TriggerPieChart } from "../../src/components/charts/TriggerPieChart";
import { useMoodStats } from "../../src/hooks/useMoodStats";
import { colors } from "../../src/theme/colors";
import { spacing } from "../../src/theme/spacing";

type Period = "week" | "month" | "year";

const PERIOD_LABELS: Record<Period, string> = {
  week: "this week",
  month: "this month",
  year: "this year",
};

export default function InsightsScreen() {
  const [period, setPeriod] = useState<Period>("week");
  const { summary, trend, triggers, isLoading, refresh } = useMoodStats(period);

  const getMoodForScore = (score: number) => {
    return MOOD_SCALE.find((m) => m.score === Math.round(score)) || MOOD_SCALE[2];
  };

  const hasData = summary && summary.entryCount > 0;

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
        <Text style={styles.title}>Insights</Text>

        <PeriodSelector value={period} onChange={setPeriod} />

        {isLoading && !summary ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : hasData ? (
          <>
            {/* Hero Card - Average Mood */}
            <View style={styles.heroCard}>
              <View style={styles.heroRow}>
                <Text style={styles.heroScore}>{summary.avgMood.toFixed(1)}</Text>
                <Text style={styles.heroEmoji}>{getMoodForScore(summary.avgMood).emoji}</Text>
              </View>
              <Text style={styles.heroLabel}>{getMoodForScore(summary.avgMood).label}</Text>
            </View>

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{summary.entryCount}</Text>
                <Text style={styles.statLabel}>entries</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{getMoodForScore(summary.avgMood).emoji}</Text>
                <Text style={styles.statLabel}>{PERIOD_LABELS[period]}</Text>
              </View>
            </View>

            {/* Mood Distribution Chart */}
            <View style={styles.chartSection}>
              <MoodBarChart distribution={summary.moodDistribution} />
            </View>

            {/* Mood Trend Chart */}
            {trend && trend.dataPoints.length >= 2 && (
              <View style={styles.chartSection}>
                <MoodLineChart dataPoints={trend.dataPoints} period={period} />
              </View>
            )}

            {/* Triggers Pie Chart */}
            {triggers && triggers.length > 0 && (
              <View style={styles.chartSection}>
                <TriggerPieChart triggers={triggers} />
              </View>
            )}
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📊</Text>
            <Text style={styles.emptyTitle}>No data yet</Text>
            <Text style={styles.emptySubtitle}>Log some moods to see your insights here.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const cardShadow = Platform.select({
  ios: {
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  android: {
    elevation: 2,
  },
  default: {},
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  title: {
    fontSize: 28,
    fontFamily: "SourceSerif4_700Bold",
    color: colors.text,
    paddingTop: spacing.md,
    marginBottom: spacing.md,
  },
  loadingContainer: {
    paddingVertical: spacing.xxl * 2,
    alignItems: "center",
  },

  // Hero Card
  heroCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: spacing.lg,
    marginTop: spacing.md,
    alignItems: "center",
    ...cardShadow,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  heroScore: {
    fontSize: 36,
    fontFamily: "SourceSerif4_700Bold",
    color: colors.text,
  },
  heroEmoji: {
    fontSize: 32,
  },
  heroLabel: {
    fontSize: 14,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  // Stats Row
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderRadius: 14,
    padding: spacing.md,
    alignItems: "center",
    ...cardShadow,
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
    marginTop: spacing.md,
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
