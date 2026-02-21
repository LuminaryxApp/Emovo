import { Ionicons } from "@expo/vector-icons";
import { format, isToday } from "date-fns";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, View, StyleSheet, ScrollView, RefreshControl, Pressable } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MoodCard, MoodStreak } from "../../src/components/mood";
import { Card } from "../../src/components/ui";
import { useMoodStats } from "../../src/hooks/useMoodStats";
import { getCurrentLanguage } from "../../src/i18n/config";
import { getDateLocale } from "../../src/i18n/date-locale";
import { getStreakApi } from "../../src/services/stats.api";
import { useAuthStore } from "../../src/stores/auth.store";
import { useMoodStore } from "../../src/stores/mood.store";
import type { MoodLevel } from "../../src/theme/colors";
import { colors, gradients, cardShadow, cardShadowStrong } from "../../src/theme/colors";
import { spacing, radii, screenPadding, iconSizes } from "../../src/theme/spacing";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getGreeting(t: (key: string) => string): string {
  const hour = new Date().getHours();
  if (hour < 12) return t("home.greetingMorning");
  if (hour < 17) return t("home.greetingAfternoon");
  return t("home.greetingEvening");
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function HomeScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Stores
  const user = useAuthStore((s) => s.user);
  const entries = useMoodStore((s) => s.entries);
  const fetchEntries = useMoodStore((s) => s.fetchEntries);
  const fetchTriggers = useMoodStore((s) => s.fetchTriggers);
  const syncOffline = useMoodStore((s) => s.syncOffline);
  const offlineCount = useMoodStore((s) => s.offlineCount);

  // Stats hook
  const { summary, refresh: refreshStats } = useMoodStats("week");

  // Streak state
  const [streak, setStreak] = useState({ currentStreak: 0, longestStreak: 0 });

  // Refreshing state
  const [refreshing, setRefreshing] = useState(false);

  // Derived: today's entry
  const dateLocale = getDateLocale(getCurrentLanguage());
  const todayStr = format(new Date(), "EEEE, MMM d", { locale: dateLocale });
  const greeting = getGreeting(t);

  const todaysEntry = entries.find((e) => isToday(new Date(e.loggedAt)));
  const todayMood = todaysEntry ? (todaysEntry.moodScore as MoodLevel) : undefined;
  const todayLoggedAt = todaysEntry?.loggedAt;

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const fetchStreak = useCallback(async () => {
    try {
      const data = await getStreakApi();
      if (data) {
        setStreak({
          currentStreak: data.currentStreak,
          longestStreak: data.longestStreak,
        });
      }
    } catch {
      // Silent fail
    }
  }, []);

  useEffect(() => {
    fetchTriggers();
    syncOffline();
    fetchEntries();
    fetchStreak();
  }, [fetchTriggers, syncOffline, fetchEntries, fetchStreak]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchEntries(), fetchStreak(), refreshStats()]);
    setRefreshing(false);
  }, [fetchEntries, fetchStreak, refreshStats]);

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  const goToLogMood = useCallback(() => {
    router.push("/log-mood");
  }, [router]);

  const goToInsights = useCallback(() => {
    router.push("/(tabs)/insights");
  }, [router]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const avgMood = summary?.avgMood ?? 0;
  const entryCount = summary?.entryCount ?? 0;

  return (
    <LinearGradient colors={[...gradients.warmBackground]} style={styles.flex}>
      <ScrollView
        style={[styles.container, { paddingTop: insets.top + spacing.md }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* ---------------------------------------------------------------- */}
        {/* Header */}
        {/* ---------------------------------------------------------------- */}
        <Animated.View
          entering={FadeInDown.delay(0).duration(500).springify()}
          style={styles.header}
        >
          <View style={styles.headerTextBlock}>
            <Text style={styles.dateLabel}>{todayStr.toUpperCase()}</Text>
            <Text style={styles.greetingText}>
              {greeting},{"\n"}
              <Text style={styles.nameText}>{user?.displayName || "there"}</Text>
            </Text>
          </View>
          <Pressable style={styles.notificationButton}>
            <Ionicons name="notifications-outline" size={iconSizes.md} color={colors.text} />
          </Pressable>
        </Animated.View>

        {/* ---------------------------------------------------------------- */}
        {/* Offline Banner */}
        {/* ---------------------------------------------------------------- */}
        {offlineCount > 0 && (
          <Animated.View entering={FadeInDown.delay(50).duration(400)}>
            <LinearGradient
              colors={["rgba(234, 179, 8, 0.15)", "rgba(249, 115, 22, 0.10)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.offlineBanner}
            >
              <Ionicons name="cloud-upload-outline" size={16} color={colors.warning} />
              <Text style={styles.offlineText}>
                {t("home.offlineSync", { count: offlineCount })}
              </Text>
            </LinearGradient>
          </Animated.View>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Today's Mood Card */}
        {/* ---------------------------------------------------------------- */}
        <Animated.View entering={FadeInDown.delay(100).duration(500).springify()}>
          <Text style={styles.sectionLabel}>{t("home.todaysMood").toUpperCase()}</Text>
          <MoodCard
            mood={todayMood}
            loggedAt={todayLoggedAt}
            onPress={todaysEntry ? undefined : goToLogMood}
            onLogMood={goToLogMood}
          />
        </Animated.View>

        {/* ---------------------------------------------------------------- */}
        {/* Mood Streak */}
        {/* ---------------------------------------------------------------- */}
        <Animated.View
          entering={FadeInDown.delay(200).duration(500).springify()}
          style={styles.section}
        >
          <Text style={styles.sectionLabel}>{t("home.moodStreak").toUpperCase()}</Text>
          <MoodStreak currentStreak={streak.currentStreak} longestStreak={streak.longestStreak} />
        </Animated.View>

        {/* ---------------------------------------------------------------- */}
        {/* Quick Stats - This Week */}
        {/* ---------------------------------------------------------------- */}
        <Animated.View
          entering={FadeInDown.delay(300).duration(500).springify()}
          style={styles.section}
        >
          <Text style={styles.sectionLabel}>{t("home.thisWeek").toUpperCase()}</Text>
          <View style={styles.statsRow}>
            {/* Average Mood */}
            <Card variant="elevated" padding="md" style={styles.statCard}>
              <View style={styles.statIconRow}>
                <View style={[styles.statIconCircle, { backgroundColor: colors.primaryMuted }]}>
                  <Ionicons name="analytics-outline" size={iconSizes.sm} color={colors.primary} />
                </View>
              </View>
              <Text style={styles.statValue}>{avgMood > 0 ? avgMood.toFixed(1) : "--"}</Text>
              <Text style={styles.statLabel}>{t("home.avgMood")}</Text>
            </Card>

            {/* Entry Count */}
            <Card variant="elevated" padding="md" style={styles.statCard}>
              <View style={styles.statIconRow}>
                <View
                  style={[styles.statIconCircle, { backgroundColor: "rgba(111, 152, 184, 0.10)" }]}
                >
                  <Ionicons name="journal-outline" size={iconSizes.sm} color={colors.accent} />
                </View>
              </View>
              <Text style={styles.statValue}>{entryCount > 0 ? entryCount : "--"}</Text>
              <Text style={styles.statLabel}>{t("home.entries")}</Text>
            </Card>
          </View>
        </Animated.View>

        {/* ---------------------------------------------------------------- */}
        {/* Insight Preview */}
        {/* ---------------------------------------------------------------- */}
        <Animated.View
          entering={FadeInDown.delay(400).duration(500).springify()}
          style={styles.section}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>{t("home.recentInsight").toUpperCase()}</Text>
            <Pressable onPress={goToInsights} hitSlop={8}>
              <Text style={styles.seeAllText}>{t("home.seeAll")}</Text>
            </Pressable>
          </View>
          <Card variant="elevated" padding="lg" onPress={goToInsights}>
            <View style={styles.insightRow}>
              <View
                style={[styles.insightIconCircle, { backgroundColor: "rgba(234, 179, 8, 0.12)" }]}
              >
                <Ionicons name="bulb-outline" size={iconSizes.md} color={colors.warning} />
              </View>
              <View style={styles.insightTextBlock}>
                <Text style={styles.insightTitle}>{t("home.insightTitle")}</Text>
                <Text style={styles.insightDescription} numberOfLines={2}>
                  {t("home.insightDescription")}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={iconSizes.sm} color={colors.textTertiary} />
            </View>
          </Card>
        </Animated.View>

        {/* ---------------------------------------------------------------- */}
        {/* Motivational Quote */}
        {/* ---------------------------------------------------------------- */}
        <Animated.View
          entering={FadeInDown.delay(500).duration(500).springify()}
          style={styles.section}
        >
          <Card
            variant="gradient"
            padding="lg"
            gradientColors={gradients.accent}
            style={styles.quoteCard}
          >
            <View style={styles.quoteRow}>
              <Ionicons name="leaf-outline" size={iconSizes.lg} color="rgba(255,255,255,0.85)" />
            </View>
            <Text style={styles.quoteText}>{t("home.dailyQuote")}</Text>
          </Card>
        </Animated.View>

        {/* Bottom spacer for tab bar */}
        <View style={{ height: spacing.xxl + 40 }} />
      </ScrollView>

      {/* ------------------------------------------------------------------ */}
      {/* FAB - Log Mood */}
      {/* ------------------------------------------------------------------ */}
      <Animated.View
        entering={FadeInDown.delay(600).duration(400).springify()}
        style={[styles.fabContainer, { bottom: insets.bottom + 80 }]}
      >
        <Pressable onPress={goToLogMood}>
          <LinearGradient
            colors={[...gradients.primaryButton]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.fab, cardShadowStrong()]}
          >
            <Ionicons name="add" size={28} color={colors.textInverse} />
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </LinearGradient>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: screenPadding.horizontal,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  headerTextBlock: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 11,
    fontFamily: "SourceSerif4_600SemiBold",
    color: colors.sectionLabel,
    letterSpacing: 1.5,
    marginBottom: spacing.xs,
  },
  greetingText: {
    fontSize: 26,
    fontFamily: "SourceSerif4_700Bold",
    color: colors.text,
    lineHeight: 34,
  },
  nameText: {
    fontFamily: "SourceSerif4_400Regular",
    color: colors.primary,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.xs,
    ...cardShadow(),
  },

  // Offline banner
  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(234, 179, 8, 0.25)",
    gap: spacing.sm,
  },
  offlineText: {
    fontSize: 13,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textSecondary,
  },

  // Sections
  section: {
    marginTop: spacing.lg,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "SourceSerif4_600SemiBold",
    color: colors.sectionLabel,
    letterSpacing: 1.5,
    marginBottom: spacing.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  seeAllText: {
    fontSize: 13,
    fontFamily: "SourceSerif4_600SemiBold",
    color: colors.primary,
  },

  // Quick stats
  statsRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
  },
  statIconRow: {
    marginBottom: spacing.sm,
  },
  statIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    fontSize: 28,
    fontFamily: "SourceSerif4_700Bold",
    color: colors.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 13,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textSecondary,
  },

  // Insight preview
  insightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  insightIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  insightTextBlock: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 16,
    fontFamily: "SourceSerif4_600SemiBold",
    color: colors.text,
    marginBottom: 2,
  },
  insightDescription: {
    fontSize: 13,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textSecondary,
    lineHeight: 18,
  },

  // Motivational quote
  quoteCard: {
    borderRadius: radii.xl,
    ...cardShadow(),
  },
  quoteRow: {
    marginBottom: spacing.sm,
  },
  quoteText: {
    fontSize: 16,
    fontFamily: "SourceSerif4_400Regular",
    fontStyle: "italic",
    color: "rgba(255,255,255,0.95)",
    lineHeight: 24,
  },

  // FAB
  fabContainer: {
    position: "absolute",
    right: screenPadding.horizontal,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
});
