import { pgTable, uuid, varchar, text, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";

import { users } from "./users.js";

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reporterId: uuid("reporter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    targetType: varchar("target_type", { length: 20 }).notNull(), // post | comment | message | user
    targetId: uuid("target_id").notNull(),
    reason: varchar("reason", { length: 30 }).notNull(), // spam | harassment | hate_speech | self_harm | misinformation | inappropriate | other
    description: text("description"),
    status: varchar("status", { length: 20 }).notNull().default("pending"), // pending | reviewed | actioned | dismissed
    reviewedBy: uuid("reviewed_by").references(() => users.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    actionTaken: varchar("action_taken", { length: 30 }), // none | content_removed | user_warned | user_suspended | user_banned
    adminNote: text("admin_note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    statusIdx: index("reports_status_idx").on(table.status),
    targetIdx: index("reports_target_idx").on(table.targetType, table.targetId),
    reporterIdx: index("reports_reporter_idx").on(table.reporterId),
    uniqueReport: uniqueIndex("reports_unique_report_idx").on(
      table.reporterId,
      table.targetType,
      table.targetId,
    ),
  }),
);
