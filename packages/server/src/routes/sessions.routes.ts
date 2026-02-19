import type { FastifyInstance } from "fastify";

import { AuthService } from "../services/auth.service.js";
import { NotFoundError } from "../utils/errors.js";

export async function sessionsRoutes(fastify: FastifyInstance) {
  const authService = new AuthService(fastify);

  // All session routes require authentication
  fastify.addHook("preHandler", fastify.authenticate);

  /**
   * GET /sessions
   * Returns device_name, last_used_at, created_at, current (no ip_hash exposed).
   */
  fastify.get("/sessions", async (request, reply) => {
    const sessions = await authService.getActiveSessions(request.userId);

    // Determine "current" session from the authorization token's JTI or from a header
    // Since we can't easily get the refresh token ID from the access token,
    // the client can pass X-Session-Id header
    const currentSessionId = request.headers["x-session-id"]?.toString();

    return reply.send({
      data: sessions.map((s) => ({
        id: s.id,
        deviceName: s.deviceName,
        lastUsedAt: s.lastUsedAt?.toISOString() || null,
        createdAt: s.createdAt.toISOString(),
        current: s.id === currentSessionId,
      })),
    });
  });

  /**
   * DELETE /sessions/:id
   */
  fastify.delete<{ Params: { id: string } }>("/sessions/:id", async (request, reply) => {
    const revoked = await authService.revokeSession(request.userId, request.params.id);
    if (!revoked) {
      throw new NotFoundError("Session not found");
    }

    return reply.send({ data: { success: true } });
  });
}
