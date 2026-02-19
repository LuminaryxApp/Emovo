import { randomUUID } from "node:crypto";

import type { CreateMoodInput, UpdateMoodInput } from "@emovo/shared";
import { eq, and, sql, desc, lt, gte, inArray } from "drizzle-orm";

import { db } from "../config/database.js";
import { entryTriggers } from "../db/schema/entry-triggers.js";
import { moodEntries } from "../db/schema/mood-entries.js";
import { triggers } from "../db/schema/triggers.js";
import { users } from "../db/schema/users.js";
import { NotFoundError } from "../utils/errors.js";
import { encodeCursor, decodeCursor } from "../utils/pagination.js";

import { encryptNote, decryptNote } from "./encryption.service.js";

interface MoodEntryResult {
  id: string;
  clientEntryId: string;
  moodScore: number;
  note: string | null;
  triggers: Array<{ id: string; name: string; icon: string | null; isDefault: boolean }>;
  loggedAt: string;
  createdAt: string;
  updatedAt: string;
}

export class MoodService {
  /**
   * Create a mood entry. Idempotent via clientEntryId.
   * On conflict: returns existing entry (no error).
   */
  async createEntry(userId: string, input: CreateMoodInput): Promise<MoodEntryResult> {
    // Get user's encryption key version
    const [user] = await db
      .select({ encryptionKeyVersion: users.encryptionKeyVersion })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) throw new NotFoundError("User not found");

    // Check for existing entry with same clientEntryId (idempotent)
    const [existing] = await db
      .select({ id: moodEntries.id })
      .from(moodEntries)
      .where(
        and(eq(moodEntries.userId, userId), eq(moodEntries.clientEntryId, input.clientEntryId)),
      )
      .limit(1);

    if (existing) {
      // Return the existing entry
      return this.getEntry(userId, existing.id);
    }

    const entryId = randomUUID();
    const keyVersion = user.encryptionKeyVersion;

    // Encrypt note if provided
    let encryptedNote: Buffer | null = null;
    if (input.note) {
      encryptedNote = encryptNote(input.note, userId, entryId, keyVersion);
    }

    // Insert mood entry
    await db.insert(moodEntries).values({
      id: entryId,
      userId,
      clientEntryId: input.clientEntryId,
      moodScore: input.moodScore,
      encryptedNote: encryptedNote,
      noteKeyVersion: keyVersion,
      loggedAt: input.loggedAt ? new Date(input.loggedAt) : new Date(),
    });

    // Insert trigger associations
    if (input.triggerIds?.length) {
      const values = input.triggerIds.map((triggerId: string) => ({
        entryId,
        triggerId,
      }));
      // ON CONFLICT DO NOTHING for idempotent junction inserts
      for (const val of values) {
        await db.insert(entryTriggers).values(val).onConflictDoNothing();
      }
    }

    return this.getEntry(userId, entryId);
  }

  /**
   * Get a single mood entry by ID with decrypted note and triggers.
   */
  async getEntry(userId: string, entryId: string): Promise<MoodEntryResult> {
    const [entry] = await db
      .select({
        id: moodEntries.id,
        userId: moodEntries.userId,
        clientEntryId: moodEntries.clientEntryId,
        moodScore: moodEntries.moodScore,
        encryptedNote: moodEntries.encryptedNote,
        noteKeyVersion: moodEntries.noteKeyVersion,
        loggedAt: moodEntries.loggedAt,
        createdAt: moodEntries.createdAt,
        updatedAt: moodEntries.updatedAt,
      })
      .from(moodEntries)
      .where(and(eq(moodEntries.id, entryId), eq(moodEntries.userId, userId)))
      .limit(1);

    if (!entry) throw new NotFoundError("Mood entry not found");

    // Get associated triggers
    const triggerRows = await db
      .select({
        id: triggers.id,
        name: triggers.name,
        icon: triggers.icon,
        isDefault: triggers.isDefault,
      })
      .from(entryTriggers)
      .innerJoin(triggers, eq(entryTriggers.triggerId, triggers.id))
      .where(eq(entryTriggers.entryId, entryId));

    // Decrypt note
    let note: string | null = null;
    if (entry.encryptedNote) {
      const buf = Buffer.isBuffer(entry.encryptedNote)
        ? entry.encryptedNote
        : Buffer.from(entry.encryptedNote as unknown as Uint8Array);
      note = decryptNote(buf, userId, entry.id, entry.noteKeyVersion);
    }

    return {
      id: entry.id,
      clientEntryId: entry.clientEntryId,
      moodScore: entry.moodScore,
      note,
      triggers: triggerRows,
      loggedAt: entry.loggedAt.toISOString(),
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
    };
  }

  /**
   * List mood entries with cursor pagination.
   * Cursor: base64 JSON { loggedAt, id }
   * Order: logged_at DESC, id DESC
   */
  async listEntries(
    userId: string,
    options: { cursor?: string; limit: number; from?: string; to?: string },
  ): Promise<{ entries: MoodEntryResult[]; nextCursor: string | null }> {
    const { cursor, limit, from, to } = options;

    const conditions = [eq(moodEntries.userId, userId)];

    // Apply cursor
    if (cursor) {
      const decoded = decodeCursor(cursor);
      if (decoded) {
        conditions.push(
          sql`(${moodEntries.loggedAt}, ${moodEntries.id}) < (${decoded.loggedAt}::timestamptz, ${decoded.id}::uuid)`,
        );
      }
    }

    // Apply date range filters
    if (from) {
      conditions.push(gte(moodEntries.loggedAt, new Date(from)));
    }
    if (to) {
      conditions.push(lt(moodEntries.loggedAt, new Date(to)));
    }

    const rows = await db
      .select({
        id: moodEntries.id,
        userId: moodEntries.userId,
        clientEntryId: moodEntries.clientEntryId,
        moodScore: moodEntries.moodScore,
        encryptedNote: moodEntries.encryptedNote,
        noteKeyVersion: moodEntries.noteKeyVersion,
        loggedAt: moodEntries.loggedAt,
        createdAt: moodEntries.createdAt,
        updatedAt: moodEntries.updatedAt,
      })
      .from(moodEntries)
      .where(and(...conditions))
      .orderBy(desc(moodEntries.loggedAt), desc(moodEntries.id))
      .limit(limit + 1); // Fetch one extra to determine if there's a next page

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;

    // Batch fetch triggers for all entries
    const entryIds = pageRows.map((r) => r.id);
    const allTriggerRows = entryIds.length
      ? await db
          .select({
            entryId: entryTriggers.entryId,
            triggerId: triggers.id,
            triggerName: triggers.name,
            triggerIcon: triggers.icon,
            triggerIsDefault: triggers.isDefault,
          })
          .from(entryTriggers)
          .innerJoin(triggers, eq(entryTriggers.triggerId, triggers.id))
          .where(inArray(entryTriggers.entryId, entryIds))
      : [];

    // Group triggers by entry
    const triggersByEntry = new Map<
      string,
      Array<{ id: string; name: string; icon: string | null; isDefault: boolean }>
    >();
    for (const row of allTriggerRows) {
      if (!triggersByEntry.has(row.entryId)) {
        triggersByEntry.set(row.entryId, []);
      }
      triggersByEntry.get(row.entryId)!.push({
        id: row.triggerId,
        name: row.triggerName,
        icon: row.triggerIcon,
        isDefault: row.triggerIsDefault,
      });
    }

    // Build results
    const entries: MoodEntryResult[] = pageRows.map((entry) => {
      let note: string | null = null;
      if (entry.encryptedNote) {
        const buf = Buffer.isBuffer(entry.encryptedNote)
          ? entry.encryptedNote
          : Buffer.from(entry.encryptedNote as unknown as Uint8Array);
        note = decryptNote(buf, userId, entry.id, entry.noteKeyVersion);
      }

      return {
        id: entry.id,
        clientEntryId: entry.clientEntryId,
        moodScore: entry.moodScore,
        note,
        triggers: triggersByEntry.get(entry.id) || [],
        loggedAt: entry.loggedAt.toISOString(),
        createdAt: entry.createdAt.toISOString(),
        updatedAt: entry.updatedAt.toISOString(),
      };
    });

    const nextCursor = hasMore
      ? encodeCursor({
          loggedAt: pageRows[pageRows.length - 1].loggedAt.toISOString(),
          id: pageRows[pageRows.length - 1].id,
        })
      : null;

    return { entries, nextCursor };
  }

  /**
   * Update a mood entry.
   */
  async updateEntry(
    userId: string,
    entryId: string,
    input: UpdateMoodInput,
  ): Promise<MoodEntryResult> {
    // Verify ownership
    const [entry] = await db
      .select({
        id: moodEntries.id,
        userId: moodEntries.userId,
        noteKeyVersion: moodEntries.noteKeyVersion,
      })
      .from(moodEntries)
      .where(and(eq(moodEntries.id, entryId), eq(moodEntries.userId, userId)))
      .limit(1);

    if (!entry) throw new NotFoundError("Mood entry not found");

    // Get current encryption key version
    const [user] = await db
      .select({ encryptionKeyVersion: users.encryptionKeyVersion })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const keyVersion = user!.encryptionKeyVersion;

    // Build update object
    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if (input.moodScore !== undefined) {
      updates.moodScore = input.moodScore;
    }

    if (input.note !== undefined) {
      if (input.note === null) {
        updates.encryptedNote = null;
      } else {
        updates.encryptedNote = encryptNote(input.note, userId, entryId, keyVersion);
        updates.noteKeyVersion = keyVersion;
      }
    }

    await db.update(moodEntries).set(updates).where(eq(moodEntries.id, entryId));

    // Update triggers if provided
    if (input.triggerIds !== undefined) {
      // Delete existing trigger associations
      await db.delete(entryTriggers).where(eq(entryTriggers.entryId, entryId));

      // Insert new ones
      if (input.triggerIds.length > 0) {
        for (const triggerId of input.triggerIds) {
          await db.insert(entryTriggers).values({ entryId, triggerId }).onConflictDoNothing();
        }
      }
    }

    return this.getEntry(userId, entryId);
  }

  /**
   * Delete a mood entry.
   */
  async deleteEntry(userId: string, entryId: string): Promise<void> {
    const result = await db
      .delete(moodEntries)
      .where(and(eq(moodEntries.id, entryId), eq(moodEntries.userId, userId)))
      .returning({ id: moodEntries.id });

    if (result.length === 0) {
      throw new NotFoundError("Mood entry not found");
    }
  }
}
