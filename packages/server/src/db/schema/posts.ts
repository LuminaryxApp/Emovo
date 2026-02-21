import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  index,
  check,
} from "drizzle-orm/pg-core";

import { users } from "./users.js";

export const posts = pgTable(
  "posts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    moodScore: integer("mood_score"),
    type: varchar("type", { length: 20 }).notNull().default("mood_update"),
    imageUrl: varchar("image_url", { length: 500 }),
    likeCount: integer("like_count").notNull().default(0),
    commentCount: integer("comment_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("posts_user_idx").on(table.userId),
    createdAtIdx: index("posts_created_at_idx").on(table.createdAt),
    typeIdx: index("posts_type_idx").on(table.type),
    contentCheck: check("posts_content_check", sql`char_length(${table.content}) <= 2000`),
    moodScoreCheck: check(
      "posts_mood_score_check",
      sql`${table.moodScore} IS NULL OR (${table.moodScore} >= 1 AND ${table.moodScore} <= 5)`,
    ),
  }),
);
