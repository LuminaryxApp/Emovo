import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

import { users } from "./users.js";

export const groups = pgTable(
  "groups",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    icon: varchar("icon", { length: 10 }).notNull().default("💬"),
    gradientStart: varchar("gradient_start", { length: 7 }).notNull().default("#75863C"),
    gradientEnd: varchar("gradient_end", { length: 7 }).notNull().default("#8FA04E"),
    isPublic: boolean("is_public").notNull().default(true),
    memberCount: integer("member_count").notNull().default(0),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    nameIdx: index("groups_name_idx").on(table.name),
    publicIdx: index("groups_public_idx").on(table.isPublic),
  }),
);
