import type {
  CreatePostInput,
  CreateCommentInput,
  CreateGroupInput,
  SendMessageInput,
} from "@emovo/shared";
import { eq, and, sql, desc, ne, ilike, notInArray, inArray, isNull } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

import { db } from "../config/database.js";
import { comments } from "../db/schema/comments.js";
import { conversationParticipants } from "../db/schema/conversation-participants.js";
import { conversations } from "../db/schema/conversations.js";
import { groupMembers } from "../db/schema/group-members.js";
import { groups } from "../db/schema/groups.js";
import { messages } from "../db/schema/messages.js";
import { postLikes } from "../db/schema/post-likes.js";
import { posts } from "../db/schema/posts.js";
import { users } from "../db/schema/users.js";
import { PushService } from "../services/push.service.js";
import { getPublicName } from "../utils/display-name.js";
import { AppError, ForbiddenError, NotFoundError } from "../utils/errors.js";

// ---------------------------------------------------------------------------
// Cursor helpers (generic, base64url-encoded JSON { createdAt, id })
// ---------------------------------------------------------------------------

interface CursorData {
  createdAt: string;
  id: string;
}

function encodeCursor(data: CursorData): string {
  return Buffer.from(JSON.stringify(data)).toString("base64url");
}

function decodeCursor(cursor: string): CursorData | null {
  try {
    const json = Buffer.from(cursor, "base64url").toString("utf-8");
    const parsed = JSON.parse(json) as CursorData;
    if (!parsed.createdAt || !parsed.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class CommunityService {
  private pushService = new PushService();

  // =======================================================================
  //  POSTS
  // =======================================================================

  /**
   * Create a new community post.
   */
  async createPost(userId: string, input: CreatePostInput) {
    const [post] = await db
      .insert(posts)
      .values({
        userId,
        content: input.content,
        moodScore: input.moodScore ?? null,
        type: input.type,
        imageBase64: input.imageBase64 ?? null,
      })
      .returning();

    const [author] = await db
      .select({
        displayName: users.displayName,
        username: users.username,
        showRealName: users.showRealName,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return {
      ...post,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
      author: {
        id: userId,
        displayName: author.displayName,
        username: author.username,
        showRealName: author.showRealName,
      },
      isLiked: false,
    };
  }

  /**
   * Paginated feed of posts ordered by createdAt DESC.
   * Includes author displayName and whether the requesting user has liked each post.
   */
  async listFeed(userId: string, options: { cursor?: string; limit: number; search?: string }) {
    const { cursor, limit, search } = options;

    const conditions = [];

    if (search) {
      conditions.push(ilike(posts.content, `%${search}%`));
    }

    if (cursor) {
      const decoded = decodeCursor(cursor);
      if (decoded) {
        conditions.push(
          sql`(${posts.createdAt}, ${posts.id}) < (${decoded.createdAt}::timestamptz, ${decoded.id}::uuid)`,
        );
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select({
        id: posts.id,
        userId: posts.userId,
        content: posts.content,
        moodScore: posts.moodScore,
        type: posts.type,
        imageUrl: posts.imageUrl,
        likeCount: posts.likeCount,
        commentCount: posts.commentCount,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
        authorName: users.displayName,
        authorUsername: users.username,
        authorShowRealName: users.showRealName,
      })
      .from(posts)
      .innerJoin(users, eq(posts.userId, users.id))
      .where(whereClause)
      .orderBy(desc(posts.createdAt), desc(posts.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;

    // Batch check likes for requesting user
    const postIds = pageRows.map((r) => r.id);
    const likedRows = postIds.length
      ? await db
          .select({ postId: postLikes.postId })
          .from(postLikes)
          .where(and(eq(postLikes.userId, userId), inArray(postLikes.postId, postIds)))
      : [];
    const likedSet = new Set(likedRows.map((r) => r.postId));

    const data = pageRows.map((row) => ({
      id: row.id,
      userId: row.userId,
      content: row.content,
      moodScore: row.moodScore,
      type: row.type,
      imageUrl: row.imageUrl,
      likeCount: row.likeCount,
      commentCount: row.commentCount,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      author: {
        id: row.userId,
        displayName: row.authorName,
        username: row.authorUsername,
        showRealName: row.authorShowRealName,
      },
      isLiked: likedSet.has(row.id),
    }));

    const nextCursor = hasMore
      ? encodeCursor({
          createdAt: pageRows[pageRows.length - 1].createdAt.toISOString(),
          id: pageRows[pageRows.length - 1].id,
        })
      : null;

    return { posts: data, nextCursor };
  }

  /**
   * Delete a post. Only the owner can delete.
   */
  async deletePost(userId: string, postId: string): Promise<void> {
    const result = await db
      .delete(posts)
      .where(and(eq(posts.id, postId), eq(posts.userId, userId)))
      .returning({ id: posts.id });

    if (result.length === 0) {
      throw new NotFoundError("Post not found");
    }
  }

  /**
   * Like a post. Inserts like row and increments likeCount.
   */
  async likePost(userId: string, postId: string) {
    // Verify post exists
    const [post] = await db
      .select({ id: posts.id, userId: posts.userId })
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);

    if (!post) throw new NotFoundError("Post not found");

    // Insert like (conflict = already liked, do nothing)
    const result = await db
      .insert(postLikes)
      .values({ postId, userId })
      .onConflictDoNothing()
      .returning({ id: postLikes.id });

    // Only increment if a new like was actually inserted
    if (result.length > 0) {
      await db
        .update(posts)
        .set({ likeCount: sql`${posts.likeCount} + 1` })
        .where(eq(posts.id, postId));

      // Notify post author (skip if liker is the author)
      if (post.userId !== userId) {
        db.select({
          displayName: users.displayName,
          username: users.username,
          showRealName: users.showRealName,
        })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1)
          .then(([liker]) => {
            if (liker) {
              const name = getPublicName(liker);
              this.pushService
                .sendPush(post.userId, "like", "New Like", `${name} liked your post`, { postId })
                .catch(() => {});
            }
          })
          .catch(() => {});
      }
    }
  }

  /**
   * Unlike a post. Deletes like row and decrements likeCount.
   */
  async unlikePost(userId: string, postId: string) {
    const result = await db
      .delete(postLikes)
      .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)))
      .returning({ id: postLikes.id });

    if (result.length > 0) {
      await db
        .update(posts)
        .set({ likeCount: sql`GREATEST(${posts.likeCount} - 1, 0)` })
        .where(eq(posts.id, postId));
    }
  }

  // =======================================================================
  //  COMMENTS
  // =======================================================================

  /**
   * Create a comment on a post. Increments post.commentCount.
   */
  async createComment(userId: string, postId: string, input: CreateCommentInput) {
    // Verify post exists
    const [post] = await db
      .select({ id: posts.id, userId: posts.userId })
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);

    if (!post) throw new NotFoundError("Post not found");

    const [comment] = await db
      .insert(comments)
      .values({
        postId,
        userId,
        content: input.content,
      })
      .returning();

    await db
      .update(posts)
      .set({ commentCount: sql`${posts.commentCount} + 1` })
      .where(eq(posts.id, postId));

    const [author] = await db
      .select({
        displayName: users.displayName,
        username: users.username,
        showRealName: users.showRealName,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    // Notify post author (skip if commenter is the author)
    if (post.userId !== userId) {
      const name = author ? getPublicName(author) : "Someone";
      this.pushService
        .sendPush(post.userId, "comment", "New Comment", `${name} commented on your post`, {
          postId,
          commentId: comment.id,
        })
        .catch(() => {});
    }

    return {
      ...comment,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
      author: {
        id: userId,
        displayName: author.displayName,
        username: author.username,
        showRealName: author.showRealName,
      },
    };
  }

  /**
   * Paginated list of comments for a post, ordered by createdAt DESC.
   */
  async listComments(postId: string, options: { cursor?: string; limit: number }) {
    const { cursor, limit } = options;

    const conditions = [eq(comments.postId, postId)];

    if (cursor) {
      const decoded = decodeCursor(cursor);
      if (decoded) {
        conditions.push(
          sql`(${comments.createdAt}, ${comments.id}) < (${decoded.createdAt}::timestamptz, ${decoded.id}::uuid)`,
        );
      }
    }

    const rows = await db
      .select({
        id: comments.id,
        postId: comments.postId,
        userId: comments.userId,
        content: comments.content,
        createdAt: comments.createdAt,
        updatedAt: comments.updatedAt,
        authorName: users.displayName,
        authorUsername: users.username,
        authorShowRealName: users.showRealName,
      })
      .from(comments)
      .innerJoin(users, eq(comments.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(comments.createdAt), desc(comments.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;

    const data = pageRows.map((row) => ({
      id: row.id,
      postId: row.postId,
      userId: row.userId,
      content: row.content,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      author: {
        id: row.userId,
        displayName: row.authorName,
        username: row.authorUsername,
        showRealName: row.authorShowRealName,
      },
    }));

    const nextCursor = hasMore
      ? encodeCursor({
          createdAt: pageRows[pageRows.length - 1].createdAt.toISOString(),
          id: pageRows[pageRows.length - 1].id,
        })
      : null;

    return { comments: data, nextCursor };
  }

  /**
   * Delete a comment. Only the owner can delete. Decrements post.commentCount.
   */
  async deleteComment(userId: string, commentId: string): Promise<void> {
    const [comment] = await db
      .select({ id: comments.id, postId: comments.postId, userId: comments.userId })
      .from(comments)
      .where(eq(comments.id, commentId))
      .limit(1);

    if (!comment) throw new NotFoundError("Comment not found");
    if (comment.userId !== userId) throw new ForbiddenError("Not your comment");

    await db.delete(comments).where(eq(comments.id, commentId));

    await db
      .update(posts)
      .set({ commentCount: sql`GREATEST(${posts.commentCount} - 1, 0)` })
      .where(eq(posts.id, comment.postId));
  }

  // =======================================================================
  //  GROUPS
  // =======================================================================

  /**
   * Create a group. Creator is added as admin. memberCount = 1.
   */
  async createGroup(userId: string, input: CreateGroupInput) {
    const [group] = await db
      .insert(groups)
      .values({
        name: input.name,
        description: input.description ?? null,
        icon: input.icon,
        gradientStart: input.gradientStart,
        gradientEnd: input.gradientEnd,
        isPublic: input.isPublic,
        memberCount: 1,
        createdBy: userId,
      })
      .returning();

    // Add creator as admin member
    await db.insert(groupMembers).values({
      groupId: group.id,
      userId,
      role: "admin",
    });

    return {
      ...group,
      createdAt: group.createdAt.toISOString(),
      role: "admin" as const,
    };
  }

  /**
   * List groups the user is a member of.
   */
  async listMyGroups(userId: string) {
    const rows = await db
      .select({
        id: groups.id,
        name: groups.name,
        description: groups.description,
        icon: groups.icon,
        gradientStart: groups.gradientStart,
        gradientEnd: groups.gradientEnd,
        isPublic: groups.isPublic,
        memberCount: groups.memberCount,
        createdBy: groups.createdBy,
        createdAt: groups.createdAt,
        role: groupMembers.role,
      })
      .from(groupMembers)
      .innerJoin(groups, eq(groupMembers.groupId, groups.id))
      .where(eq(groupMembers.userId, userId))
      .orderBy(desc(groups.createdAt));

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      icon: row.icon,
      gradientStart: row.gradientStart,
      gradientEnd: row.gradientEnd,
      isPublic: row.isPublic,
      memberCount: row.memberCount,
      createdBy: row.createdBy,
      createdAt: row.createdAt.toISOString(),
      role: row.role,
      unreadCount: 0,
    }));
  }

  /**
   * Discover public groups the user is NOT a member of.
   * Supports cursor pagination and optional search by name.
   */
  async listDiscoverGroups(
    userId: string,
    options: { cursor?: string; limit: number; search?: string },
  ) {
    const { cursor, limit, search } = options;

    // Sub-select: group IDs the user is already a member of
    const memberGroupIds = db
      .select({ groupId: groupMembers.groupId })
      .from(groupMembers)
      .where(eq(groupMembers.userId, userId));

    const conditions = [eq(groups.isPublic, true), notInArray(groups.id, memberGroupIds)];

    if (search) {
      conditions.push(ilike(groups.name, `%${search}%`));
    }

    if (cursor) {
      const decoded = decodeCursor(cursor);
      if (decoded) {
        conditions.push(
          sql`(${groups.createdAt}, ${groups.id}) < (${decoded.createdAt}::timestamptz, ${decoded.id}::uuid)`,
        );
      }
    }

    const rows = await db
      .select()
      .from(groups)
      .where(and(...conditions))
      .orderBy(desc(groups.createdAt), desc(groups.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;

    const data = pageRows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      icon: row.icon,
      gradientStart: row.gradientStart,
      gradientEnd: row.gradientEnd,
      isPublic: row.isPublic,
      memberCount: row.memberCount,
      createdBy: row.createdBy,
      createdAt: row.createdAt.toISOString(),
      isMember: false,
      role: null as string | null,
      unreadCount: 0,
    }));

    const nextCursor = hasMore
      ? encodeCursor({
          createdAt: pageRows[pageRows.length - 1].createdAt.toISOString(),
          id: pageRows[pageRows.length - 1].id,
        })
      : null;

    return { groups: data, nextCursor };
  }

  /**
   * Join a public group. Inserts group_member row and increments memberCount.
   */
  async joinGroup(userId: string, groupId: string) {
    // Verify group exists and is public
    const [group] = await db
      .select({ id: groups.id, isPublic: groups.isPublic })
      .from(groups)
      .where(eq(groups.id, groupId))
      .limit(1);

    if (!group) throw new NotFoundError("Group not found");
    if (!group.isPublic) throw new ForbiddenError("Group is not public");

    // Insert member (conflict = already a member, do nothing)
    const result = await db
      .insert(groupMembers)
      .values({ groupId, userId, role: "member" })
      .onConflictDoNothing()
      .returning({ id: groupMembers.id });

    if (result.length > 0) {
      await db
        .update(groups)
        .set({ memberCount: sql`${groups.memberCount} + 1` })
        .where(eq(groups.id, groupId));
    }
  }

  /**
   * Leave a group. Cannot leave if you are the sole admin.
   */
  async leaveGroup(userId: string, groupId: string) {
    // Get the membership
    const [membership] = await db
      .select({ id: groupMembers.id, role: groupMembers.role })
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
      .limit(1);

    if (!membership) throw new NotFoundError("Not a member of this group");

    // If admin, check there are other admins
    if (membership.role === "admin") {
      const [otherAdmin] = await db
        .select({ id: groupMembers.id })
        .from(groupMembers)
        .where(
          and(
            eq(groupMembers.groupId, groupId),
            eq(groupMembers.role, "admin"),
            ne(groupMembers.userId, userId),
          ),
        )
        .limit(1);

      if (!otherAdmin) {
        throw new AppError(
          "VALIDATION_FAILED",
          "Cannot leave group as the sole admin. Transfer admin role first.",
          400,
        );
      }
    }

    await db.delete(groupMembers).where(eq(groupMembers.id, membership.id));

    await db
      .update(groups)
      .set({ memberCount: sql`GREATEST(${groups.memberCount} - 1, 0)` })
      .where(eq(groups.id, groupId));
  }

  // =======================================================================
  //  GROUP CONVERSATIONS
  // =======================================================================

  /**
   * Get or create a group conversation. User must be a member of the group.
   * Auto-adds the user as a conversation participant if not already.
   */
  async getOrCreateGroupConversation(userId: string, groupId: string) {
    // Verify user is a member of the group
    const [membership] = await db
      .select({ id: groupMembers.id })
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
      .limit(1);

    if (!membership) {
      throw new ForbiddenError("You must be a member of this group to access chat");
    }

    // Check if a group conversation already exists
    const [existingConv] = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(and(eq(conversations.groupId, groupId), eq(conversations.type, "group")))
      .limit(1);

    if (existingConv) {
      // Ensure user is a participant (they might have left and rejoined the group)
      const [existingParticipant] = await db
        .select({ id: conversationParticipants.id })
        .from(conversationParticipants)
        .where(
          and(
            eq(conversationParticipants.conversationId, existingConv.id),
            eq(conversationParticipants.userId, userId),
          ),
        )
        .limit(1);

      if (!existingParticipant) {
        await db
          .insert(conversationParticipants)
          .values({ conversationId: existingConv.id, userId })
          .onConflictDoNothing();
      }

      return { id: existingConv.id, isNew: false };
    }

    // Create new group conversation
    const [conversation] = await db
      .insert(conversations)
      .values({ type: "group", groupId })
      .returning();

    // Add all current group members as participants
    const members = await db
      .select({ userId: groupMembers.userId })
      .from(groupMembers)
      .where(eq(groupMembers.groupId, groupId));

    if (members.length > 0) {
      await db.insert(conversationParticipants).values(
        members.map((m) => ({
          conversationId: conversation.id,
          userId: m.userId,
        })),
      );
    }

    return { id: conversation.id, isNew: true };
  }

  // =======================================================================
  //  CONVERSATIONS
  // =======================================================================

  /**
   * Create or return existing direct conversation between two users.
   */
  async createConversation(userId: string, participantId: string) {
    if (userId === participantId) {
      throw new AppError("VALIDATION_FAILED", "Cannot create conversation with yourself", 400);
    }

    // Check if a direct conversation already exists between these two users
    const existing = await db.execute(sql`
      SELECT cp1.conversation_id
      FROM conversation_participants cp1
      INNER JOIN conversation_participants cp2
        ON cp1.conversation_id = cp2.conversation_id
      INNER JOIN conversations c
        ON c.id = cp1.conversation_id
      WHERE cp1.user_id = ${userId}
        AND cp2.user_id = ${participantId}
        AND c.type = 'direct'
      LIMIT 1
    `);

    if (existing.length > 0) {
      const convId = (existing[0] as { conversation_id: string }).conversation_id;
      return { id: convId, isNew: false };
    }

    // Create new conversation
    const [conversation] = await db.insert(conversations).values({ type: "direct" }).returning();

    // Add both participants
    await db.insert(conversationParticipants).values([
      { conversationId: conversation.id, userId },
      { conversationId: conversation.id, userId: participantId },
    ]);

    return {
      id: conversation.id,
      isNew: true,
    };
  }

  /**
   * List all conversations for a user with last message, unread count, and participant info.
   */
  async listConversations(userId: string) {
    // Get all conversation IDs and lastReadAt for this user
    const participantRows = await db
      .select({
        conversationId: conversationParticipants.conversationId,
        lastReadAt: conversationParticipants.lastReadAt,
      })
      .from(conversationParticipants)
      .where(eq(conversationParticipants.userId, userId));

    if (participantRows.length === 0) return [];

    const convIds = participantRows.map((r) => r.conversationId);
    // Get conversation details
    const convRows = await db
      .select()
      .from(conversations)
      .where(inArray(conversations.id, convIds))
      .orderBy(desc(conversations.updatedAt));

    // Get the other participants (for direct conversations)
    const otherParticipants = await db
      .select({
        conversationId: conversationParticipants.conversationId,
        userId: conversationParticipants.userId,
        displayName: users.displayName,
      })
      .from(conversationParticipants)
      .innerJoin(users, eq(conversationParticipants.userId, users.id))
      .where(
        and(
          inArray(conversationParticipants.conversationId, convIds),
          ne(conversationParticipants.userId, userId),
        ),
      );

    const participantsByConv = new Map<string, Array<{ userId: string; displayName: string }>>();
    for (const row of otherParticipants) {
      if (!participantsByConv.has(row.conversationId)) {
        participantsByConv.set(row.conversationId, []);
      }
      participantsByConv.get(row.conversationId)!.push({
        userId: row.userId,
        displayName: row.displayName,
      });
    }

    // Get last message per conversation — use raw ARRAY literal for raw SQL
    const convIdsPgArr = sql.raw(`'{${convIds.join(",")}}'::uuid[]`);
    const lastMessages = await db.execute(sql`
      SELECT DISTINCT ON (conversation_id)
        id, conversation_id, sender_id, content, type, created_at
      FROM messages
      WHERE conversation_id = ANY(${convIdsPgArr})
      ORDER BY conversation_id, created_at DESC
    `);

    const lastMsgMap = new Map<
      string,
      { id: string; senderId: string; content: string; type: string; createdAt: string }
    >();
    for (const row of lastMessages as unknown as Array<{
      id: string;
      conversation_id: string;
      sender_id: string;
      content: string;
      type: string;
      created_at: string;
    }>) {
      lastMsgMap.set(row.conversation_id, {
        id: row.id,
        senderId: row.sender_id,
        content: row.content,
        type: row.type,
        createdAt: new Date(row.created_at).toISOString(),
      });
    }

    // Get unread counts per conversation
    const unreadCounts = await db.execute(sql`
      SELECT m.conversation_id, COUNT(*)::int as unread_count
      FROM messages m
      INNER JOIN conversation_participants cp
        ON cp.conversation_id = m.conversation_id AND cp.user_id = ${userId}
      WHERE m.conversation_id = ANY(${convIdsPgArr})
        AND m.sender_id != ${userId}
        AND (cp.last_read_at IS NULL OR m.created_at > cp.last_read_at)
      GROUP BY m.conversation_id
    `);

    const unreadMap = new Map<string, number>();
    for (const row of unreadCounts as unknown as Array<{
      conversation_id: string;
      unread_count: number;
    }>) {
      unreadMap.set(row.conversation_id, row.unread_count);
    }

    // Get group names for group conversations
    const groupIds = convRows.filter((c) => c.groupId).map((c) => c.groupId!);
    const groupNameMap = new Map<string, string>();
    if (groupIds.length > 0) {
      const groupRows = await db
        .select({ id: groups.id, name: groups.name })
        .from(groups)
        .where(inArray(groups.id, groupIds));
      for (const g of groupRows) {
        groupNameMap.set(g.id, g.name);
      }
    }

    return convRows.map((conv) => {
      const participants = participantsByConv.get(conv.id) || [];
      const lastMsg = lastMsgMap.get(conv.id) || null;
      const name =
        conv.type === "group" && conv.groupId
          ? groupNameMap.get(conv.groupId) || "Group"
          : participants.map((p) => p.displayName).join(", ") || "Conversation";

      return {
        id: conv.id,
        type: conv.type,
        groupId: conv.groupId,
        createdAt: conv.createdAt.toISOString(),
        updatedAt: conv.updatedAt.toISOString(),
        name,
        lastMessage: lastMsg?.content ?? null,
        lastMessageAt: lastMsg?.createdAt ?? null,
        unreadCount: unreadMap.get(conv.id) || 0,
        isOnline: false,
        participantIds: participants.map((p) => p.userId),
      };
    });
  }

  /**
   * Paginated messages for a conversation. Verifies user is a participant.
   */
  async listMessages(
    conversationId: string,
    userId: string,
    options: { cursor?: string; limit: number },
  ) {
    const { cursor, limit } = options;

    // Verify participant
    const [participant] = await db
      .select({ id: conversationParticipants.id })
      .from(conversationParticipants)
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, userId),
        ),
      )
      .limit(1);

    if (!participant) throw new ForbiddenError("Not a participant in this conversation");

    const conditions = [eq(messages.conversationId, conversationId)];

    if (cursor) {
      const decoded = decodeCursor(cursor);
      if (decoded) {
        conditions.push(
          sql`(${messages.createdAt}, ${messages.id}) < (${decoded.createdAt}::timestamptz, ${decoded.id}::uuid)`,
        );
      }
    }

    const rows = await db
      .select({
        id: messages.id,
        conversationId: messages.conversationId,
        senderId: messages.senderId,
        content: messages.content,
        type: messages.type,
        createdAt: messages.createdAt,
        senderName: users.displayName,
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(and(...conditions))
      .orderBy(desc(messages.createdAt), desc(messages.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;

    const data = pageRows.map((row) => ({
      id: row.id,
      conversationId: row.conversationId,
      senderId: row.senderId,
      content: row.content,
      type: row.type,
      createdAt: row.createdAt.toISOString(),
      sender: { id: row.senderId, displayName: row.senderName },
    }));

    const nextCursor = hasMore
      ? encodeCursor({
          createdAt: pageRows[pageRows.length - 1].createdAt.toISOString(),
          id: pageRows[pageRows.length - 1].id,
        })
      : null;

    return { messages: data, nextCursor };
  }

  /**
   * Send a message in a conversation. Verifies user is a participant.
   */
  async sendMessage(conversationId: string, userId: string, input: SendMessageInput) {
    // Verify participant
    const [participant] = await db
      .select({ id: conversationParticipants.id })
      .from(conversationParticipants)
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, userId),
        ),
      )
      .limit(1);

    if (!participant) throw new ForbiddenError("Not a participant in this conversation");

    const [message] = await db
      .insert(messages)
      .values({
        conversationId,
        senderId: userId,
        content: input.content,
        type: input.type,
      })
      .returning();

    // Update conversation updatedAt
    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, conversationId));

    const [sender] = await db
      .select({
        displayName: users.displayName,
        username: users.username,
        showRealName: users.showRealName,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    // Notify all other participants in the conversation
    const senderName = sender ? getPublicName(sender) : "Someone";
    const messagePreview =
      input.content.length > 50 ? input.content.slice(0, 50) + "..." : input.content;
    db.select({ userId: conversationParticipants.userId })
      .from(conversationParticipants)
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          ne(conversationParticipants.userId, userId),
        ),
      )
      .then((participants) => {
        for (const p of participants) {
          this.pushService
            .sendPush(p.userId, "message", "New Message", `${senderName}: ${messagePreview}`, {
              conversationId,
            })
            .catch(() => {});
        }
      })
      .catch(() => {});

    return {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      content: message.content,
      type: message.type,
      createdAt: message.createdAt.toISOString(),
      sender: { id: userId, displayName: sender.displayName },
    };
  }

  /**
   * Mark a conversation as read for a user.
   */
  async markRead(conversationId: string, userId: string) {
    const result = await db
      .update(conversationParticipants)
      .set({ lastReadAt: new Date() })
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, userId),
        ),
      )
      .returning({ id: conversationParticipants.id });

    if (result.length === 0) {
      throw new ForbiddenError("Not a participant in this conversation");
    }
  }

  // =======================================================================
  //  USER SEARCH
  // =======================================================================

  /**
   * Search users by username or display name. Paginated by createdAt DESC.
   */
  async searchUsers(options: { q: string; cursor?: string; limit: number }) {
    const { q, cursor, limit } = options;
    const searchPattern = `%${q}%`;

    const conditions: SQL[] = [
      sql`(${users.username} ILIKE ${searchPattern} OR ${users.displayName} ILIKE ${searchPattern})`,
      isNull(users.bannedAt),
    ];

    if (cursor) {
      const decoded = decodeCursor(cursor);
      if (decoded) {
        conditions.push(
          sql`(${users.createdAt}, ${users.id}) < (${decoded.createdAt}::timestamptz, ${decoded.id}::uuid)`,
        );
      }
    }

    const rows = await db
      .select({
        id: users.id,
        displayName: users.displayName,
        username: users.username,
        showRealName: users.showRealName,
        avatarBase64: users.avatarBase64,
        bio: users.bio,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(and(...conditions))
      .orderBy(desc(users.createdAt), desc(users.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;

    const data = pageRows.map((row) => ({
      id: row.id,
      displayName: row.displayName,
      username: row.username,
      showRealName: row.showRealName,
      avatarBase64: row.avatarBase64,
      bio: row.bio ?? null,
    }));

    const nextCursor = hasMore
      ? encodeCursor({
          createdAt: pageRows[pageRows.length - 1].createdAt.toISOString(),
          id: pageRows[pageRows.length - 1].id,
        })
      : null;

    return { users: data, nextCursor };
  }
}
