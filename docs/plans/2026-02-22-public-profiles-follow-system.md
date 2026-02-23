# Public Profiles + Follow System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let users view other people's profiles and follow them, with optional private account mode requiring follow approval.

**Architecture:** New `follows` table with server-computed counts (anti-gaming). New `FollowService` handles all follow logic. New `/users/:id` public profile endpoint and follow action endpoints. New mobile screens for profile viewing and follower/following lists. All author names/avatars become tappable throughout the app.

**Tech Stack:** Drizzle ORM schema + raw SQL migration, Fastify routes, Zod validation, Expo Router dynamic screens, Zustand store, Axios API layer.

---

### Task 1: Shared Types and Schemas

**Files:**

- Modify: `packages/shared/src/types/user.ts`
- Create: `packages/shared/src/schemas/follow.schema.ts`
- Modify: `packages/shared/src/index.ts`

**Step 1: Add new types to `packages/shared/src/types/user.ts`**

Append after the existing `UserProfile` interface:

```typescript
export interface PublicProfile {
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

export interface FollowListItem {
  id: string;
  displayName: string;
  username: string | null;
  showRealName: boolean;
  avatarBase64: string | null;
  isFollowing: boolean;
}

export interface FollowRequest {
  id: string;
  user: FollowListItem;
  createdAt: string;
}
```

Also add `bio`, `isPrivate` to both `User` and `UserProfile`:

In `User` interface, add after `showRealName`:

```typescript
bio: string | null;
isPrivate: boolean;
```

In `UserProfile` interface, add after `showRealName`:

```typescript
  bio?: string | null;
  isPrivate?: boolean;
```

**Step 2: Create `packages/shared/src/schemas/follow.schema.ts`**

```typescript
import { z } from "zod";

export const followListQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
```

**Step 3: Update `packages/shared/src/index.ts`**

Add these exports:

```typescript
export type { PublicProfile, FollowListItem, FollowRequest } from "./types/user.js";
export { followListQuerySchema } from "./schemas/follow.schema.js";
```

**Step 4: Commit**

```
feat(shared): add public profile, follow types and schemas
```

---

### Task 2: Database Schema and Migration

**Files:**

- Modify: `packages/server/src/db/schema/users.ts`
- Create: `packages/server/src/db/schema/follows.ts`
- Modify: `packages/server/src/db/schema/index.ts`
- Create: `packages/server/src/db/migrations/0005_add_follows.sql`

**Step 1: Add columns to `packages/server/src/db/schema/users.ts`**

Add after the `showRealName` column:

```typescript
  bio: varchar("bio", { length: 160 }),
  isPrivate: boolean("is_private").default(false).notNull(),
```

**Step 2: Create `packages/server/src/db/schema/follows.ts`**

```typescript
import { sql } from "drizzle-orm";
import { pgTable, uuid, varchar, timestamp, index, uniqueIndex, check } from "drizzle-orm/pg-core";

import { users } from "./users.js";

export const follows = pgTable(
  "follows",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    followerId: uuid("follower_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    followingId: uuid("following_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 10 }).notNull().default("accepted"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    followerFollowingUnique: uniqueIndex("follows_follower_following_unique").on(
      table.followerId,
      table.followingId,
    ),
    followerIdx: index("follows_follower_idx").on(table.followerId),
    followingIdx: index("follows_following_idx").on(table.followingId),
    pendingIdx: index("follows_pending_idx")
      .on(table.followingId, table.status)
      .where(sql`status = 'pending'`),
    noSelfFollow: check("no_self_follow", sql`${table.followerId} != ${table.followingId}`),
    statusCheck: check("follows_status_check", sql`${table.status} IN ('accepted', 'pending')`),
  }),
);
```

**Step 3: Update `packages/server/src/db/schema/index.ts`**

Add line:

```typescript
export { follows } from "./follows.js";
```

**Step 4: Create `packages/server/src/db/migrations/0005_add_follows.sql`**

```sql
-- Add bio and privacy columns to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio VARCHAR(160);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT false;

-- Create follows table
CREATE TABLE IF NOT EXISTS follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(10) NOT NULL DEFAULT 'accepted',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT follows_follower_following_unique UNIQUE (follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id != following_id),
  CONSTRAINT follows_status_check CHECK (status IN ('accepted', 'pending'))
);

CREATE INDEX IF NOT EXISTS follows_follower_idx ON follows(follower_id);
CREATE INDEX IF NOT EXISTS follows_following_idx ON follows(following_id);
CREATE INDEX IF NOT EXISTS follows_pending_idx ON follows(following_id, status) WHERE status = 'pending';
```

**Step 5: Commit**

```
feat(server): add follows table and user bio/privacy columns
```

---

### Task 3: Follow Service

**Files:**

- Create: `packages/server/src/services/follow.service.ts`

**Step 1: Create the service**

```typescript
import { eq, and, sql, desc } from "drizzle-orm";

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
  /**
   * Get a user's public profile with follow counts and viewer's follow status.
   */
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

    // Get follower and following counts (only accepted)
    const [counts] = await client`
      SELECT
        (SELECT COUNT(*)::int FROM follows WHERE following_id = ${targetUserId} AND status = 'accepted') AS follower_count,
        (SELECT COUNT(*)::int FROM follows WHERE follower_id = ${targetUserId} AND status = 'accepted') AS following_count
    `;

    // Get viewer's follow status
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

  /**
   * Follow a user or send a follow request (if private account).
   */
  async follow(
    followerId: string,
    followingId: string,
  ): Promise<{ status: "accepted" | "pending" }> {
    if (followerId === followingId) {
      throw new ConflictError("You cannot follow yourself");
    }

    // Check target exists and get privacy setting
    const [target] = await db
      .select({ id: users.id, isPrivate: users.isPrivate })
      .from(users)
      .where(eq(users.id, followingId))
      .limit(1);

    if (!target) throw new NotFoundError("User not found");

    // Check for existing follow
    const [existing] = await db
      .select({ id: follows.id, status: follows.status })
      .from(follows)
      .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)))
      .limit(1);

    if (existing) {
      if (existing.status === "accepted") {
        throw new ConflictError("Already following this user");
      }
      // Already pending
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

  /**
   * Unfollow a user or cancel a pending follow request.
   */
  async unfollow(followerId: string, followingId: string): Promise<void> {
    const result = await db
      .delete(follows)
      .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)))
      .returning({ id: follows.id });

    if (result.length === 0) {
      throw new NotFoundError("Follow relationship not found");
    }
  }

  /**
   * Get paginated list of a user's followers.
   */
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

  /**
   * Get paginated list of users a user is following.
   */
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

  /**
   * Get pending follow requests for a user (incoming).
   */
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

  /**
   * Accept a follow request.
   */
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

  /**
   * Decline a follow request.
   */
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

  /**
   * Get count of pending follow requests for a user.
   */
  async getPendingRequestCount(userId: string): Promise<number> {
    const [result] = await client`
      SELECT COUNT(*)::int AS count
      FROM follows
      WHERE following_id = ${userId} AND status = 'pending'
    `;
    return result.count;
  }
}
```

**Step 2: Commit**

```
feat(server): add follow service with profile, follow, and request logic
```

---

### Task 4: Follow Routes

**Files:**

- Create: `packages/server/src/routes/follow.routes.ts`
- Modify: `packages/server/src/app.ts`
- Modify: `packages/server/src/routes/user.routes.ts`

**Step 1: Create `packages/server/src/routes/follow.routes.ts`**

```typescript
import { followListQuerySchema } from "@emovo/shared";
import type { FastifyInstance } from "fastify";

import { FollowService } from "../services/follow.service.js";

export async function followRoutes(fastify: FastifyInstance) {
  const followService = new FollowService();

  // All follow routes require authentication
  fastify.addHook("preHandler", fastify.authenticate);

  /**
   * GET /users/:id/profile
   * Get a user's public profile.
   */
  fastify.get("/users/:id/profile", async (request, reply) => {
    const { id } = request.params as { id: string };
    const profile = await followService.getPublicProfile(id, request.userId);
    return reply.send({ data: profile });
  });

  /**
   * POST /users/:id/follow
   * Follow a user or send follow request.
   */
  fastify.post("/users/:id/follow", async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await followService.follow(request.userId, id);
    return reply.status(201).send({ data: result });
  });

  /**
   * DELETE /users/:id/follow
   * Unfollow a user or cancel pending request.
   */
  fastify.delete("/users/:id/follow", async (request, reply) => {
    const { id } = request.params as { id: string };
    await followService.unfollow(request.userId, id);
    return reply.status(204).send();
  });

  /**
   * GET /users/:id/followers
   * Paginated list of a user's followers.
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
   * Paginated list of users a user is following.
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
   * Pending incoming follow requests.
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
   * Count of pending follow requests.
   */
  fastify.get("/users/me/follow-requests/count", async (request, reply) => {
    const count = await followService.getPendingRequestCount(request.userId);
    return reply.send({ data: { count } });
  });

  /**
   * POST /users/me/follow-requests/:id/accept
   * Accept a follow request.
   */
  fastify.post("/users/me/follow-requests/:id/accept", async (request, reply) => {
    const { id } = request.params as { id: string };
    await followService.acceptRequest(request.userId, id);
    return reply.send({ data: { accepted: true } });
  });

  /**
   * DELETE /users/me/follow-requests/:id
   * Decline a follow request.
   */
  fastify.delete("/users/me/follow-requests/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    await followService.declineRequest(request.userId, id);
    return reply.status(204).send();
  });
}
```

**Step 2: Register routes in `packages/server/src/app.ts`**

Add import at the top with other route imports:

```typescript
import { followRoutes } from "./routes/follow.routes.js";
```

Add registration after `userRoutes`:

```typescript
await fastify.register(followRoutes, { prefix: "/api/v1" });
```

**Step 3: Update `packages/server/src/routes/user.routes.ts`**

In the `PATCH /users/me` handler, add support for the new `bio` and `isPrivate` fields in the update logic. Find where `updateData` is built and add:

```typescript
if (body.bio !== undefined) updateData.bio = body.bio;
if (body.isPrivate !== undefined) updateData.isPrivate = body.isPrivate;
```

Also update the `GET /users/me` response to include `bio` and `isPrivate` in the select and return.

**Step 4: Update `packages/shared/src/schemas/user.schema.ts`**

Add `bio` and `isPrivate` to the `updateProfileSchema`:

```typescript
  bio: z.string().max(160).nullable().optional(),
  isPrivate: z.boolean().optional(),
```

**Step 5: Commit**

```
feat(server): add follow routes and register in app
```

---

### Task 5: Mobile API Layer

**Files:**

- Create: `packages/mobile/src/services/follow.api.ts`

**Step 1: Create the API service**

```typescript
import type { PublicProfile, FollowListItem, FollowRequest } from "@emovo/shared";

import { api } from "./api";

export async function getPublicProfileApi(userId: string): Promise<PublicProfile> {
  const { data } = await api.get(`/users/${userId}/profile`);
  return data.data;
}

export async function followUserApi(userId: string): Promise<{ status: "accepted" | "pending" }> {
  const { data } = await api.post(`/users/${userId}/follow`);
  return data.data;
}

export async function unfollowUserApi(userId: string): Promise<void> {
  await api.delete(`/users/${userId}/follow`);
}

export async function getFollowersApi(
  userId: string,
  params?: { cursor?: string; limit?: number },
): Promise<{ items: FollowListItem[]; cursor: string | null }> {
  const { data } = await api.get(`/users/${userId}/followers`, { params });
  return { items: data.data, cursor: data.meta?.cursor ?? null };
}

export async function getFollowingApi(
  userId: string,
  params?: { cursor?: string; limit?: number },
): Promise<{ items: FollowListItem[]; cursor: string | null }> {
  const { data } = await api.get(`/users/${userId}/following`, { params });
  return { items: data.data, cursor: data.meta?.cursor ?? null };
}

export async function getFollowRequestsApi(params?: {
  cursor?: string;
  limit?: number;
}): Promise<{ items: FollowRequest[]; cursor: string | null }> {
  const { data } = await api.get("/users/me/follow-requests", { params });
  return { items: data.data, cursor: data.meta?.cursor ?? null };
}

export async function getFollowRequestCountApi(): Promise<number> {
  const { data } = await api.get("/users/me/follow-requests/count");
  return data.data.count;
}

export async function acceptFollowRequestApi(requestId: string): Promise<void> {
  await api.post(`/users/me/follow-requests/${requestId}/accept`);
}

export async function declineFollowRequestApi(requestId: string): Promise<void> {
  await api.delete(`/users/me/follow-requests/${requestId}`);
}
```

**Step 2: Commit**

```
feat(mobile): add follow API service layer
```

---

### Task 6: Public Profile Screen

**Files:**

- Create: `packages/mobile/app/profile/[id].tsx`

**Step 1: Create the public profile screen**

Build a screen that:

- Uses `useLocalSearchParams()` to get `id` from the route
- Fetches profile via `getPublicProfileApi(id)`
- Shows: large Avatar (2xl) with `uri={profile.avatarBase64}`, display name (using `getPublicName`), @username if present, bio, "Member since" formatted date
- Follower/following counts as tappable `Pressable` that navigate to `/profile/${id}/followers` and `/profile/${id}/following`
- Follow button: "Follow" (primary), "Following" (outline with checkmark), "Requested" (muted)
- If `profile.followStatus === 'self'`, show "Edit Profile" button that navigates to the profile tab
- Uses the same brand styling: `SourceSerif4` fonts, brand colors, `Card`, `Badge` components
- Pull-to-refresh
- Loading state with `ActivityIndicator`
- Back button in header

Follow button logic:

- `followStatus === 'none'` → show "Follow" button, on press call `followUserApi(id)`, update local state
- `followStatus === 'following'` → show "Following" button, on press call `unfollowUserApi(id)`, update local state
- `followStatus === 'pending'` → show "Requested" button, on press call `unfollowUserApi(id)` to cancel, update local state
- `followStatus === 'self'` → show "Edit Profile" button, navigates to profile tab

**Step 2: Commit**

```
feat(mobile): add public profile screen
```

---

### Task 7: Followers and Following List Screens

**Files:**

- Create: `packages/mobile/app/profile/[id]/followers.tsx`
- Create: `packages/mobile/app/profile/[id]/following.tsx`

**Step 1: Create followers screen**

Both screens share the same structure. Each screen:

- Uses `useLocalSearchParams()` to get `id`
- Fetches list via `getFollowersApi(id)` or `getFollowingApi(id)`
- Renders a `FlatList` of user rows, each with:
  - `Avatar` (md size) with `uri={item.avatarBase64}`
  - Display name via `getPublicName(item)`
  - Follow/Unfollow button (small, outline)
  - Tapping the row navigates to `/profile/${item.id}`
- Cursor-based pagination with `onEndReached`
- Loading state, empty state
- Header with back button and title "Followers" / "Following"

**Step 2: Commit**

```
feat(mobile): add followers and following list screens
```

---

### Task 8: Follow Requests Screen

**Files:**

- Create: `packages/mobile/app/follow-requests.tsx`

**Step 1: Create follow requests screen**

Screen for managing incoming follow requests (only relevant for private accounts):

- Fetches via `getFollowRequestsApi()`
- Each row shows: Avatar, display name, "Accept" button (primary), "Decline" button (ghost/outline)
- On accept: call `acceptFollowRequestApi(request.id)`, remove from list
- On decline: call `declineFollowRequestApi(request.id)`, remove from list
- Empty state: "No pending requests"
- Header with back button and title "Follow Requests"

**Step 2: Commit**

```
feat(mobile): add follow requests screen
```

---

### Task 9: Tap Entry Points — Make All Author Names Tappable

**Files:**

- Modify: `packages/mobile/app/(tabs)/community.tsx`
- Modify: `packages/mobile/app/post/[id].tsx`

**Step 1: Community feed — wrap author row in Pressable**

In `renderPostCard` (around line 524), wrap the author avatar + name in a `Pressable` that navigates to the profile:

```typescript
<Pressable onPress={() => router.push(`/profile/${post.author.id}`)}>
  <View style={styles.postAuthorRow}>
    <Avatar name={post.author.displayName} size="md" />
    <View style={styles.postAuthorInfo}>
      <Text style={styles.postAuthorName}>{getPublicName(post.author)}</Text>
      <Text style={styles.postTimestamp}>{formatRelativeTime(post.createdAt)}</Text>
    </View>
  </View>
</Pressable>
```

Keep the mood badge outside the Pressable so it doesn't navigate.

**Step 2: Post detail screen — wrap post author and comment authors**

In `app/post/[id].tsx`:

- Wrap the post author row in a `Pressable` navigating to `/profile/${post.author.id}`
- Wrap each comment author name/avatar in a `Pressable` navigating to `/profile/${comment.author.id}`

**Step 3: Conversation items — add onPress**

In the `renderConversationItem` function, the `Pressable` currently has no `onPress`. This stays as-is because conversations may not map to a single user (could be group chats). Skip this for now.

**Step 4: Online now avatars — add onPress**

In the online now horizontal scroll, wrap each avatar `Pressable` to navigate to the user's profile. The conversation objects have an `id` but may need a `userId` — check the data and wire if available.

**Step 5: Commit**

```
feat(mobile): make author names/avatars tappable for profile navigation
```

---

### Task 10: Privacy Toggle in Profile Settings

**Files:**

- Modify: `packages/mobile/app/(tabs)/profile.tsx`
- Modify: `packages/mobile/src/i18n/locales/en.json` (and other locale files)

**Step 1: Add privacy toggle to profile settings**

In the Account section of profile.tsx (near the `showRealName` toggle), add a new `SettingsRow` for private account:

```typescript
<SettingsRow
  icon="lock-closed-outline"
  label={t("profile.privateAccount")}
  subtitle={t("profile.privateAccountDesc")}
  trailing={
    <View style={{ alignSelf: "center", marginRight: spacing.xs }}>
      <Switch
        value={user?.isPrivate ?? false}
        onValueChange={async (val) => {
          try {
            await updateProfile({ isPrivate: val });
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          } catch {
            Alert.alert(t("common.error"), t("profile.failedUpdateProfile"));
          }
        }}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={colors.surface}
      />
    </View>
  }
/>
<Divider spacing={0} />
```

**Step 2: Add follow requests link with badge**

Below the privacy toggle, add a `SettingsRow` that navigates to the follow requests screen (only visible when user has isPrivate enabled or has pending requests):

```typescript
<SettingsRow
  icon="person-add-outline"
  label={t("profile.followRequests")}
  onPress={() => router.push("/follow-requests")}
  trailing={pendingCount > 0 ? <Badge variant="error" size="sm">{pendingCount}</Badge> : undefined}
/>
```

Fetch the pending count on mount via `getFollowRequestCountApi()`.

**Step 3: Add bio edit**

Add a `SettingsRow` for editing bio in the profile section, near the display name edit.

**Step 4: Add i18n keys to `en.json`**

```json
"privateAccount": "Private account",
"privateAccountDesc": "People must request to follow you",
"followRequests": "Follow requests",
"bio": "Bio",
"bioExample": "Tell people about yourself (160 chars)"
```

**Step 5: Commit**

```
feat(mobile): add privacy toggle, bio edit, and follow requests link in profile
```

---

### Task 11: i18n for All New Screens

**Files:**

- Modify: `packages/mobile/src/i18n/locales/en.json`
- Modify: all other locale files (es, fr, de, pt, ar, ja, zh, ru, hi)

**Step 1: Add English translations**

Add a `"publicProfile"` section to `en.json`:

```json
"publicProfile": {
  "memberSince": "Member since {{date}}",
  "followers": "Followers",
  "following": "Following",
  "follow": "Follow",
  "unfollow": "Unfollow",
  "requested": "Requested",
  "editProfile": "Edit Profile",
  "noFollowers": "No followers yet",
  "noFollowing": "Not following anyone yet",
  "followRequests": "Follow Requests",
  "noRequests": "No pending requests",
  "accept": "Accept",
  "decline": "Decline"
}
```

**Step 2: Add translations for other locales**

Use appropriate translations for each language file.

**Step 3: Commit**

```
feat(mobile): add i18n translations for profiles and follow system
```

---

### Task 12: Final Integration and Testing

**Step 1: Run TypeScript checks**

```bash
cd packages/server && npx tsc --noEmit
cd ../mobile && npx tsc --noEmit
```

**Step 2: Run the migration on local DB**

```bash
cd packages/server
psql $DATABASE_URL < src/db/migrations/0005_add_follows.sql
```

**Step 3: Test the full flow manually**

1. Start server, open app
2. Create two test accounts
3. View profile from community feed by tapping author
4. Follow from profile screen → verify count updates
5. Set one account to private → verify follow request flow
6. Accept/decline requests → verify state changes
7. View followers/following lists
8. Verify self-follow is blocked

**Step 4: Commit any fixes**

```
fix: address integration issues from testing
```

**Step 5: Final commit and push**

```bash
git push origin main
```
