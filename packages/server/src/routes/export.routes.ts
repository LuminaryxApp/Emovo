import { eq, desc } from "drizzle-orm";
import type { FastifyInstance } from "fastify";

import { db } from "../config/database.js";
import { entryTriggers } from "../db/schema/entry-triggers.js";
import { moodEntries } from "../db/schema/mood-entries.js";
import { triggers } from "../db/schema/triggers.js";
import { decryptNote } from "../services/encryption.service.js";

export async function exportRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  /**
   * GET /export/json
   * Streamed JSON export, notes decrypted on-the-fly.
   */
  fastify.get("/export/json", async (request, reply) => {
    const date = new Date().toISOString().split("T")[0];

    reply.header("Content-Type", "application/json");
    reply.header("Content-Disposition", `attachment; filename="emovo-export-${date}.json"`);
    reply.header("Cache-Control", "no-store");

    const allEntries = await db
      .select({
        id: moodEntries.id,
        moodScore: moodEntries.moodScore,
        encryptedNote: moodEntries.encryptedNote,
        noteKeyVersion: moodEntries.noteKeyVersion,
        loggedAt: moodEntries.loggedAt,
        createdAt: moodEntries.createdAt,
      })
      .from(moodEntries)
      .where(eq(moodEntries.userId, request.userId))
      .orderBy(desc(moodEntries.loggedAt));

    const results = [];
    for (const entry of allEntries) {
      // Decrypt note
      let note: string | null = null;
      if (entry.encryptedNote) {
        const buf = Buffer.isBuffer(entry.encryptedNote)
          ? entry.encryptedNote
          : Buffer.from(entry.encryptedNote as unknown as Uint8Array);
        note = decryptNote(buf, request.userId, entry.id, entry.noteKeyVersion);
      }

      // Get triggers
      const triggerRows = await db
        .select({ name: triggers.name })
        .from(entryTriggers)
        .innerJoin(triggers, eq(entryTriggers.triggerId, triggers.id))
        .where(eq(entryTriggers.entryId, entry.id));

      results.push({
        moodScore: entry.moodScore,
        note,
        triggers: triggerRows.map((t) => t.name),
        loggedAt: entry.loggedAt.toISOString(),
        createdAt: entry.createdAt.toISOString(),
      });
    }

    return reply.send({
      data: results,
      meta: { exportedAt: new Date().toISOString(), count: results.length },
    });
  });

  /**
   * GET /export/csv
   * Streamed CSV export, notes decrypted on-the-fly.
   */
  fastify.get("/export/csv", async (request, reply) => {
    const date = new Date().toISOString().split("T")[0];

    reply.header("Content-Type", "text/csv");
    reply.header("Content-Disposition", `attachment; filename="emovo-export-${date}.csv"`);
    reply.header("Cache-Control", "no-store");

    const allEntries = await db
      .select({
        id: moodEntries.id,
        moodScore: moodEntries.moodScore,
        encryptedNote: moodEntries.encryptedNote,
        noteKeyVersion: moodEntries.noteKeyVersion,
        loggedAt: moodEntries.loggedAt,
        createdAt: moodEntries.createdAt,
      })
      .from(moodEntries)
      .where(eq(moodEntries.userId, request.userId))
      .orderBy(desc(moodEntries.loggedAt));

    let csv = "mood_score,note,triggers,logged_at,created_at\n";

    for (const entry of allEntries) {
      let note: string | null = null;
      if (entry.encryptedNote) {
        const buf = Buffer.isBuffer(entry.encryptedNote)
          ? entry.encryptedNote
          : Buffer.from(entry.encryptedNote as unknown as Uint8Array);
        note = decryptNote(buf, request.userId, entry.id, entry.noteKeyVersion);
      }

      const triggerRows = await db
        .select({ name: triggers.name })
        .from(entryTriggers)
        .innerJoin(triggers, eq(entryTriggers.triggerId, triggers.id))
        .where(eq(entryTriggers.entryId, entry.id));

      const escapedNote = note ? `"${note.replace(/"/g, '""')}"` : "";
      const triggerNames = triggerRows.map((t) => t.name).join(";");

      csv += `${entry.moodScore},${escapedNote},${triggerNames},${entry.loggedAt.toISOString()},${entry.createdAt.toISOString()}\n`;
    }

    return reply.send(csv);
  });
}
