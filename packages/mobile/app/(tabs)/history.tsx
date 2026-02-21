import type { MoodEntry } from "@emovo/shared";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  startOfDay,
  endOfDay,
} from "date-fns";
import { useState, useMemo, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MoodEntryCard } from "../../src/components/mood";
import { Card, IconButton, EmptyState } from "../../src/components/ui";
import { getCurrentLanguage } from "../../src/i18n/config";
import { getDateLocale } from "../../src/i18n/date-locale";
import { getMoodCalendarApi, listMoodsApi } from "../../src/services/mood.api";
import { moodEmojis } from "../../src/theme";
import { colors, type MoodLevel } from "../../src/theme/colors";
import { spacing, radii, screenPadding } from "../../src/theme/spacing";

// ---------------------------------------------------------------------------
// Calendar helpers
// ---------------------------------------------------------------------------

interface CalendarDay {
  date: Date | null;
  isCurrentMonth: boolean;
}

function getCalendarDays(month: Date): CalendarDay[] {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Pad to exactly 42 cells (6 rows x 7 cols)
  const calendarDays: CalendarDay[] = days.map((date) => ({
    date,
    isCurrentMonth: isSameMonth(date, month),
  }));

  while (calendarDays.length < 42) {
    const lastDate = calendarDays[calendarDays.length - 1].date;
    const nextDate = lastDate ? new Date(lastDate.getTime() + 86400000) : new Date();
    calendarDays.push({ date: nextDate, isCurrentMonth: false });
  }

  return calendarDays.slice(0, 42);
}

function getDayOfWeekHeaders(locale: ReturnType<typeof getDateLocale>): string[] {
  // Build locale-aware short day names starting from Sunday
  const base = new Date(2024, 0, 7); // Known Sunday
  const headers: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const name = format(d, "EEEEE", { locale });
    headers.push(name);
  }
  return headers;
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function HistoryScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  // State
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarData, setCalendarData] = useState<Record<string, number>>({});
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [isLoadingEntries, setIsLoadingEntries] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Locale
  const lang = getCurrentLanguage();
  const dateLocale = useMemo(() => getDateLocale(lang), [lang]);
  const dayHeaders = useMemo(() => getDayOfWeekHeaders(dateLocale), [dateLocale]);
  const calendarDays = useMemo(() => getCalendarDays(currentMonth), [currentMonth]);

  // Formatted month title
  const monthTitle = useMemo(
    () => format(currentMonth, "MMMM yyyy", { locale: dateLocale }),
    [currentMonth, dateLocale],
  );

  // Formatted selected date header
  const selectedDateLabel = useMemo(
    () => format(selectedDate, "EEEE, MMMM d", { locale: dateLocale }),
    [selectedDate, dateLocale],
  );

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const fetchCalendar = useCallback(async (month: Date) => {
    setIsLoadingCalendar(true);
    try {
      const monthStr = format(month, "yyyy-MM");
      const data = await getMoodCalendarApi(monthStr);
      setCalendarData(data ?? {});
    } catch {
      // Silently fail — calendar will show no mood dots
    } finally {
      setIsLoadingCalendar(false);
    }
  }, []);

  const fetchEntries = useCallback(async (date: Date) => {
    setIsLoadingEntries(true);
    try {
      const from = format(startOfDay(date), "yyyy-MM-dd'T'HH:mm:ss");
      const to = format(endOfDay(date), "yyyy-MM-dd'T'HH:mm:ss");
      const result = await listMoodsApi({ from, to });
      setEntries(result.entries ?? []);
    } catch {
      setEntries([]);
    } finally {
      setIsLoadingEntries(false);
    }
  }, []);

  // Fetch calendar when month changes
  useEffect(() => {
    fetchCalendar(currentMonth);
  }, [currentMonth, fetchCalendar]);

  // Fetch entries when selected date changes
  useEffect(() => {
    fetchEntries(selectedDate);
  }, [selectedDate, fetchEntries]);

  // Pull-to-refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchCalendar(currentMonth), fetchEntries(selectedDate)]);
    setRefreshing(false);
  }, [currentMonth, selectedDate, fetchCalendar, fetchEntries]);

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  const goToPrevMonth = useCallback(() => {
    setCurrentMonth((prev) => subMonths(prev, 1));
  }, []);

  const goToNextMonth = useCallback(() => {
    setCurrentMonth((prev) => addMonths(prev, 1));
  }, []);

  const handleDayPress = useCallback((date: Date) => {
    setSelectedDate(date);
  }, []);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Header */}
        <Animated.View entering={FadeIn.duration(400)}>
          <Text style={styles.title}>{t("history.title")}</Text>
        </Animated.View>

        {/* Calendar Card */}
        <Animated.View entering={FadeInDown.duration(500).delay(100)}>
          <Card variant="elevated" padding="md" style={styles.calendarCard}>
            {/* Month navigation */}
            <View style={styles.monthNav}>
              <IconButton icon="chevron-back" onPress={goToPrevMonth} variant="ghost" size="sm" />
              <Text style={styles.monthTitle}>{monthTitle}</Text>
              <IconButton
                icon="chevron-forward"
                onPress={goToNextMonth}
                variant="ghost"
                size="sm"
              />
            </View>

            {/* Day-of-week headers */}
            <View style={styles.weekRow}>
              {dayHeaders.map((day, i) => (
                <View key={i} style={styles.dayHeaderCell}>
                  <Text style={styles.dayHeaderText}>{day}</Text>
                </View>
              ))}
            </View>

            {/* Calendar grid */}
            <View style={styles.calendarGrid}>
              {calendarDays.map((cell, i) => {
                if (!cell.date) {
                  return <View key={i} style={styles.dayCell} />;
                }

                const dateKey = format(cell.date, "yyyy-MM-dd");
                const moodScore = calendarData[dateKey] as MoodLevel | undefined;
                const isSelected = isSameDay(cell.date, selectedDate);
                const isDayToday = isToday(cell.date);
                const dayNumber = cell.date.getDate();

                return (
                  <Pressable
                    key={i}
                    style={styles.dayCell}
                    onPress={() => handleDayPress(cell.date!)}
                  >
                    <View
                      style={[
                        styles.dayCircle,
                        isSelected && styles.dayCircleSelected,
                        !isSelected && isDayToday && styles.dayCircleToday,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayNumber,
                          !cell.isCurrentMonth && styles.dayNumberMuted,
                          isSelected && styles.dayNumberSelected,
                        ]}
                      >
                        {dayNumber}
                      </Text>
                    </View>
                    {moodScore && cell.isCurrentMonth ? (
                      <Text style={styles.moodDot}>{moodEmojis[moodScore as MoodLevel] ?? ""}</Text>
                    ) : (
                      <View style={styles.moodDotPlaceholder} />
                    )}
                  </Pressable>
                );
              })}
            </View>

            {/* Loading overlay for calendar */}
            {isLoadingCalendar && (
              <View style={styles.calendarLoading}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            )}
          </Card>
        </Animated.View>

        {/* Selected Day Entries */}
        <Animated.View entering={FadeInDown.duration(500).delay(200)}>
          <Text style={styles.sectionTitle}>{selectedDateLabel}</Text>

          {isLoadingEntries ? (
            <View style={styles.entriesLoading}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : entries.length > 0 ? (
            <View style={styles.entriesList}>
              {entries.map((entry, index) => (
                <Animated.View key={entry.id} entering={FadeInDown.duration(400).delay(index * 80)}>
                  <MoodEntryCard
                    entry={{ ...entry, moodScore: entry.moodScore as 1 | 2 | 3 | 4 | 5 }}
                  />
                </Animated.View>
              ))}
            </View>
          ) : (
            <EmptyState
              icon="journal-outline"
              title={t("history.noEntries")}
              description={t("history.noEntriesDesc")}
              style={styles.emptyState}
            />
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: screenPadding.horizontal,
    paddingBottom: spacing.xxl,
  },
  title: {
    fontSize: 32,
    fontFamily: "SourceSerif4_700Bold",
    color: colors.text,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },

  // Calendar card
  calendarCard: {
    marginBottom: spacing.lg,
    position: "relative" as const,
  },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  monthTitle: {
    fontSize: 18,
    fontFamily: "SourceSerif4_600SemiBold",
    color: colors.text,
    textTransform: "capitalize",
  },

  // Week headers
  weekRow: {
    flexDirection: "row",
    marginBottom: spacing.xs,
  },
  dayHeaderCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  dayHeaderText: {
    fontSize: 12,
    fontFamily: "SourceSerif4_600SemiBold",
    color: colors.textTertiary,
    textTransform: "uppercase",
  },

  // Calendar grid
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: "14.285%" as unknown as number,
    alignItems: "center",
    paddingVertical: 2,
    minHeight: 48,
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCircleSelected: {
    backgroundColor: colors.primary,
  },
  dayCircleToday: {
    backgroundColor: colors.primaryMuted,
  },
  dayNumber: {
    fontSize: 14,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.text,
  },
  dayNumberMuted: {
    color: colors.textTertiary,
  },
  dayNumberSelected: {
    color: colors.textInverse,
    fontFamily: "SourceSerif4_700Bold",
  },
  moodDot: {
    fontSize: 10,
    lineHeight: 14,
    textAlign: "center",
    marginTop: 1,
  },
  moodDotPlaceholder: {
    height: 14,
    marginTop: 1,
  },

  // Calendar loading
  calendarLoading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.5)",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.xl,
  },

  // Section title
  sectionTitle: {
    fontSize: 16,
    fontFamily: "SourceSerif4_600SemiBold",
    color: colors.text,
    marginBottom: spacing.md,
    textTransform: "capitalize",
  },

  // Entries
  entriesList: {
    gap: spacing.md,
  },
  entriesLoading: {
    paddingVertical: spacing.xl,
    alignItems: "center",
  },
  emptyState: {
    paddingVertical: spacing.lg,
  },
});
