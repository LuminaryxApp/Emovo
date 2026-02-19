import { sql, eq, and, gte, lt } from "drizzle-orm";

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
          gte(moodEntries.loggedAt, start),
          lt(moodEntries.loggedAt, end),
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
          gte(moodEntries.loggedAt, start),
          lt(moodEntries.loggedAt, end),
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
          gte(moodEntries.loggedAt, start),
          lt(moodEntries.loggedAt, end),
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
          gte(moodEntries.loggedAt, start),
          lt(moodEntries.loggedAt, end),
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
          gte(moodEntries.loggedAt, start),
          lt(moodEntries.loggedAt, end),
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
}
