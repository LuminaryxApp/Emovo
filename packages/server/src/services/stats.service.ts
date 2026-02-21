import { sql, eq, and } from "drizzle-orm";

import { db } from "../config/database.js";
import { entryTriggers } from "../db/schema/entry-triggers.js";
import { moodEntries } from "../db/schema/mood-entries.js";
import { triggers } from "../db/schema/triggers.js";
import { users } from "../db/schema/users.js";

type Period = "week" | "month" | "year";

interface DateRange {
  start: Date;
  end: Date;
}

function getDateRange(period: Period, dateStr: string | undefined, _timezone: string): DateRange {
  const baseDate = dateStr ? new Date(dateStr) : new Date();

  if (period === "week") {
    const start = new Date(baseDate);
    start.setDate(start.getDate() - start.getDay());
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return { start, end };
  } else if (period === "month") {
    const start = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
    const end = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 1);
    return { start, end };
  } else {
    const start = new Date(baseDate.getFullYear(), 0, 1);
    const end = new Date(baseDate.getFullYear() + 1, 0, 1);
    return { start, end };
  }
}

export class StatsService {
  /**
   * Summary stats: average mood, entry count, mood distribution, top triggers.
   */
  async getSummary(userId: string, period: Period, dateStr?: string) {
    // Get user timezone
    const [user] = await db
      .select({ timezone: users.timezone })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const tz = user?.timezone || "UTC";
    const { start, end } = getDateRange(period, dateStr, tz);

    // Average mood and count
    const [stats] = await db
      .select({
        avgMood: sql<number>`COALESCE(AVG(${moodEntries.moodScore})::numeric(3,2), 0)`,
        entryCount: sql<number>`COUNT(*)::int`,
      })
      .from(moodEntries)
      .where(
        and(
          eq(moodEntries.userId, userId),
          sql`"mood_entries"."logged_at" >= ${start.toISOString()}::timestamptz`,
          sql`"mood_entries"."logged_at" < ${end.toISOString()}::timestamptz`,
        ),
      );

    // Mood distribution
    const distribution = await db
      .select({
        score: moodEntries.moodScore,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(moodEntries)
      .where(
        and(
          eq(moodEntries.userId, userId),
          sql`"mood_entries"."logged_at" >= ${start.toISOString()}::timestamptz`,
          sql`"mood_entries"."logged_at" < ${end.toISOString()}::timestamptz`,
        ),
      )
      .groupBy(moodEntries.moodScore)
      .orderBy(moodEntries.moodScore);

    const moodDistribution: Record<number, number> = {};
    for (const row of distribution) {
      moodDistribution[row.score] = row.count;
    }

    // Top triggers with average mood
    const topTriggers = await db
      .select({
        triggerId: triggers.id,
        triggerName: triggers.name,
        triggerIcon: triggers.icon,
        triggerIsDefault: triggers.isDefault,
        count: sql<number>`COUNT(*)::int`,
        avgMood: sql<number>`COALESCE(AVG(${moodEntries.moodScore})::numeric(3,2), 0)`,
      })
      .from(entryTriggers)
      .innerJoin(moodEntries, eq(entryTriggers.entryId, moodEntries.id))
      .innerJoin(triggers, eq(entryTriggers.triggerId, triggers.id))
      .where(
        and(
          eq(moodEntries.userId, userId),
          sql`"mood_entries"."logged_at" >= ${start.toISOString()}::timestamptz`,
          sql`"mood_entries"."logged_at" < ${end.toISOString()}::timestamptz`,
        ),
      )
      .groupBy(triggers.id, triggers.name, triggers.icon, triggers.isDefault)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(10);

    return {
      avgMood: Number(stats.avgMood),
      entryCount: stats.entryCount,
      moodDistribution,
      topTriggers: topTriggers.map((t) => ({
        trigger: {
          id: t.triggerId,
          name: t.triggerName,
          icon: t.triggerIcon,
          isDefault: t.triggerIsDefault,
        },
        count: t.count,
        avgMood: Number(t.avgMood),
      })),
      period: { start: start.toISOString(), end: end.toISOString() },
    };
  }

  /**
   * Mood trend: data points over time (daily for week/month, monthly for year).
   */
  async getTrend(userId: string, period: Period, dateStr?: string) {
    const [user] = await db
      .select({ timezone: users.timezone })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const tz = user?.timezone || "UTC";
    const { start, end } = getDateRange(period, dateStr, tz);

    const truncExpr =
      period === "year"
        ? sql`date_trunc('month', ${moodEntries.loggedAt})`
        : sql`date_trunc('day', ${moodEntries.loggedAt})`;

    const dataPoints = await db
      .select({
        date: sql<string>`${truncExpr}::text`,
        avgMood: sql<number>`COALESCE(AVG(${moodEntries.moodScore})::numeric(3,2), 0)`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(moodEntries)
      .where(
        and(
          eq(moodEntries.userId, userId),
          sql`"mood_entries"."logged_at" >= ${start.toISOString()}::timestamptz`,
          sql`"mood_entries"."logged_at" < ${end.toISOString()}::timestamptz`,
        ),
      )
      .groupBy(truncExpr)
      .orderBy(truncExpr);

    return {
      dataPoints: dataPoints.map((dp) => ({
        date: dp.date,
        avgMood: Number(dp.avgMood),
        count: dp.count,
      })),
      period: { start: start.toISOString(), end: end.toISOString() },
    };
  }

  /**
   * Trigger frequency breakdown.
   */
  async getTriggerBreakdown(userId: string, period: Period, dateStr?: string) {
    const [user] = await db
      .select({ timezone: users.timezone })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const tz = user?.timezone || "UTC";
    const { start, end } = getDateRange(period, dateStr, tz);

    const breakdown = await db
      .select({
        triggerId: triggers.id,
        triggerName: triggers.name,
        triggerIcon: triggers.icon,
        triggerIsDefault: triggers.isDefault,
        count: sql<number>`COUNT(*)::int`,
        avgMood: sql<number>`COALESCE(AVG(${moodEntries.moodScore})::numeric(3,2), 0)`,
      })
      .from(entryTriggers)
      .innerJoin(moodEntries, eq(entryTriggers.entryId, moodEntries.id))
      .innerJoin(triggers, eq(entryTriggers.triggerId, triggers.id))
      .where(
        and(
          eq(moodEntries.userId, userId),
          sql`"mood_entries"."logged_at" >= ${start.toISOString()}::timestamptz`,
          sql`"mood_entries"."logged_at" < ${end.toISOString()}::timestamptz`,
        ),
      )
      .groupBy(triggers.id, triggers.name, triggers.icon, triggers.isDefault)
      .orderBy(sql`COUNT(*) DESC`);

    return {
      triggerBreakdown: breakdown.map((b) => ({
        trigger: {
          id: b.triggerId,
          name: b.triggerName,
          icon: b.triggerIcon,
          isDefault: b.triggerIsDefault,
        },
        count: b.count,
        avgMood: Number(b.avgMood),
      })),
      period: { start: start.toISOString(), end: end.toISOString() },
    };
  }

  /**
   * Streak data: current streak (consecutive days from today backward) and longest streak ever.
   */
  async getStreak(userId: string) {
    // Get user timezone
    const [user] = await db
      .select({ timezone: users.timezone })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const tz = user?.timezone || "UTC";

    // Get distinct dates (in user's timezone) with mood entries, ordered descending
    const rows = await db
      .select({
        date: sql<string>`DATE(${moodEntries.loggedAt} AT TIME ZONE ${tz})::text`,
      })
      .from(moodEntries)
      .where(eq(moodEntries.userId, userId))
      .groupBy(sql`DATE(${moodEntries.loggedAt} AT TIME ZONE ${tz})`)
      .orderBy(sql`DATE(${moodEntries.loggedAt} AT TIME ZONE ${tz}) DESC`);

    if (rows.length === 0) {
      return { currentStreak: 0, longestStreak: 0, lastLogDate: null };
    }

    const dates = rows.map((r) => r.date);
    const lastLogDate = dates[0];

    // Calculate current streak: starting from today, count consecutive days backward
    const now = new Date();
    // Get today's date string in user's timezone using Intl
    const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(now);

    let currentStreak = 0;
    let checkDate = new Date(todayStr + "T00:00:00Z");

    for (const dateStr of dates) {
      const entryDate = new Date(dateStr + "T00:00:00Z");
      const diffDays = Math.round(
        (checkDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (diffDays === 0) {
        currentStreak++;
        checkDate = new Date(checkDate.getTime() - 1000 * 60 * 60 * 24);
      } else if (diffDays === 1 && currentStreak === 0) {
        // Yesterday counts if today hasn't been logged yet
        currentStreak++;
        checkDate = new Date(entryDate.getTime() - 1000 * 60 * 60 * 24);
      } else {
        break;
      }
    }

    // Calculate longest streak: iterate all dates in ascending order
    const sortedDates = [...dates].reverse();
    let longestStreak = 1;
    let runLength = 1;

    for (let i = 1; i < sortedDates.length; i++) {
      const prev = new Date(sortedDates[i - 1] + "T00:00:00Z");
      const curr = new Date(sortedDates[i] + "T00:00:00Z");
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        runLength++;
        longestStreak = Math.max(longestStreak, runLength);
      } else {
        runLength = 1;
      }
    }

    // Current streak might also be the longest
    longestStreak = Math.max(longestStreak, currentStreak);

    return { currentStreak, longestStreak, lastLogDate };
  }

  /**
   * Mood calendar: average mood per day for a given month (YYYY-MM).
   */
  async getMoodCalendar(userId: string, month: string) {
    // Get user timezone
    const [user] = await db
      .select({ timezone: users.timezone })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const tz = user?.timezone || "UTC";

    // Parse month boundaries in user's timezone
    const [yearStr, monthStr] = month.split("-");
    const year = parseInt(yearStr, 10);

    // Start of month and start of next month in user's timezone
    // We use SQL to handle timezone conversion properly
    const rows = await db
      .select({
        date: sql<string>`DATE(${moodEntries.loggedAt} AT TIME ZONE ${tz})::text`,
        avgMood: sql<number>`ROUND(AVG(${moodEntries.moodScore}))::int`,
      })
      .from(moodEntries)
      .where(
        and(
          eq(moodEntries.userId, userId),
          sql`DATE(${moodEntries.loggedAt} AT TIME ZONE ${tz}) >= ${`${year}-${monthStr}-01`}::date`,
          sql`DATE(${moodEntries.loggedAt} AT TIME ZONE ${tz}) < (${`${year}-${monthStr}-01`}::date + interval '1 month')::date`,
        ),
      )
      .groupBy(sql`DATE(${moodEntries.loggedAt} AT TIME ZONE ${tz})`)
      .orderBy(sql`DATE(${moodEntries.loggedAt} AT TIME ZONE ${tz}) ASC`);

    const calendar: Record<string, number> = {};
    for (const row of rows) {
      calendar[row.date] = Number(row.avgMood);
    }

    return calendar;
  }
}
