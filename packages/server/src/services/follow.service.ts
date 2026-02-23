import { eq, and } from "drizzle-orm";

import { db, client } from "../config/database.js";
import { follows } from "../db/schema/follows.js";
import { users } from "../db/schema/users.js";
import { ConflictError, NotFoundError } from "../utils/errors.js";

interface PublicProfileResult {
  id: string;
  displayName: string;
  username: string | null;
  showRealName: boolean;
  avatarBase64: string | null;
  bio: string | null;
  isPrivate: boolean;
  followerCount: number;
  followingCount: number;
  followStatus: "none" | "following" | "pending" | "self";
  createdAt: string;
}

interface FollowListItemResult {
  id: string;
  displayName: string;
  username: string | null;
  showRealName: boolean;
  avatarBase64: string | null;
  isFollowing: boolean;
}

export class FollowService {
  async getPublicProfile(targetUserId: string, viewerId: string): Promise<PublicProfileResult> {
    const [target] = await db
      .select({
        id: users.id,
        displayName: users.displayName,
        username: users.username,
        showRealName: users.showRealName,
        avatarBase64: users.avatarBase64,
        bio: users.bio,
        isPrivate: users.isPrivate,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1);

    if (!target) throw new NotFoundError("User not found");

    const [counts] = await client`
      SELECT
        (SELECT COUNT(*)::int FROM follows WHERE following_id = ${targetUserId} AND status = 'accepted') AS follower_count,
        (SELECT COUNT(*)::int FROM follows WHERE follower_id = ${targetUserId} AND status = 'accepted') AS following_count
    `;

    let followStatus: "none" | "following" | "pending" | "self" = "none";
    if (viewerId === targetUserId) {
      followStatus = "self";
    } else {
      const [existingFollow] = await db
        .select({ status: follows.status })
        .from(follows)
        .where(and(eq(follows.followerId, viewerId), eq(follows.followingId, targetUserId)))
        .limit(1);

      if (existingFollow) {
        followStatus = existingFollow.status === "accepted" ? "following" : "pending";
      }
    }

    return {
      id: target.id,
      displayName: target.displayName,
      username: target.username,
      showRealName: target.showRealName,
      avatarBase64: target.avatarBase64,
      bio: target.bio,
      isPrivate: target.isPrivate,
      followerCount: counts.follower_count,
      followingCount: counts.following_count,
      followStatus,
      createdAt: target.createdAt.toISOString(),
    };
  }

  async follow(
    followerId: string,
    followingId: string,
  ): Promise<{ status: "accepted" | "pending" }> {
    if (followerId === followingId) {
      throw new ConflictError("You cannot follow yourself");
    }

    const [target] = await db
      .select({ id: users.id, isPrivate: users.isPrivate })
      .from(users)
      .where(eq(users.id, followingId))
      .limit(1);

    if (!target) throw new NotFoundError("User not found");

    const [existing] = await db
      .select({ id: follows.id, status: follows.status })
      .from(follows)
      .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)))
      .limit(1);

    if (existing) {
      if (existing.status === "accepted") {
        throw new ConflictError("Already following this user");
      }
      return { status: "pending" };
    }

    const status = target.isPrivate ? "pending" : "accepted";

    await db.insert(follows).values({
      followerId,
      followingId,
      status,
    });

    return { status };
  }

  async unfollow(followerId: string, followingId: string): Promise<void> {
    const result = await db
      .delete(follows)
      .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)))
      .returning({ id: follows.id });

    if (result.length === 0) {
      throw new NotFoundError("Follow relationship not found");
    }
  }

  async getFollowers(
    targetUserId: string,
    viewerId: string,
    options: { cursor?: string; limit: number },
  ): Promise<{ items: FollowListItemResult[]; nextCursor: string | null }> {
    const { cursor, limit } = options;

    const rows = await client`
      SELECT
        u.id,
        u.display_name,
        u.username,
        u.show_real_name,
        u.avatar_base64,
        f.created_at,
        EXISTS(
          SELECT 1 FROM follows vf
          WHERE vf.follower_id = ${viewerId}
            AND vf.following_id = u.id
            AND vf.status = 'accepted'
        ) AS is_following
      FROM follows f
      INNER JOIN users u ON f.follower_id = u.id
      WHERE f.following_id = ${targetUserId}
        AND f.status = 'accepted'
        ${cursor ? client`AND f.created_at < ${cursor}::timestamptz` : client``}
      ORDER BY f.created_at DESC
      LIMIT ${limit + 1}
    `;

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;

    return {
      items: pageRows.map((r: Record<string, unknown>) => ({
        id: r.id as string,
        displayName: r.display_name as string,
        username: r.username as string | null,
        showRealName: r.show_real_name as boolean,
        avatarBase64: r.avatar_base64 as string | null,
        isFollowing: r.is_following as boolean,
      })),
      nextCursor: hasMore ? (pageRows[pageRows.length - 1].created_at as Date).toISOString() : null,
    };
  }

  async getFollowing(
    targetUserId: string,
    viewerId: string,
    options: { cursor?: string; limit: number },
  ): Promise<{ items: FollowListItemResult[]; nextCursor: string | null }> {
    const { cursor, limit } = options;

    const rows = await client`
      SELECT
        u.id,
        u.display_name,
        u.username,
        u.show_real_name,
        u.avatar_base64,
        f.created_at,
        EXISTS(
          SELECT 1 FROM follows vf
          WHERE vf.follower_id = ${viewerId}
            AND vf.following_id = u.id
            AND vf.status = 'accepted'
        ) AS is_following
      FROM follows f
      INNER JOIN users u ON f.following_id = u.id
      WHERE f.follower_id = ${targetUserId}
        AND f.status = 'accepted'
        ${cursor ? client`AND f.created_at < ${cursor}::timestamptz` : client``}
      ORDER BY f.created_at DESC
      LIMIT ${limit + 1}
    `;

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;

    return {
      items: pageRows.map((r: Record<string, unknown>) => ({
        id: r.id as string,
        displayName: r.display_name as string,
        username: r.username as string | null,
        showRealName: r.show_real_name as boolean,
        avatarBase64: r.avatar_base64 as string | null,
        isFollowing: r.is_following as boolean,
      })),
      nextCursor: hasMore ? (pageRows[pageRows.length - 1].created_at as Date).toISOString() : null,
    };
  }

  async getFollowRequests(
    userId: string,
    options: { cursor?: string; limit: number },
  ): Promise<{
    items: Array<{ id: string; user: FollowListItemResult; createdAt: string }>;
    nextCursor: string | null;
  }> {
    const { cursor, limit } = options;

    const rows = await client`
      SELECT
        f.id AS follow_id,
        f.created_at,
        u.id,
        u.display_name,
        u.username,
        u.show_real_name,
        u.avatar_base64
      FROM follows f
      INNER JOIN users u ON f.follower_id = u.id
      WHERE f.following_id = ${userId}
        AND f.status = 'pending'
        ${cursor ? client`AND f.created_at < ${cursor}::timestamptz` : client``}
      ORDER BY f.created_at DESC
      LIMIT ${limit + 1}
    `;

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;

    return {
      items: pageRows.map((r: Record<string, unknown>) => ({
        id: r.follow_id as string,
        user: {
          id: r.id as string,
          displayName: r.display_name as string,
          username: r.username as string | null,
          showRealName: r.show_real_name as boolean,
          avatarBase64: r.avatar_base64 as string | null,
          isFollowing: false,
        },
        createdAt: (r.created_at as Date).toISOString(),
      })),
      nextCursor: hasMore ? (pageRows[pageRows.length - 1].created_at as Date).toISOString() : null,
    };
  }

  async acceptRequest(userId: string, followId: string): Promise<void> {
    const result = await db
      .update(follows)
      .set({ status: "accepted" })
      .where(
        and(
          eq(follows.id, followId),
          eq(follows.followingId, userId),
          eq(follows.status, "pending"),
        ),
      )
      .returning({ id: follows.id });

    if (result.length === 0) {
      throw new NotFoundError("Follow request not found");
    }
  }

  async declineRequest(userId: string, followId: string): Promise<void> {
    const result = await db
      .delete(follows)
      .where(
        and(
          eq(follows.id, followId),
          eq(follows.followingId, userId),
          eq(follows.status, "pending"),
        ),
      )
      .returning({ id: follows.id });

    if (result.length === 0) {
      throw new NotFoundError("Follow request not found");
    }
  }

  async getPendingRequestCount(userId: string): Promise<number> {
    const [result] = await client`
      SELECT COUNT(*)::int AS count
      FROM follows
      WHERE following_id = ${userId} AND status = 'pending'
    `;
    return result.count;
  }
}
