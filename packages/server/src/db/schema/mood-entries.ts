import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  integer,
  timestamp,
  index,
  uniqueIndex,
  check,
  customType,
} from "drizzle-orm/pg-core";

import { users } from "./users.js";

const bytea = customType<{ data: Buffer; dpiverType: string }>({
  dataType() {
    return "bytea";
  },
});

export const moodEntries = pgTable(
  "mood_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    clientEntryId: uuid("client_entry_id").notNull(),
    moodScore: integer("mood_score").notNull(),
    encryptedNote: bytea("encrypted_note"),
    noteKeyVersion: integer("note_key_version").default(1).notNull(),
    loggedAt: timestamp("logged_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("mood_entries_user_idx").on(table.userId),
    userLoggedAtIdx: index("mood_entries_user_logged_at_idx").on(
      table.userId,
      table.loggedAt,
      table.id,
    ),
    userCreatedAtIdx: index("mood_entries_user_created_at_idx").on(table.userId, table.createdAt),
    clientEntryUnique: uniqueIndex("mood_entries_user_client_entry_unique").on(
      table.userId,
      table.clientEntryId,
    ),
    moodScoreCheck: check(
      "mood_score_check",
      sql`${table.moodScore} >= 1 AND ${table.moodScore} <= 5`,
    ),
    encryptedNoteCheck: check(
      "encrypted_note_check",
      sql`${table.encryptedNote} IS NULL OR octet_length(${table.encryptedNote}) >= 28`,
    ),
    loggedAtCheck: check("logged_at_check", sql`${table.loggedAt} <= now() + interval '5 minutes'`),
  }),
);
