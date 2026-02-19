import { updateProfileSchema } from "@emovo/shared";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";

import { db } from "../config/database.js";
import { users } from "../db/schema/users.js";
import { AuthService } from "../services/auth.service.js";
import { NotFoundError } from "../utils/errors.js";

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
        timezone: users.timezone,
        notificationsEnabled: users.notificationsEnabled,
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
        timezone: user.timezone,
        notificationsEnabled: user.notificationsEnabled,
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
    if (body.timezone !== undefined) updateData.timezone = body.timezone;
    if (body.notificationsEnabled !== undefined)
      updateData.notificationsEnabled = body.notificationsEnabled;

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
        timezone: users.timezone,
        notificationsEnabled: users.notificationsEnabled,
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
        timezone: updated.timezone,
        notificationsEnabled: updated.notificationsEnabled,
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
