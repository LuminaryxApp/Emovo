import { statsQuerySchema } from "@emovo/shared";
import type { FastifyInstance } from "fastify";

import { StatsService } from "../services/stats.service.js";

export async function statsRoutes(fastify: FastifyInstance) {
  const statsService = new StatsService();

  fastify.addHook("preHandler", fastify.authenticate);

  /**
   * GET /stats/summary
   */
  fastify.get("/stats/summary", async (request, reply) => {
    const query = statsQuerySchema.parse(request.query);
    const result = await statsService.getSummary(request.userId, query.period, query.date);
    return reply.send({ data: result });
  });

  /**
   * GET /stats/trend
   */
  fastify.get("/stats/trend", async (request, reply) => {
    const query = statsQuerySchema.parse(request.query);
    const result = await statsService.getTrend(request.userId, query.period, query.date);
    return reply.send({ data: result });
  });

  /**
   * GET /stats/triggers
   */
  fastify.get("/stats/triggers", async (request, reply) => {
    const query = statsQuerySchema.parse(request.query);
    const result = await statsService.getTriggerBreakdown(request.userId, query.period, query.date);
    return reply.send({ data: result });
  });
}
