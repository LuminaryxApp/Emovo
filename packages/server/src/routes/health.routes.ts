import { sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";

import { db } from "../config/database.js";

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get("/health", async (_request, reply) => {
    return reply.send({ status: "ok" });
  });

  fastify.get("/health/ready", async (_request, reply) => {
    try {
      await db.execute(sql`SELECT 1`);
      return reply.send({ status: "ready", db: "connected" });
    } catch {
      return reply.status(503).send({ status: "unavailable", db: "disconnected" });
    }
  });
}
