import { pgTable, uuid, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";

import { posts } from "./posts.js";
import { users } from "./users.js";

export const postLikes = pgTable(
  "post_likes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userPostUnique: uniqueIndex("post_likes_user_post_unique").on(table.postId, table.userId),
    postIdx: index("post_likes_post_idx").on(table.postId),
  }),
);
