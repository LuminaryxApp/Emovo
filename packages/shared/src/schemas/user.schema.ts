import { z } from "zod";

export const registerSchema = z.object({
  email: z
    .string()
    .email()
    .max(255)
    .transform((e) => e.trim().toLowerCase()),
  password: z.string().min(8).max(128),
  displayName: z.string().min(1).max(100).trim(),
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
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
