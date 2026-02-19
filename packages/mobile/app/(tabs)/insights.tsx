import { MOOD_SCALE } from "@emovo/shared";
import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MoodBarChart } from "../../src/components/charts/MoodBarChart";
import { MoodLineChart } from "../../src/components/charts/MoodLineChart";
import { PeriodSelector } from "../../src/components/charts/PeriodSelector";
import { TriggerPieChart } from "../../src/components/charts/TriggerPieChart";
import { useMoodStats } from "../../src/hooks/useMoodStats";
import { colors } from "../../src/theme/colors";
import { spacing } from "../../src/theme/spacing";

type Period = "week" | "month" | "year";

export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<Period>("week");
  const { summary, trend, triggers, isLoading, refresh } = useMoodStats(period);

  const getMoodForScore = (score: number) => {
    return MOOD_SCALE.find((m) => m.score === Math.round(score)) || MOOD_SCALE[2];
  };

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
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
      ) : summary && summary.entryCount > 0 ? (
        <>
          {/* Summary Cards */}
          <View style={styles.cardRow}>
            <View style={styles.card}>
              <Text style={styles.cardValue}>{getMoodForScore(summary.avgMood).emoji}</Text>
              <Text style={styles.cardLabel}>Avg Mood</Text>
              <Text style={styles.cardSubvalue}>{summary.avgMood.toFixed(1)}/5</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardValue}>{summary.entryCount}</Text>
              <Text style={styles.cardLabel}>Entries</Text>
              <Text style={styles.cardSubvalue}>this {period}</Text>
            </View>
          </View>

          {/* Charts */}
          <MoodBarChart distribution={summary.moodDistribution} />

          {trend && trend.dataPoints.length >= 2 && (
            <MoodLineChart dataPoints={trend.dataPoints} period={period} />
          )}

          {triggers && triggers.length > 0 && <TriggerPieChart triggers={triggers} />}

          {/* Top Triggers List */}
          {summary.topTriggers.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Top Triggers</Text>
              {summary.topTriggers.slice(0, 5).map((item, index) => (
                <View key={item.trigger.name} style={styles.triggerRow}>
                  <Text style={styles.triggerRank}>{index + 1}</Text>
                  <Text style={styles.triggerName}>{item.trigger.name}</Text>
                  <View style={styles.triggerMeta}>
                    <Text style={styles.triggerCount}>{item.count}x</Text>
                    <Text style={styles.triggerAvg}>
                      {getMoodForScore(item.avgMood).emoji} {item.avgMood.toFixed(1)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>📊</Text>
          <Text style={styles.emptyTitle}>No data yet</Text>
          <Text style={styles.emptySubtitle}>Log some moods to see your insights here</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  title: {
    fontSize: 24,
    fontFamily: "SourceSerif4_700Bold",
    color: colors.text,
    marginBottom: spacing.md,
  },
  loadingContainer: {
    paddingVertical: spacing.xxl * 2,
    alignItems: "center",
  },
  cardRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  cardValue: {
    fontSize: 32,
    fontFamily: "SourceSerif4_700Bold",
    color: colors.text,
  },
  cardLabel: {
    fontSize: 14,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textSecondary,
    marginTop: 4,
  },
  cardSubvalue: {
    fontSize: 12,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textTertiary,
    marginTop: 2,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "SourceSerif4_600SemiBold",
    color: colors.text,
    marginBottom: spacing.md,
  },
  triggerRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  triggerRank: {
    fontSize: 14,
    fontFamily: "SourceSerif4_600SemiBold",
    color: colors.textTertiary,
    width: 24,
  },
  triggerName: {
    flex: 1,
    fontSize: 16,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.text,
  },
  triggerMeta: {
    alignItems: "flex-end",
  },
  triggerCount: {
    fontSize: 14,
    fontFamily: "SourceSerif4_600SemiBold",
    color: colors.primary,
  },
  triggerAvg: {
    fontSize: 12,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textSecondary,
  },
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
  },
});
