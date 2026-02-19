import { z } from "zod";

import { MAX_MOOD_SCORE, MAX_NOTE_LENGTH, MIN_MOOD_SCORE } from "../constants/moods.js";

export const createMoodSchema = z.object({
  moodScore: z.number().int().min(MIN_MOOD_SCORE).max(MAX_MOOD_SCORE),
  note: z.string().max(MAX_NOTE_LENGTH).optional(),
  triggerIds: z.array(z.string().uuid()).optional(),
  loggedAt: z.string().datetime().optional(),
  clientEntryId: z.string().uuid(),
});

export const updateMoodSchema = z.object({
  moodScore: z.number().int().min(MIN_MOOD_SCORE).max(MAX_MOOD_SCORE).optional(),
  note: z.string().max(MAX_NOTE_LENGTH).nullable().optional(),
  triggerIds: z.array(z.string().uuid()).optional(),
});

export const createTriggerSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  icon: z.string().max(50).optional(),
});

export const moodQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export const statsQuerySchema = z.object({
  period: z.enum(["week", "month", "year"]).default("week"),
  date: z.string().datetime().optional(),
});

export type CreateMoodInput = z.infer<typeof createMoodSchema>;
export type UpdateMoodInput = z.infer<typeof updateMoodSchema>;
export type CreateTriggerInput = z.infer<typeof createTriggerSchema>;
