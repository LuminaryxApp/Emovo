import {
  createPostSchema,
  createCommentSchema,
  createGroupSchema,
  updateGroupSchema,
  groupMembersQuerySchema,
  sendMessageSchema,
  createConversationSchema,
  feedQuerySchema,
  groupQuerySchema,
  messageQuerySchema,
  userSearchQuerySchema,
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
  fastify.post(
    "/community/posts",
    { preHandler: [fastify.requireNotBanned] },
    async (request, reply) => {
      const input = createPostSchema.parse(request.body);
      const post = await communityService.createPost(request.userId, input);

      return reply.status(201).send({ data: post });
    },
  );

  /**
   * GET /community/feed
   * Paginated feed of posts.
   */
  fastify.get("/community/feed", async (request, reply) => {
    const query = feedQuerySchema.parse(request.query);
    const result = await communityService.listFeed(request.userId, {
      cursor: query.cursor,
      limit: query.limit,
      search: query.search,
    });

    return reply.send({
      data: result.posts,
      meta: { cursor: result.nextCursor },
    });
  });

  /**
   * GET /community/users/search
   * Search users by username or display name.
   */
  fastify.get("/community/users/search", async (request, reply) => {
    const query = userSearchQuerySchema.parse(request.query);
    const result = await communityService.searchUsers({
      q: query.q,
      cursor: query.cursor,
      limit: query.limit,
      userId: request.userId,
    });

    return reply.send({
      data: result.users,
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
  fastify.post(
    "/community/posts/:id/like",
    { preHandler: [fastify.requireNotBanned] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      await communityService.likePost(request.userId, id);

      return reply.status(204).send();
    },
  );

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
  fastify.post(
    "/community/posts/:id/comments",
    { preHandler: [fastify.requireNotBanned] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = createCommentSchema.parse(request.body);
      const comment = await communityService.createComment(request.userId, id, input);

      return reply.status(201).send({ data: comment });
    },
  );

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
  fastify.post(
    "/community/groups",
    { preHandler: [fastify.requireNotBanned] },
    async (request, reply) => {
      const input = createGroupSchema.parse(request.body);
      const group = await communityService.createGroup(request.userId, input);

      return reply.status(201).send({ data: group });
    },
  );

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
  fastify.post(
    "/community/groups/:id/join",
    { preHandler: [fastify.requireNotBanned] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      await communityService.joinGroup(request.userId, id);

      return reply.status(204).send();
    },
  );

  /**
   * DELETE /community/groups/:id/leave
   * Leave a group.
   */
  fastify.delete("/community/groups/:id/leave", async (request, reply) => {
    const { id } = request.params as { id: string };
    await communityService.leaveGroup(request.userId, id);

    return reply.status(204).send();
  });

  /**
   * POST /community/groups/:id/conversation
   * Get or create the group chat conversation. User must be a member.
   */
  fastify.post(
    "/community/groups/:id/conversation",
    { preHandler: [fastify.requireNotBanned] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await communityService.getOrCreateGroupConversation(request.userId, id);

      return reply.status(result.isNew ? 201 : 200).send({ data: result });
    },
  );

  /**
   * GET /community/groups/:id/members
   * List members of a group (paginated).
   */
  fastify.get("/community/groups/:id/members", async (request, reply) => {
    const { id } = request.params as { id: string };
    const query = groupMembersQuerySchema.parse(request.query);
    const result = await communityService.listGroupMembers(request.userId, id, {
      cursor: query.cursor,
      limit: query.limit,
    });

    return reply.send({
      data: result.members,
      meta: { cursor: result.nextCursor },
    });
  });

  /**
   * PUT /community/groups/:id
   * Update a group (admin only).
   */
  fastify.put(
    "/community/groups/:id",
    { preHandler: [fastify.requireNotBanned] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = updateGroupSchema.parse(request.body);
      const group = await communityService.updateGroup(request.userId, id, input);

      return reply.send({ data: group });
    },
  );

  /**
   * DELETE /community/groups/:id
   * Delete a group (admin only).
   */
  fastify.delete(
    "/community/groups/:id",
    { preHandler: [fastify.requireNotBanned] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      await communityService.deleteGroup(request.userId, id);

      return reply.status(204).send();
    },
  );

  /**
   * DELETE /community/groups/:id/members/:userId
   * Remove a member from a group (admin only).
   */
  fastify.delete(
    "/community/groups/:id/members/:userId",
    { preHandler: [fastify.requireNotBanned] },
    async (request, reply) => {
      const { id, userId } = request.params as { id: string; userId: string };
      await communityService.removeMember(request.userId, id, userId);

      return reply.status(204).send();
    },
  );

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
  fastify.post(
    "/community/conversations",
    { preHandler: [fastify.requireNotBanned] },
    async (request, reply) => {
      const input = createConversationSchema.parse(request.body);
      const result = await communityService.createConversation(request.userId, input.participantId);

      return reply.status(result.isNew ? 201 : 200).send({ data: result });
    },
  );

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
  fastify.post(
    "/community/conversations/:id/messages",
    { preHandler: [fastify.requireNotBanned] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = sendMessageSchema.parse(request.body);
      const message = await communityService.sendMessage(id, request.userId, input);

      return reply.status(201).send({ data: message });
    },
  );

  /**
   * PATCH /community/conversations/:id/read
   * Mark conversation as read.
   */
  fastify.patch("/community/conversations/:id/read", async (request, reply) => {
    const { id } = request.params as { id: string };
    await communityService.markRead(id, request.userId);

    return reply.status(204).send();
  });

  /**
   * DELETE /community/conversations/:conversationId/messages/:messageId
   * Delete a message (sender only).
   */
  fastify.delete(
    "/community/conversations/:conversationId/messages/:messageId",
    async (request, reply) => {
      const { conversationId, messageId } = request.params as {
        conversationId: string;
        messageId: string;
      };
      await communityService.deleteMessage(request.userId, conversationId, messageId);

      return reply.status(204).send();
    },
  );
}
