import { createTriggerSchema } from "@emovo/shared";
import { eq, and, or, isNull, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";

import { db } from "../config/database.js";
import { triggers } from "../db/schema/triggers.js";
import { NotFoundError, ConflictError, ForbiddenError } from "../utils/errors.js";

export async function triggerRoutes(fastify: FastifyInstance) {
  // All trigger routes require authentication
  fastify.addHook("preHandler", fastify.authenticate);

  /**
   * GET /triggers
   * Returns all default triggers + user's custom triggers.
   */
  fastify.get("/triggers", async (request, reply) => {
    const rows = await db
      .select({
        id: triggers.id,
        name: triggers.name,
        icon: triggers.icon,
        isDefault: triggers.isDefault,
      })
      .from(triggers)
      .where(or(isNull(triggers.userId), eq(triggers.userId, request.userId)))
      .orderBy(triggers.isDefault, triggers.name);

    return reply.send({ data: rows });
  });

  /**
   * POST /triggers
   * Create a custom trigger for the user.
   */
  fastify.post("/triggers", async (request, reply) => {
    const input = createTriggerSchema.parse(request.body);

    // Check for duplicate name (case-insensitive) among user's custom triggers
    const [existing] = await db
      .select({ id: triggers.id })
      .from(triggers)
      .where(
        and(
          eq(triggers.userId, request.userId),
          sql`lower(${triggers.name}) = lower(${input.name})`,
        ),
      )
      .limit(1);

    if (existing) {
      throw new ConflictError("A trigger with that name already exists");
    }

    const [created] = await db
      .insert(triggers)
      .values({
        name: input.name,
        icon: input.icon || null,
        isDefault: false,
        userId: request.userId,
      })
      .returning({
        id: triggers.id,
        name: triggers.name,
        icon: triggers.icon,
        isDefault: triggers.isDefault,
      });

    return reply.status(201).send({ data: created });
  });

  /**
   * DELETE /triggers/:id
   * Delete a user's custom trigger. Cannot delete default triggers.
   */
  fastify.delete("/triggers/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    // Find the trigger
    const [trigger] = await db
      .select({ id: triggers.id, userId: triggers.userId, isDefault: triggers.isDefault })
      .from(triggers)
      .where(eq(triggers.id, id))
      .limit(1);

    if (!trigger) {
      throw new NotFoundError("Trigger not found");
    }

    if (trigger.isDefault) {
      throw new ForbiddenError("Cannot delete default triggers");
    }

    if (trigger.userId !== request.userId) {
      throw new ForbiddenError("Cannot delete another user's trigger");
    }

    await db.delete(triggers).where(eq(triggers.id, id));

    return reply.status(204).send();
  });
}
