import { z } from "zod";

export const createPostSchema = z.object({
  content: z.string().min(1).max(2000).trim(),
  moodScore: z.number().int().min(1).max(5).nullable().optional(),
  type: z.enum(["mood_update", "tip", "photo"]).default("mood_update"),
  imageUrl: z.string().url().max(500).nullable().optional(),
});

export const createCommentSchema = z.object({
  content: z.string().min(1).max(1000).trim(),
});

export const createGroupSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  description: z.string().max(500).trim().nullable().optional(),
  icon: z.string().min(1).max(10).default("💬"),
  gradientStart: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .default("#75863C"),
  gradientEnd: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .default("#8FA04E"),
  isPublic: z.boolean().default(true),
});

export const sendMessageSchema = z.object({
  content: z.string().min(1).max(2000).trim(),
  type: z.enum(["text", "image"]).default("text"),
});

export const createConversationSchema = z.object({
  participantId: z.string().uuid(),
});

export const feedQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const groupQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  search: z.string().max(100).optional(),
});

export const messageQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type CreateConversationInput = z.infer<typeof createConversationSchema>;
