import { pgTable, uuid, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";

import { conversations } from "./conversations.js";
import { users } from "./users.js";

export const conversationParticipants = pgTable(
  "conversation_participants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lastReadAt: timestamp("last_read_at", { withTimezone: true }),
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    convUserUnique: uniqueIndex("conv_participants_conv_user_unique").on(
      table.conversationId,
      table.userId,
    ),
    userIdx: index("conv_participants_user_idx").on(table.userId),
    convIdx: index("conv_participants_conv_idx").on(table.conversationId),
  }),
);
