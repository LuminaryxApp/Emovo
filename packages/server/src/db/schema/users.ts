import { pgTable, uuid, varchar, boolean, integer, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  // citext requires the extension to be enabled; in migration we add CREATE EXTENSION IF NOT EXISTS citext;
  // For Drizzle we use varchar and handle case-insensitive comparison at the application level
  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  emailVerificationTokenHash: varchar("email_verification_token_hash", { length: 64 }),
  emailVerificationExpires: timestamp("email_verification_expires", { withTimezone: true }),
  emailVerificationSentAt: timestamp("email_verification_sent_at", { withTimezone: true }),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  passwordResetTokenHash: varchar("password_reset_token_hash", { length: 64 }),
  passwordResetExpires: timestamp("password_reset_expires", { withTimezone: true }),
  passwordResetSentAt: timestamp("password_reset_sent_at", { withTimezone: true }),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  tokenVersion: integer("token_version").default(0).notNull(),
  encryptionKeyVersion: integer("encryption_key_version").default(1).notNull(),
  timezone: varchar("timezone", { length: 50 }).default("UTC").notNull(),
  notificationsEnabled: boolean("notifications_enabled").default(true).notNull(),
  preferredLanguage: varchar("preferred_language", { length: 5 }).default("en").notNull(),
  failedLoginAttempts: integer("failed_login_attempts").default(0).notNull(),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
