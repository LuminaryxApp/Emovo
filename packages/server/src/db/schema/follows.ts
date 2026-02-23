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
