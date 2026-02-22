import type { CreateReportInput, ResolveReportInput } from "@emovo/shared";
import { eq, and, sql, desc, count } from "drizzle-orm";

import { db } from "../config/database.js";
import { comments } from "../db/schema/comments.js";
import { messages } from "../db/schema/messages.js";
import { posts } from "../db/schema/posts.js";
import { reports } from "../db/schema/reports.js";
import { users } from "../db/schema/users.js";
import { ConflictError, NotFoundError } from "../utils/errors.js";

// ---------------------------------------------------------------------------
// Cursor helpers
// ---------------------------------------------------------------------------

interface CursorData {
  createdAt: string;
  id: string;
}

function encodeCursor(data: CursorData): string {
  return Buffer.from(JSON.stringify(data)).toString("base64url");
}

function decodeCursor(cursor: string): CursorData | null {
  try {
    const json = Buffer.from(cursor, "base64url").toString("utf-8");
    const parsed = JSON.parse(json) as CursorData;
    if (!parsed.createdAt || !parsed.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class ModerationService {
  /**
   * Submit a report. Throws ConflictError if the user already reported this target.
   */
  async createReport(reporterId: string, input: CreateReportInput) {
    try {
      const [report] = await db
        .insert(reports)
        .values({
          reporterId,
          targetType: input.targetType,
          targetId: input.targetId,
          reason: input.reason,
          description: input.description ?? null,
        })
        .returning();

      return {
        ...report,
        createdAt: report.createdAt.toISOString(),
        reviewedAt: report.reviewedAt?.toISOString() ?? null,
      };
    } catch (err: unknown) {
      // Unique constraint violation = duplicate report
      if (err instanceof Error && "code" in err && (err as { code: string }).code === "23505") {
        throw new ConflictError("You have already reported this content");
      }
      throw err;
    }
  }

  /**
   * List reports with optional status filter. Cursor-paginated.
   * Includes reporter info and target content preview.
   */
  async listReports(options: { status?: string; cursor?: string; limit: number }) {
    const { status, cursor, limit } = options;

    const conditions = [];

    if (status) {
      conditions.push(eq(reports.status, status));
    }

    if (cursor) {
      const decoded = decodeCursor(cursor);
      if (decoded) {
        conditions.push(
          sql`(${reports.createdAt}, ${reports.id}) < (${decoded.createdAt}::timestamptz, ${decoded.id}::uuid)`,
        );
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select({
        id: reports.id,
        reporterId: reports.reporterId,
        targetType: reports.targetType,
        targetId: reports.targetId,
        reason: reports.reason,
        description: reports.description,
        status: reports.status,
        reviewedBy: reports.reviewedBy,
        reviewedAt: reports.reviewedAt,
        actionTaken: reports.actionTaken,
        adminNote: reports.adminNote,
        createdAt: reports.createdAt,
        reporterName: users.displayName,
      })
      .from(reports)
      .innerJoin(users, eq(reports.reporterId, users.id))
      .where(whereClause)
      .orderBy(desc(reports.createdAt), desc(reports.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;

    // Fetch target content previews
    const enrichedRows = await Promise.all(
      pageRows.map(async (row) => {
        let targetContent: string | undefined;
        let targetAuthor: { id: string; displayName: string } | undefined;

        if (row.targetType === "post") {
          const [post] = await db
            .select({
              content: posts.content,
              userId: posts.userId,
              displayName: users.displayName,
            })
            .from(posts)
            .innerJoin(users, eq(posts.userId, users.id))
            .where(eq(posts.id, row.targetId))
            .limit(1);
          if (post) {
            targetContent = post.content.slice(0, 200);
            targetAuthor = {
              id: post.userId,
              displayName: post.displayName,
            };
          }
        } else if (row.targetType === "comment") {
          const [comment] = await db
            .select({
              content: comments.content,
              userId: comments.userId,
              displayName: users.displayName,
            })
            .from(comments)
            .innerJoin(users, eq(comments.userId, users.id))
            .where(eq(comments.id, row.targetId))
            .limit(1);
          if (comment) {
            targetContent = comment.content.slice(0, 200);
            targetAuthor = {
              id: comment.userId,
              displayName: comment.displayName,
            };
          }
        } else if (row.targetType === "message") {
          const [message] = await db
            .select({
              content: messages.content,
              senderId: messages.senderId,
              displayName: users.displayName,
            })
            .from(messages)
            .innerJoin(users, eq(messages.senderId, users.id))
            .where(eq(messages.id, row.targetId))
            .limit(1);
          if (message) {
            targetContent = message.content.slice(0, 200);
            targetAuthor = {
              id: message.senderId,
              displayName: message.displayName,
            };
          }
        } else if (row.targetType === "user") {
          const [user] = await db
            .select({
              id: users.id,
              displayName: users.displayName,
            })
            .from(users)
            .where(eq(users.id, row.targetId))
            .limit(1);
          if (user) {
            targetAuthor = {
              id: user.id,
              displayName: user.displayName,
            };
          }
        }

        return {
          id: row.id,
          reporterId: row.reporterId,
          targetType: row.targetType,
          targetId: row.targetId,
          reason: row.reason,
          description: row.description,
          status: row.status,
          reviewedBy: row.reviewedBy,
          reviewedAt: row.reviewedAt?.toISOString() ?? null,
          actionTaken: row.actionTaken,
          adminNote: row.adminNote,
          createdAt: row.createdAt.toISOString(),
          reporter: {
            id: row.reporterId,
            displayName: row.reporterName,
          },
          targetContent,
          targetAuthor,
        };
      }),
    );

    const nextCursor = hasMore
      ? encodeCursor({
          createdAt: pageRows[pageRows.length - 1].createdAt.toISOString(),
          id: pageRows[pageRows.length - 1].id,
        })
      : null;

    return { reports: enrichedRows, nextCursor };
  }

  /**
   * Get a single report by ID with full context.
   */
  async getReportById(reportId: string) {
    // Direct query instead of reusing listReports
    const [row] = await db
      .select({
        id: reports.id,
        reporterId: reports.reporterId,
        targetType: reports.targetType,
        targetId: reports.targetId,
        reason: reports.reason,
        description: reports.description,
        status: reports.status,
        reviewedBy: reports.reviewedBy,
        reviewedAt: reports.reviewedAt,
        actionTaken: reports.actionTaken,
        adminNote: reports.adminNote,
        createdAt: reports.createdAt,
        reporterName: users.displayName,
      })
      .from(reports)
      .innerJoin(users, eq(reports.reporterId, users.id))
      .where(eq(reports.id, reportId))
      .limit(1);

    if (!row) throw new NotFoundError("Report not found");

    // Reuse listReports enrichment logic inline
    let targetContent: string | undefined;
    let targetAuthor: { id: string; displayName: string } | undefined;

    if (row.targetType === "post") {
      const [post] = await db
        .select({
          content: posts.content,
          userId: posts.userId,
          displayName: users.displayName,
        })
        .from(posts)
        .innerJoin(users, eq(posts.userId, users.id))
        .where(eq(posts.id, row.targetId))
        .limit(1);
      if (post) {
        targetContent = post.content;
        targetAuthor = {
          id: post.userId,
          displayName: post.displayName,
        };
      }
    } else if (row.targetType === "comment") {
      const [comment] = await db
        .select({
          content: comments.content,
          userId: comments.userId,
          displayName: users.displayName,
        })
        .from(comments)
        .innerJoin(users, eq(comments.userId, users.id))
        .where(eq(comments.id, row.targetId))
        .limit(1);
      if (comment) {
        targetContent = comment.content;
        targetAuthor = {
          id: comment.userId,
          displayName: comment.displayName,
        };
      }
    } else if (row.targetType === "message") {
      const [message] = await db
        .select({
          content: messages.content,
          senderId: messages.senderId,
          displayName: users.displayName,
        })
        .from(messages)
        .innerJoin(users, eq(messages.senderId, users.id))
        .where(eq(messages.id, row.targetId))
        .limit(1);
      if (message) {
        targetContent = message.content;
        targetAuthor = {
          id: message.senderId,
          displayName: message.displayName,
        };
      }
    } else if (row.targetType === "user") {
      const [user] = await db
        .select({ id: users.id, displayName: users.displayName })
        .from(users)
        .where(eq(users.id, row.targetId))
        .limit(1);
      if (user) {
        targetAuthor = { id: user.id, displayName: user.displayName };
      }
    }

    return {
      id: row.id,
      reporterId: row.reporterId,
      targetType: row.targetType,
      targetId: row.targetId,
      reason: row.reason,
      description: row.description,
      status: row.status,
      reviewedBy: row.reviewedBy,
      reviewedAt: row.reviewedAt?.toISOString() ?? null,
      actionTaken: row.actionTaken,
      adminNote: row.adminNote,
      createdAt: row.createdAt.toISOString(),
      reporter: { id: row.reporterId, displayName: row.reporterName },
      targetContent,
      targetAuthor,
    };
  }

  /**
   * Resolve a report: update status + action, and optionally take action on the content/user.
   */
  async resolveReport(adminId: string, reportId: string, input: ResolveReportInput) {
    const [report] = await db.select().from(reports).where(eq(reports.id, reportId)).limit(1);

    if (!report) throw new NotFoundError("Report not found");

    // Update the report
    const [updated] = await db
      .update(reports)
      .set({
        status: input.status,
        actionTaken: input.actionTaken ?? "none",
        adminNote: input.adminNote ?? null,
        reviewedBy: adminId,
        reviewedAt: new Date(),
      })
      .where(eq(reports.id, reportId))
      .returning();

    // Execute action on the target
    if (input.actionTaken === "content_removed") {
      if (report.targetType === "post") {
        await db.delete(posts).where(eq(posts.id, report.targetId));
      } else if (report.targetType === "comment") {
        // Get the postId before deleting, to decrement commentCount
        const [comment] = await db
          .select({ postId: comments.postId })
          .from(comments)
          .where(eq(comments.id, report.targetId))
          .limit(1);

        await db.delete(comments).where(eq(comments.id, report.targetId));

        if (comment) {
          await db
            .update(posts)
            .set({
              commentCount: sql`GREATEST(${posts.commentCount} - 1, 0)`,
            })
            .where(eq(posts.id, comment.postId));
        }
      } else if (report.targetType === "message") {
        await db.delete(messages).where(eq(messages.id, report.targetId));
      }
    }

    if (input.actionTaken === "user_suspended") {
      // Need to figure out who the target user is
      const targetUserId = await this.getTargetUserId(report.targetType, report.targetId);
      if (targetUserId) {
        const days = input.suspendDays ?? 7;
        const suspendedUntil = new Date();
        suspendedUntil.setDate(suspendedUntil.getDate() + days);
        await db.update(users).set({ suspendedUntil }).where(eq(users.id, targetUserId));
      }
    }

    if (input.actionTaken === "user_banned") {
      const targetUserId = await this.getTargetUserId(report.targetType, report.targetId);
      if (targetUserId) {
        await db
          .update(users)
          .set({
            bannedAt: new Date(),
            banReason: input.adminNote ?? "Banned by admin",
          })
          .where(eq(users.id, targetUserId));
      }
    }

    return {
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      reviewedAt: updated.reviewedAt?.toISOString() ?? null,
    };
  }

  /**
   * Get pending report count for admin badge.
   */
  async getReportStats() {
    const [result] = await db
      .select({ pending: count() })
      .from(reports)
      .where(eq(reports.status, "pending"));

    return { pending: result?.pending ?? 0 };
  }

  /**
   * Unban a user: clear bannedAt, banReason, suspendedUntil.
   */
  async unbanUser(userId: string) {
    const result = await db
      .update(users)
      .set({
        bannedAt: null,
        banReason: null,
        suspendedUntil: null,
      })
      .where(eq(users.id, userId))
      .returning({ id: users.id });

    if (result.length === 0) {
      throw new NotFoundError("User not found");
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Given a target type + ID, resolve the user ID who created that content.
   */
  private async getTargetUserId(targetType: string, targetId: string): Promise<string | null> {
    if (targetType === "user") return targetId;

    if (targetType === "post") {
      const [post] = await db
        .select({ userId: posts.userId })
        .from(posts)
        .where(eq(posts.id, targetId))
        .limit(1);
      return post?.userId ?? null;
    }

    if (targetType === "comment") {
      const [comment] = await db
        .select({ userId: comments.userId })
        .from(comments)
        .where(eq(comments.id, targetId))
        .limit(1);
      return comment?.userId ?? null;
    }

    if (targetType === "message") {
      const [message] = await db
        .select({ senderId: messages.senderId })
        .from(messages)
        .where(eq(messages.id, targetId))
        .limit(1);
      return message?.senderId ?? null;
    }

    return null;
  }
}
