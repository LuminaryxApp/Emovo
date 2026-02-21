import { sql } from "drizzle-orm";
import { pgTable, uuid, varchar, text, timestamp, index, check } from "drizzle-orm/pg-core";

import { conversations } from "./conversations.js";
import { users } from "./users.js";

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    type: varchar("type", { length: 20 }).notNull().default("text"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    convIdx: index("messages_conv_idx").on(table.conversationId, table.createdAt),
    senderIdx: index("messages_sender_idx").on(table.senderId),
    contentCheck: check("messages_content_check", sql`char_length(${table.content}) <= 2000`),
  }),
);
