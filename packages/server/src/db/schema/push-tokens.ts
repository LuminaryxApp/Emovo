import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";

import { users } from "./users.js";

export const pushTokens = pgTable("push_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 255 }).notNull().unique(),
  platform: varchar("platform", { length: 10 }).notNull(), // "ios" | "android"
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
