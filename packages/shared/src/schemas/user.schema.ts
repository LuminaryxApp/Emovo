import { z } from "zod";

export const registerSchema = z.object({
  email: z
    .string()
    .email()
    .max(255)
    .transform((e) => e.trim().toLowerCase()),
  password: z.string().min(8).max(128),
  displayName: z.string().min(1).max(100).trim(),
  preferredLanguage: z
    .enum(["en", "es", "fr", "de", "pt", "ja", "zh", "ar", "hi", "ru"])
    .optional()
    .default("en"),
});

export const loginSchema = z.object({
  email: z
    .string()
    .email()
    .max(255)
    .transform((e) => e.trim().toLowerCase()),
  password: z.string().min(1).max(128),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1),
});

export const resendVerificationSchema = z.object({
  email: z
    .string()
    .email()
    .max(255)
    .transform((e) => e.trim().toLowerCase()),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .email()
    .max(255)
    .transform((e) => e.trim().toLowerCase()),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(1),
});

export const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(100).trim().optional(),
  timezone: z.string().max(50).optional(),
  notificationsEnabled: z.boolean().optional(),
  email: z
    .string()
    .email()
    .max(255)
    .transform((e) => e.trim().toLowerCase())
    .optional(),
  preferredLanguage: z
    .enum(["en", "es", "fr", "de", "pt", "ja", "zh", "ar", "hi", "ru"])
    .optional(),
  avatarBase64: z.string().max(500_000).nullable().optional(),
  reminderTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Must be HH:MM format")
    .nullable()
    .optional(),
  themePreference: z.enum(["light", "dark", "system"]).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
