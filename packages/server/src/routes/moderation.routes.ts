import { createReportSchema, resolveReportSchema, reportQuerySchema } from "@emovo/shared";
import type { FastifyInstance } from "fastify";

import { ModerationService } from "../services/moderation.service.js";

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
}
