import { followListQuerySchema } from "@emovo/shared";
import type { FastifyInstance } from "fastify";

import { FollowService } from "../services/follow.service.js";

export async function followRoutes(fastify: FastifyInstance) {
  const followService = new FollowService();

  fastify.addHook("preHandler", fastify.authenticate);

  /**
   * GET /users/:id/profile
   */
  fastify.get("/users/:id/profile", async (request, reply) => {
    const { id } = request.params as { id: string };
    const profile = await followService.getPublicProfile(id, request.userId);
    return reply.send({ data: profile });
  });

  /**
   * POST /users/:id/follow
   */
  fastify.post("/users/:id/follow", async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await followService.follow(request.userId, id);
    return reply.status(201).send({ data: result });
  });

  /**
   * DELETE /users/:id/follow
   */
  fastify.delete("/users/:id/follow", async (request, reply) => {
    const { id } = request.params as { id: string };
    await followService.unfollow(request.userId, id);
    return reply.status(204).send();
  });

  /**
   * GET /users/:id/followers
   */
  fastify.get("/users/:id/followers", async (request, reply) => {
    const { id } = request.params as { id: string };
    const query = followListQuerySchema.parse(request.query);
    const result = await followService.getFollowers(id, request.userId, {
      cursor: query.cursor,
      limit: query.limit,
    });
    return reply.send({ data: result.items, meta: { cursor: result.nextCursor } });
  });

  /**
   * GET /users/:id/following
   */
  fastify.get("/users/:id/following", async (request, reply) => {
    const { id } = request.params as { id: string };
    const query = followListQuerySchema.parse(request.query);
    const result = await followService.getFollowing(id, request.userId, {
      cursor: query.cursor,
      limit: query.limit,
    });
    return reply.send({ data: result.items, meta: { cursor: result.nextCursor } });
  });

  /**
   * GET /users/me/follow-requests
   */
  fastify.get("/users/me/follow-requests", async (request, reply) => {
    const query = followListQuerySchema.parse(request.query);
    const result = await followService.getFollowRequests(request.userId, {
      cursor: query.cursor,
      limit: query.limit,
    });
    return reply.send({ data: result.items, meta: { cursor: result.nextCursor } });
  });

  /**
   * GET /users/me/follow-requests/count
   */
  fastify.get("/users/me/follow-requests/count", async (request, reply) => {
    const count = await followService.getPendingRequestCount(request.userId);
    return reply.send({ data: { count } });
  });

  /**
   * POST /users/me/follow-requests/:id/accept
   */
  fastify.post("/users/me/follow-requests/:id/accept", async (request, reply) => {
    const { id } = request.params as { id: string };
    await followService.acceptRequest(request.userId, id);
    return reply.send({ data: { accepted: true } });
  });

  /**
   * DELETE /users/me/follow-requests/:id
   */
  fastify.delete("/users/me/follow-requests/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    await followService.declineRequest(request.userId, id);
    return reply.status(204).send();
  });
}
