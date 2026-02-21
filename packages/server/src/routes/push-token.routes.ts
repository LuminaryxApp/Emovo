import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { PushService } from "../services/push.service.js";

const registerTokenSchema = z.object({
  token: z.string().min(1).max(255),
  platform: z.enum(["ios", "android"]),
});

export async function pushTokenRoutes(fastify: FastifyInstance) {
  const pushService = new PushService();

  fastify.addHook("preHandler", fastify.authenticate);

  /**
   * POST /push-tokens — Register or update a push token
   */
  fastify.post("/", async (request, reply) => {
    const body = registerTokenSchema.parse(request.body);
    await pushService.registerToken(request.userId, body.token, body.platform);
    return reply.send({ data: { success: true } });
  });

  /**
   * DELETE /push-tokens/:token — Remove a push token
   */
  fastify.delete<{ Params: { token: string } }>("/:token", async (request, reply) => {
    await pushService.removeToken(request.params.token);
    return reply.send({ data: { success: true } });
  });
}
