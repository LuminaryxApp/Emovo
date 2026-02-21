import type { FastifyInstance } from "fastify";

import { PushService } from "../services/push.service.js";

export async function notificationRoutes(fastify: FastifyInstance) {
  const pushService = new PushService();

  fastify.addHook("preHandler", fastify.authenticate);

  /**
   * GET /notifications — List user notifications
   */
  fastify.get("/", async (request, reply) => {
    const query = request.query as { cursor?: string; limit?: string };
    const limit = Math.min(parseInt(query.limit || "50", 10), 100);
    const result = await pushService.getNotifications(request.userId, limit, query.cursor);

    return reply.send({
      data: result.notifications,
      meta: { cursor: result.cursor },
    });
  });

  /**
   * PATCH /notifications/:id/read — Mark notification as read
   */
  fastify.patch<{ Params: { id: string } }>("/:id/read", async (request, reply) => {
    await pushService.markRead(request.userId, request.params.id);
    return reply.send({ data: { success: true } });
  });

  /**
   * GET /notifications/unread-count — Get unread count
   */
  fastify.get("/unread-count", async (request, reply) => {
    const count = await pushService.getUnreadCount(request.userId);
    return reply.send({ data: { count } });
  });
}
