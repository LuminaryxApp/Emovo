import { eq } from "drizzle-orm";

import { db, client } from "../config/database.js";
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

async function getUserTimezone(userId: string): Promise<string> {
  const [user] = await db
    .select({ timezone: users.timezone })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return user?.timezone || "UTC";
}

export class StatsService {
  /**
   * Summary stats: average mood, entry count, mood distribution, top triggers.
   */
  async getSummary(userId: string, period: Period, dateStr?: string) {
    const tz = await getUserTimezone(userId);
    const { start, end } = getDateRange(period, dateStr, tz);
    const startIso = start.toISOString();
    const endIso = end.toISOString();

    // Average mood and count
    const statsRows = await client`
      SELECT
        COALESCE(AVG(mood_score)::numeric(3,2), 0) AS avg_mood,
        COUNT(*)::int AS entry_count
      FROM mood_entries
      WHERE user_id = ${userId}
        AND logged_at >= ${startIso}::timestamptz
        AND logged_at < ${endIso}::timestamptz
    `;

    // Mood distribution
    const distRows = await client`
      SELECT
        mood_score AS score,
        COUNT(*)::int AS count
      FROM mood_entries
      WHERE user_id = ${userId}
        AND logged_at >= ${startIso}::timestamptz
        AND logged_at < ${endIso}::timestamptz
      GROUP BY mood_score
      ORDER BY mood_score
    `;

    const moodDistribution: Record<number, number> = {};
    for (const row of distRows) {
      moodDistribution[row.score] = row.count;
    }

    // Top triggers with average mood
    const triggerRows = await client`
      SELECT
        t.id AS trigger_id,
        t.name AS trigger_name,
        t.icon AS trigger_icon,
        t.is_default AS trigger_is_default,
        COUNT(*)::int AS count,
        COALESCE(AVG(me.mood_score)::numeric(3,2), 0) AS avg_mood
      FROM entry_triggers et
      INNER JOIN mood_entries me ON et.entry_id = me.id
      INNER JOIN triggers t ON et.trigger_id = t.id
      WHERE me.user_id = ${userId}
        AND me.logged_at >= ${startIso}::timestamptz
        AND me.logged_at < ${endIso}::timestamptz
      GROUP BY t.id, t.name, t.icon, t.is_default
      ORDER BY COUNT(*) DESC
      LIMIT 10
    `;

    return {
      avgMood: Number(statsRows[0].avg_mood),
      entryCount: statsRows[0].entry_count,
      moodDistribution,
      topTriggers: triggerRows.map((t: Record<string, unknown>) => ({
        trigger: {
          id: t.trigger_id,
          name: t.trigger_name,
          icon: t.trigger_icon,
          isDefault: t.trigger_is_default,
        },
        count: t.count,
        avgMood: Number(t.avg_mood),
      })),
      period: { start: startIso, end: endIso },
    };
  }

  /**
   * Mood trend: data points over time (daily for week/month, monthly for year).
   */
  async getTrend(userId: string, period: Period, dateStr?: string) {
    const tz = await getUserTimezone(userId);
    const { start, end } = getDateRange(period, dateStr, tz);
    const startIso = start.toISOString();
    const endIso = end.toISOString();

    const dataPoints =
      period === "year"
        ? await client`
            SELECT
              date_trunc('month', logged_at)::text AS date,
              COALESCE(AVG(mood_score)::numeric(3,2), 0) AS avg_mood,
              COUNT(*)::int AS count
            FROM mood_entries
            WHERE user_id = ${userId}
              AND logged_at >= ${startIso}::timestamptz
              AND logged_at < ${endIso}::timestamptz
            GROUP BY 1
            ORDER BY 1
          `
        : await client`
            SELECT
              date_trunc('day', logged_at)::text AS date,
              COALESCE(AVG(mood_score)::numeric(3,2), 0) AS avg_mood,
              COUNT(*)::int AS count
            FROM mood_entries
            WHERE user_id = ${userId}
              AND logged_at >= ${startIso}::timestamptz
              AND logged_at < ${endIso}::timestamptz
            GROUP BY 1
            ORDER BY 1
          `;

    return {
      dataPoints: dataPoints.map((dp: Record<string, unknown>) => ({
        date: dp.date,
        avgMood: Number(dp.avg_mood),
        count: dp.count,
      })),
      period: { start: startIso, end: endIso },
    };
  }

  /**
   * Trigger frequency breakdown.
   */
  async getTriggerBreakdown(userId: string, period: Period, dateStr?: string) {
    const tz = await getUserTimezone(userId);
    const { start, end } = getDateRange(period, dateStr, tz);
    const startIso = start.toISOString();
    const endIso = end.toISOString();

    const breakdown = await client`
      SELECT
        t.id AS trigger_id,
        t.name AS trigger_name,
        t.icon AS trigger_icon,
        t.is_default AS trigger_is_default,
        COUNT(*)::int AS count,
        COALESCE(AVG(me.mood_score)::numeric(3,2), 0) AS avg_mood
      FROM entry_triggers et
      INNER JOIN mood_entries me ON et.entry_id = me.id
      INNER JOIN triggers t ON et.trigger_id = t.id
      WHERE me.user_id = ${userId}
        AND me.logged_at >= ${startIso}::timestamptz
        AND me.logged_at < ${endIso}::timestamptz
      GROUP BY t.id, t.name, t.icon, t.is_default
      ORDER BY COUNT(*) DESC
    `;

    return {
      triggerBreakdown: breakdown.map((b: Record<string, unknown>) => ({
        trigger: {
          id: b.trigger_id,
          name: b.trigger_name,
          icon: b.trigger_icon,
          isDefault: b.trigger_is_default,
        },
        count: b.count,
        avgMood: Number(b.avg_mood),
      })),
      period: { start: startIso, end: endIso },
    };
  }

  /**
   * Streak data: current streak (consecutive days from today backward) and longest streak ever.
   */
  async getStreak(userId: string) {
    const tz = await getUserTimezone(userId);

    // Get distinct dates (in user's timezone) with mood entries, ordered descending
    const rows = await client`
      SELECT DATE(logged_at AT TIME ZONE ${tz})::text AS date
      FROM mood_entries
      WHERE user_id = ${userId}
      GROUP BY 1
      ORDER BY 1 DESC
    `;

    if (rows.length === 0) {
      return { currentStreak: 0, longestStreak: 0, lastLogDate: null };
    }

    const dates = rows.map((r: Record<string, unknown>) => r.date as string);
    const lastLogDate = dates[0];

    // Calculate current streak: starting from today, count consecutive days backward
    const now = new Date();
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

    longestStreak = Math.max(longestStreak, currentStreak);

    return { currentStreak, longestStreak, lastLogDate };
  }

  /**
   * Mood calendar: average mood per day for a given month (YYYY-MM).
   */
  async getMoodCalendar(userId: string, month: string) {
    const tz = await getUserTimezone(userId);

    const [yearStr, monthStr] = month.split("-");
    const year = parseInt(yearStr, 10);
    const monthStart = `${year}-${monthStr}-01`;

    const rows = await client`
      SELECT
        DATE(logged_at AT TIME ZONE ${tz})::text AS date,
        ROUND(AVG(mood_score))::int AS avg_mood
      FROM mood_entries
      WHERE user_id = ${userId}
        AND DATE(logged_at AT TIME ZONE ${tz}) >= ${monthStart}::date
        AND DATE(logged_at AT TIME ZONE ${tz}) < (${monthStart}::date + interval '1 month')::date
      GROUP BY 1
      ORDER BY 1 ASC
    `;

    const calendar: Record<string, number> = {};
    for (const row of rows) {
      calendar[row.date] = Number(row.avg_mood);
    }

    return calendar;
  }
}
