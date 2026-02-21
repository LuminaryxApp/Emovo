import {
  createPostSchema,
  createCommentSchema,
  createGroupSchema,
  sendMessageSchema,
  createConversationSchema,
  feedQuerySchema,
  groupQuerySchema,
  messageQuerySchema,
} from "@emovo/shared";
import type { FastifyInstance } from "fastify";

import { CommunityService } from "../services/community.service.js";

export async function communityRoutes(fastify: FastifyInstance) {
  const communityService = new CommunityService();

  // All community routes require authentication
  fastify.addHook("preHandler", fastify.authenticate);

  // =========================================================================
  //  POSTS
  // =========================================================================

  /**
   * POST /community/posts
   * Create a new community post.
   */
  fastify.post("/community/posts", async (request, reply) => {
    const input = createPostSchema.parse(request.body);
    const post = await communityService.createPost(request.userId, input);

    return reply.status(201).send({ data: post });
  });

  /**
   * GET /community/feed
   * Paginated feed of posts.
   */
  fastify.get("/community/feed", async (request, reply) => {
    const query = feedQuerySchema.parse(request.query);
    const result = await communityService.listFeed(request.userId, {
      cursor: query.cursor,
      limit: query.limit,
    });

    return reply.send({
      data: result.posts,
      meta: { cursor: result.nextCursor },
    });
  });

  /**
   * DELETE /community/posts/:id
   * Delete a post (owner only).
   */
  fastify.delete("/community/posts/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    await communityService.deletePost(request.userId, id);

    return reply.status(204).send();
  });

  /**
   * POST /community/posts/:id/like
   * Like a post.
   */
  fastify.post("/community/posts/:id/like", async (request, reply) => {
    const { id } = request.params as { id: string };
    await communityService.likePost(request.userId, id);

    return reply.status(204).send();
  });

  /**
   * DELETE /community/posts/:id/like
   * Unlike a post.
   */
  fastify.delete("/community/posts/:id/like", async (request, reply) => {
    const { id } = request.params as { id: string };
    await communityService.unlikePost(request.userId, id);

    return reply.status(204).send();
  });

  // =========================================================================
  //  COMMENTS
  // =========================================================================

  /**
   * POST /community/posts/:id/comments
   * Create a comment on a post.
   */
  fastify.post("/community/posts/:id/comments", async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = createCommentSchema.parse(request.body);
    const comment = await communityService.createComment(request.userId, id, input);

    return reply.status(201).send({ data: comment });
  });

  /**
   * GET /community/posts/:id/comments
   * List comments for a post.
   */
  fastify.get("/community/posts/:id/comments", async (request, reply) => {
    const { id } = request.params as { id: string };
    const query = feedQuerySchema.parse(request.query);
    const result = await communityService.listComments(id, {
      cursor: query.cursor,
      limit: query.limit,
    });

    return reply.send({
      data: result.comments,
      meta: { cursor: result.nextCursor },
    });
  });

  /**
   * DELETE /community/comments/:id
   * Delete a comment (owner only).
   */
  fastify.delete("/community/comments/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    await communityService.deleteComment(request.userId, id);

    return reply.status(204).send();
  });

  // =========================================================================
  //  GROUPS
  // =========================================================================

  /**
   * POST /community/groups
   * Create a new group.
   */
  fastify.post("/community/groups", async (request, reply) => {
    const input = createGroupSchema.parse(request.body);
    const group = await communityService.createGroup(request.userId, input);

    return reply.status(201).send({ data: group });
  });

  /**
   * GET /community/groups
   * List groups the current user is a member of.
   */
  fastify.get("/community/groups", async (request, reply) => {
    const groups = await communityService.listMyGroups(request.userId);

    return reply.send({ data: groups });
  });

  /**
   * GET /community/groups/discover
   * Discover public groups the user is NOT a member of.
   */
  fastify.get("/community/groups/discover", async (request, reply) => {
    const query = groupQuerySchema.parse(request.query);
    const result = await communityService.listDiscoverGroups(request.userId, {
      cursor: query.cursor,
      limit: query.limit,
      search: query.search,
    });

    return reply.send({
      data: result.groups,
      meta: { cursor: result.nextCursor },
    });
  });

  /**
   * POST /community/groups/:id/join
   * Join a public group.
   */
  fastify.post("/community/groups/:id/join", async (request, reply) => {
    const { id } = request.params as { id: string };
    await communityService.joinGroup(request.userId, id);

    return reply.status(204).send();
  });

  /**
   * DELETE /community/groups/:id/leave
   * Leave a group.
   */
  fastify.delete("/community/groups/:id/leave", async (request, reply) => {
    const { id } = request.params as { id: string };
    await communityService.leaveGroup(request.userId, id);

    return reply.status(204).send();
  });

  // =========================================================================
  //  CONVERSATIONS
  // =========================================================================

  /**
   * GET /community/conversations
   * List all conversations for the current user.
   */
  fastify.get("/community/conversations", async (request, reply) => {
    const conversations = await communityService.listConversations(request.userId);

    return reply.send({ data: conversations });
  });

  /**
   * POST /community/conversations
   * Create a direct conversation (or return existing).
   */
  fastify.post("/community/conversations", async (request, reply) => {
    const input = createConversationSchema.parse(request.body);
    const result = await communityService.createConversation(request.userId, input.participantId);

    return reply.status(result.isNew ? 201 : 200).send({ data: result });
  });

  /**
   * GET /community/conversations/:id/messages
   * Paginated messages for a conversation.
   */
  fastify.get("/community/conversations/:id/messages", async (request, reply) => {
    const { id } = request.params as { id: string };
    const query = messageQuerySchema.parse(request.query);
    const result = await communityService.listMessages(id, request.userId, {
      cursor: query.cursor,
      limit: query.limit,
    });

    return reply.send({
      data: result.messages,
      meta: { cursor: result.nextCursor },
    });
  });

  /**
   * POST /community/conversations/:id/messages
   * Send a message in a conversation.
   */
  fastify.post("/community/conversations/:id/messages", async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = sendMessageSchema.parse(request.body);
    const message = await communityService.sendMessage(id, request.userId, input);

    return reply.status(201).send({ data: message });
  });

  /**
   * PATCH /community/conversations/:id/read
   * Mark conversation as read.
   */
  fastify.patch("/community/conversations/:id/read", async (request, reply) => {
    const { id } = request.params as { id: string };
    await communityService.markRead(id, request.userId);

    return reply.status(204).send();
  });
}
