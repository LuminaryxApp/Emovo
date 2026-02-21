import { pgTable, uuid, varchar, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";

import { groups } from "./groups.js";
import { users } from "./users.js";

export const groupMembers = pgTable(
  "group_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 20 }).notNull().default("member"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    groupUserUnique: uniqueIndex("group_members_group_user_unique").on(table.groupId, table.userId),
    userIdx: index("group_members_user_idx").on(table.userId),
    groupIdx: index("group_members_group_idx").on(table.groupId),
  }),
);
