import { eq, and, desc } from "drizzle-orm";

import { db, client } from "../config/database.js";
import { notifications } from "../db/schema/notifications.js";
import { pushTokens } from "../db/schema/push-tokens.js";

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: string;
}

export class PushService {
  /**
   * Register or update a push token for a user.
   */
  async registerToken(userId: string, token: string, platform: string) {
    // Upsert: if token already exists, update userId (device may change owners)
    await client`
      INSERT INTO push_tokens (user_id, token, platform)
      VALUES (${userId}, ${token}, ${platform})
      ON CONFLICT (token) DO UPDATE SET user_id = ${userId}
    `;
  }

  /**
   * Remove a push token.
   */
  async removeToken(token: string) {
    await db.delete(pushTokens).where(eq(pushTokens.token, token));
  }

  /**
   * Send a push notification via Expo Push API and save to notifications table.
   */
  async sendPush(
    userId: string,
    type: string,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ) {
    // Save notification to DB
    await db.insert(notifications).values({
      userId,
      type,
      title,
      body,
      data: data ?? null,
    });

    // Get user's push tokens
    const tokens = await db
      .select({ token: pushTokens.token })
      .from(pushTokens)
      .where(eq(pushTokens.userId, userId));

    if (tokens.length === 0) return;

    // Send via Expo Push API
    const messages: PushMessage[] = tokens.map((t) => ({
      to: t.token,
      title,
      body,
      data,
      sound: "default",
    }));

    try {
      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(messages),
      });
    } catch {
      // Silently fail — push delivery is best-effort
    }
  }

  /**
   * Get notifications for a user.
   */
  async getNotifications(userId: string, limit = 50, cursor?: string) {
    let query = db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit + 1);

    if (cursor) {
      const cursorDate = new Date(cursor);
      query = db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt))
        .limit(limit + 1);
      // Simple cursor — use createdAt
      const rows = await client`
        SELECT * FROM notifications
        WHERE user_id = ${userId}
          AND created_at < ${cursorDate.toISOString()}::timestamptz
        ORDER BY created_at DESC
        LIMIT ${limit + 1}
      `;
      const hasMore = rows.length > limit;
      const data = hasMore ? rows.slice(0, limit) : rows;
      return {
        notifications: data.map(this.mapNotification),
        cursor: hasMore ? data[data.length - 1].created_at : null,
      };
    }

    const rows = await query;
    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;

    return {
      notifications: data.map(this.mapNotification),
      cursor: hasMore ? (data[data.length - 1].createdAt?.toISOString() ?? null) : null,
    };
  }

  /**
   * Mark a notification as read.
   */
  async markRead(userId: string, notificationId: string) {
    const [updated] = await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
      .returning({ id: notifications.id });

    return !!updated;
  }

  /**
   * Get unread notification count.
   */
  async getUnreadCount(userId: string): Promise<number> {
    const rows = await client`
      SELECT COUNT(*)::int AS count
      FROM notifications
      WHERE user_id = ${userId} AND read_at IS NULL
    `;
    return rows[0]?.count ?? 0;
  }

  private mapNotification(row: Record<string, unknown>) {
    return {
      id: row.id ?? row.id,
      type: row.type,
      title: row.title,
      body: row.body,
      data: row.data ?? null,
      readAt: row.read_at
        ? new Date(row.read_at as string).toISOString()
        : row.readAt
          ? (row.readAt as Date).toISOString()
          : null,
      createdAt: row.created_at
        ? new Date(row.created_at as string).toISOString()
        : row.createdAt
          ? (row.createdAt as Date).toISOString()
          : new Date().toISOString(),
    };
  }
}
