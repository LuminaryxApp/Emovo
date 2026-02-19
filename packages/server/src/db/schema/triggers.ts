import { sql } from "drizzle-orm";
import { pgTable, uuid, varchar, boolean, timestamp, index } from "drizzle-orm/pg-core";

import { users } from "./users.js";

export const triggers = pgTable(
  "triggers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    icon: varchar("icon", { length: 50 }),
    isDefault: boolean("is_default").default(false).notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    // Partial expression index: unique (user_id, lower(name)) WHERE user_id IS NOT NULL
    // This prevents duplicate custom trigger names per user without affecting defaults
    userNameUnique: index("triggers_user_name_unique")
      .on(table.userId, table.name)
      .where(sql`${table.userId} IS NOT NULL`),
  }),
);
