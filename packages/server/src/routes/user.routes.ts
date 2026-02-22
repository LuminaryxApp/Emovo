import { updateProfileSchema } from "@emovo/shared";
import { eq, and, ne } from "drizzle-orm";
import type { FastifyInstance } from "fastify";

import { db } from "../config/database.js";
import { users } from "../db/schema/users.js";
import { AuthService } from "../services/auth.service.js";
import { isUsernameBlocked } from "../utils/blocked-usernames.js";
import { NotFoundError, ConflictError, ValidationError } from "../utils/errors.js";

export async function userRoutes(fastify: FastifyInstance) {
  const authService = new AuthService(fastify);

  // All user routes require authentication
  fastify.addHook("preHandler", fastify.authenticate);

  /**
   * GET /users/me
   */
  fastify.get("/users/me", async (request, reply) => {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        emailVerified: users.emailVerified,
        displayName: users.displayName,
        username: users.username,
        showRealName: users.showRealName,
        timezone: users.timezone,
        notificationsEnabled: users.notificationsEnabled,
        preferredLanguage: users.preferredLanguage,
        avatarBase64: users.avatarBase64,
        reminderTime: users.reminderTime,
        themePreference: users.themePreference,
        isAdmin: users.isAdmin,
        bannedAt: users.bannedAt,
        suspendedUntil: users.suspendedUntil,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, request.userId))
      .limit(1);

    if (!user) throw new NotFoundError("User not found");

    return reply.send({
      data: {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        displayName: user.displayName,
        username: user.username,
        showRealName: user.showRealName,
        timezone: user.timezone,
        notificationsEnabled: user.notificationsEnabled,
        preferredLanguage: user.preferredLanguage,
        avatarBase64: user.avatarBase64,
        reminderTime: user.reminderTime,
        themePreference: user.themePreference,
        isAdmin: user.isAdmin,
        bannedAt: user.bannedAt?.toISOString() ?? null,
        suspendedUntil: user.suspendedUntil?.toISOString() ?? null,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
    });
  });

  /**
   * PATCH /users/me
   */
  fastify.patch("/users/me", async (request, reply) => {
    const body = updateProfileSchema.parse(request.body);
    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (body.displayName !== undefined) updateData.displayName = body.displayName;

    // Username validation: check blocked words + uniqueness
    if (body.username !== undefined && body.username !== null) {
      const blocked = isUsernameBlocked(body.username);
      if (blocked.blocked) {
        throw new ValidationError("This username is not allowed");
      }

      const [existingUsername] = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.username, body.username), ne(users.id, request.userId)))
        .limit(1);

      if (existingUsername) {
        throw new ConflictError("This username is already taken");
      }
    }
    if (body.username !== undefined) updateData.username = body.username;
    if (body.showRealName !== undefined) updateData.showRealName = body.showRealName;
    if (body.timezone !== undefined) updateData.timezone = body.timezone;
    if (body.notificationsEnabled !== undefined)
      updateData.notificationsEnabled = body.notificationsEnabled;
    if (body.preferredLanguage !== undefined) updateData.preferredLanguage = body.preferredLanguage;
    if (body.avatarBase64 !== undefined) updateData.avatarBase64 = body.avatarBase64;
    if (body.reminderTime !== undefined) updateData.reminderTime = body.reminderTime;
    if (body.themePreference !== undefined) updateData.themePreference = body.themePreference;

    // Email change triggers re-verification
    if (body.email !== undefined) {
      updateData.email = body.email;
      updateData.emailVerified = false;
    }

    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, request.userId))
      .returning({
        id: users.id,
        email: users.email,
        emailVerified: users.emailVerified,
        displayName: users.displayName,
        username: users.username,
        showRealName: users.showRealName,
        timezone: users.timezone,
        notificationsEnabled: users.notificationsEnabled,
        preferredLanguage: users.preferredLanguage,
        avatarBase64: users.avatarBase64,
        reminderTime: users.reminderTime,
        themePreference: users.themePreference,
        isAdmin: users.isAdmin,
        bannedAt: users.bannedAt,
        suspendedUntil: users.suspendedUntil,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      });

    if (!updated) throw new NotFoundError("User not found");

    // If email changed, send verification
    if (body.email !== undefined) {
      await authService.createVerificationToken(updated.id);
      // TODO: Send verification email
    }

    return reply.send({
      data: {
        id: updated.id,
        email: updated.email,
        emailVerified: updated.emailVerified,
        displayName: updated.displayName,
        username: updated.username,
        showRealName: updated.showRealName,
        timezone: updated.timezone,
        notificationsEnabled: updated.notificationsEnabled,
        preferredLanguage: updated.preferredLanguage,
        avatarBase64: updated.avatarBase64,
        reminderTime: updated.reminderTime,
        themePreference: updated.themePreference,
        isAdmin: updated.isAdmin,
        bannedAt: updated.bannedAt?.toISOString() ?? null,
        suspendedUntil: updated.suspendedUntil?.toISOString() ?? null,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  });

  /**
   * DELETE /users/me
   * Cascades all data via FK constraints.
   */
  fastify.delete("/users/me", async (request, reply) => {
    const [deleted] = await db
      .delete(users)
      .where(eq(users.id, request.userId))
      .returning({ id: users.id });

    if (!deleted) throw new NotFoundError("User not found");

    return reply.send({ data: { success: true } });
  });
}
