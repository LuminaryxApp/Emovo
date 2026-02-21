import { pgTable, uuid, varchar, timestamp, index } from "drizzle-orm/pg-core";

import { groups } from "./groups.js";

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    type: varchar("type", { length: 20 }).notNull().default("direct"),
    groupId: uuid("group_id").references(() => groups.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    typeIdx: index("conversations_type_idx").on(table.type),
    groupIdx: index("conversations_group_idx").on(table.groupId),
  }),
);
