import {
  createReportSchema,
  resolveReportSchema,
  reportQuerySchema,
  adminUserSearchSchema,
  setVerificationSchema,
} from "@emovo/shared";
import { eq, and, sql, desc } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { FastifyInstance } from "fastify";

import { db } from "../config/database.js";
import { users } from "../db/schema/users.js";
import { ModerationService } from "../services/moderation.service.js";
import { NotFoundError } from "../utils/errors.js";

export async function moderationRoutes(fastify: FastifyInstance) {
  const moderationService = new ModerationService();

  // =========================================================================
  //  USER ENDPOINTS (require auth + not banned)
  // =========================================================================

  /**
   * POST /moderation/reports
   * Submit a report.
   */
  fastify.post(
    "/moderation/reports",
    { preHandler: [fastify.authenticate, fastify.requireNotBanned] },
    async (request, reply) => {
      const input = createReportSchema.parse(request.body);
      const report = await moderationService.createReport(request.userId, input);

      return reply.status(201).send({ data: report });
    },
  );

  // =========================================================================
  //  ADMIN ENDPOINTS (require auth + admin)
  // =========================================================================

  /**
   * GET /moderation/reports
   * List reports with optional filters.
   */
  fastify.get(
    "/moderation/reports",
    { preHandler: [fastify.authenticate, fastify.requireAdmin] },
    async (request, reply) => {
      const query = reportQuerySchema.parse(request.query);
      const result = await moderationService.listReports({
        status: query.status,
        cursor: query.cursor,
        limit: query.limit,
      });

      return reply.send({
        data: result.reports,
        meta: { cursor: result.nextCursor },
      });
    },
  );

  /**
   * GET /moderation/reports/stats
   * Get pending report count.
   */
  fastify.get(
    "/moderation/reports/stats",
    { preHandler: [fastify.authenticate, fastify.requireAdmin] },
    async (_request, reply) => {
      const stats = await moderationService.getReportStats();
      return reply.send({ data: stats });
    },
  );

  /**
   * GET /moderation/reports/:id
   * Get a single report with full context.
   */
  fastify.get(
    "/moderation/reports/:id",
    { preHandler: [fastify.authenticate, fastify.requireAdmin] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const report = await moderationService.getReportById(id);

      return reply.send({ data: report });
    },
  );

  /**
   * PATCH /moderation/reports/:id
   * Resolve / take action on a report.
   */
  fastify.patch(
    "/moderation/reports/:id",
    { preHandler: [fastify.authenticate, fastify.requireAdmin] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = resolveReportSchema.parse(request.body);
      const report = await moderationService.resolveReport(request.userId, id, input);

      return reply.send({ data: report });
    },
  );

  /**
   * POST /moderation/users/:id/unban
   * Unban a user.
   */
  fastify.post(
    "/moderation/users/:id/unban",
    { preHandler: [fastify.authenticate, fastify.requireAdmin] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      await moderationService.unbanUser(id);

      return reply.status(204).send();
    },
  );

  // =========================================================================
  //  ADMIN USER MANAGEMENT
  // =========================================================================

  /**
   * GET /admin/users
   * Search and list users (admin only).
   */
  fastify.get(
    "/admin/users",
    { preHandler: [fastify.authenticate, fastify.requireAdmin] },
    async (request, reply) => {
      const query = adminUserSearchSchema.parse(request.query);
      const { q, cursor, limit } = query;

      const conditions: SQL[] = [];

      if (q) {
        const pattern = `%${q}%`;
        conditions.push(
          sql`(${users.displayName} ILIKE ${pattern} OR ${users.username} ILIKE ${pattern} OR ${users.email} ILIKE ${pattern})`,
        );
      }

      if (cursor) {
        try {
          const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf-8"));
          if (parsed.createdAt && parsed.id) {
            conditions.push(
              sql`(${users.createdAt}, ${users.id}) < (${parsed.createdAt}::timestamptz, ${parsed.id}::uuid)`,
            );
          }
        } catch {
          // Invalid cursor, ignore
        }
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const rows = await db
        .select({
          id: users.id,
          displayName: users.displayName,
          username: users.username,
          email: users.email,
          verificationTier: users.verificationTier,
          isAdmin: users.isAdmin,
          bannedAt: users.bannedAt,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(whereClause)
        .orderBy(desc(users.createdAt), desc(users.id))
        .limit(limit + 1);

      const hasMore = rows.length > limit;
      const pageRows = hasMore ? rows.slice(0, limit) : rows;

      const nextCursor = hasMore
        ? Buffer.from(
            JSON.stringify({
              createdAt: pageRows[pageRows.length - 1].createdAt.toISOString(),
              id: pageRows[pageRows.length - 1].id,
            }),
          ).toString("base64url")
        : null;

      return reply.send({
        data: pageRows.map((r) => ({
          id: r.id,
          displayName: r.displayName,
          username: r.username,
          email: r.email,
          verificationTier: r.verificationTier,
          isAdmin: r.isAdmin,
          bannedAt: r.bannedAt?.toISOString() ?? null,
          createdAt: r.createdAt.toISOString(),
        })),
        meta: { cursor: nextCursor },
      });
    },
  );

  /**
   * PATCH /admin/users/:id/verification
   * Set verification tier for a user (admin only).
   */
  fastify.patch(
    "/admin/users/:id/verification",
    { preHandler: [fastify.authenticate, fastify.requireAdmin] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { tier } = setVerificationSchema.parse(request.body);

      const [updated] = await db
        .update(users)
        .set({
          verificationTier: tier,
          verifiedAt: tier === "none" ? null : new Date(),
          updatedAt: new Date(),
        })
        .where(eq(users.id, id))
        .returning({
          id: users.id,
          displayName: users.displayName,
          username: users.username,
          email: users.email,
          verificationTier: users.verificationTier,
          isAdmin: users.isAdmin,
          bannedAt: users.bannedAt,
          createdAt: users.createdAt,
        });

      if (!updated) throw new NotFoundError("User not found");

      return reply.send({
        data: {
          id: updated.id,
          displayName: updated.displayName,
          username: updated.username,
          email: updated.email,
          verificationTier: updated.verificationTier,
          isAdmin: updated.isAdmin,
          bannedAt: updated.bannedAt?.toISOString() ?? null,
          createdAt: updated.createdAt.toISOString(),
        },
      });
    },
  );
}
