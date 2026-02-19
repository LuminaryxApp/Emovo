import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { users } from "./users.js";

export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    tokenFamilyId: uuid("token_family_id").notNull(),
    deviceId: varchar("device_id", { length: 255 }),
    deviceName: varchar("device_name", { length: 255 }),
    ipHash: varchar("ip_hash", { length: 64 }),
    userAgentHash: varchar("user_agent_hash", { length: 64 }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revoked: boolean("revoked").default(false).notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    tokenHashUnique: uniqueIndex("refresh_tokens_token_hash_unique").on(table.tokenHash),
    userActiveIdx: index("refresh_tokens_user_active_idx")
      .on(table.userId)
      .where(sql`revoked = false`),
    familyIdx: index("refresh_tokens_family_idx").on(table.tokenFamilyId),
    expiresActiveIdx: index("refresh_tokens_expires_active_idx")
      .on(table.expiresAt)
      .where(sql`revoked = false`),
  }),
);
