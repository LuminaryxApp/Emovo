import {
  createMoodSchema,
  updateMoodSchema,
  moodQuerySchema,
  calendarQuerySchema,
} from "@emovo/shared";
import type { FastifyInstance } from "fastify";

import { MoodService } from "../services/mood.service.js";
import { StatsService } from "../services/stats.service.js";

export async function moodRoutes(fastify: FastifyInstance) {
  const moodService = new MoodService();
  const statsService = new StatsService();

  // All mood routes require authentication
  fastify.addHook("preHandler", fastify.authenticate);

  /**
   * POST /moods
   * Create a mood entry. Idempotent via clientEntryId.
   */
  fastify.post("/moods", async (request, reply) => {
    const input = createMoodSchema.parse(request.body);
    const entry = await moodService.createEntry(request.userId, input);

    return reply.status(201).send({ data: entry });
  });

  /**
   * GET /moods
   * List mood entries with cursor pagination.
   */
  fastify.get("/moods", async (request, reply) => {
    const query = moodQuerySchema.parse(request.query);
    const result = await moodService.listEntries(request.userId, {
      cursor: query.cursor,
      limit: query.limit,
      from: query.from,
      to: query.to,
    });

    return reply.send({
      data: result.entries,
      meta: { cursor: result.nextCursor },
    });
  });

  /**
   * GET /moods/calendar?month=YYYY-MM
   * Returns average mood per day for the given month.
   */
  fastify.get("/moods/calendar", async (request, reply) => {
    const query = calendarQuerySchema.parse(request.query);
    const result = await statsService.getMoodCalendar(request.userId, query.month);
    return reply.send({ data: result });
  });

  /**
   * GET /moods/:id
   */
  fastify.get("/moods/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const entry = await moodService.getEntry(request.userId, id);

    return reply.send({ data: entry });
  });

  /**
   * PATCH /moods/:id
   */
  fastify.patch("/moods/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateMoodSchema.parse(request.body);
    const entry = await moodService.updateEntry(request.userId, id, input);

    return reply.send({ data: entry });
  });

  /**
   * DELETE /moods/:id
   */
  fastify.delete("/moods/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    await moodService.deleteEntry(request.userId, id);

    return reply.status(204).send();
  });
}
