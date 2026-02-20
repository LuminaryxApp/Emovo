import { MOOD_SCALE } from "@emovo/shared";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
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
import { useMoodStats } from "../../src/hooks/useMoodStats";
import { colors, gradients, cardShadow, cardShadowStrong } from "../../src/theme/colors";
import { spacing, radii } from "../../src/theme/spacing";

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
        <Animated.Text entering={FadeIn.duration(400)} style={styles.title}>
          Insights
        </Animated.Text>

        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <PeriodSelector value={period} onChange={setPeriod} />
        </Animated.View>

        {isLoading && !summary ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : hasData ? (
          <>
            {/* Hero Card - Average Mood */}
            <Animated.View entering={FadeInDown.delay(200).springify()}>
              <LinearGradient
                colors={[...gradients.heroCard]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroCard}
              >
                <View style={styles.heroRow}>
                  <Text style={styles.heroScore}>{summary.avgMood.toFixed(1)}</Text>
                </View>
                <Text style={styles.heroEmoji}>{getMoodForScore(summary.avgMood).emoji}</Text>
                <Text style={styles.heroLabel}>{getMoodForScore(summary.avgMood).label}</Text>
              </LinearGradient>
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
                <Text style={styles.statLabel}>entries</Text>
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
          </>
        ) : (
          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📊</Text>
            <Text style={styles.emptyTitle}>No data yet</Text>
            <Text style={styles.emptySubtitle}>Log some moods to see your insights here.</Text>
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
    borderRadius: radii.xxl,
    padding: 24,
    marginTop: spacing.md,
    alignItems: "center",
    ...cardShadowStrong(),
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  heroScore: {
    fontSize: 56,
    fontFamily: "SourceSerif4_700Bold",
    color: colors.textInverse,
  },
  heroEmoji: {
    fontSize: 40,
    marginTop: spacing.xs,
  },
  heroLabel: {
    fontSize: 14,
    fontFamily: "SourceSerif4_400Regular",
    color: "rgba(255, 255, 255, 0.8)",
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
