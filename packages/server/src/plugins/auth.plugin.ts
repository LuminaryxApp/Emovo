import { eq } from "drizzle-orm";
import type { FastifyInstance, FastifyRequest } from "fastify";
import fp from "fastify-plugin";

import { db } from "../config/database.js";
import { users } from "../db/schema/index.js";
import { UnauthorizedError } from "../utils/errors.js";

declare module "fastify" {
  interface FastifyRequest {
    userId: string;
    userEmail: string;
    tokenVersion: number;
  }
}

async function authPlugin(fastify: FastifyInstance) {
  fastify.decorateRequest("userId", "");
  fastify.decorateRequest("userEmail", "");
  fastify.decorateRequest("tokenVersion", 0);

  fastify.decorate("authenticate", async function (request: FastifyRequest) {
    try {
      const payload = await request.jwtVerify<{
        sub: string;
        email: string;
        tokenVersion: number;
      }>();

      // Mandatory tokenVersion check
      const [user] = await db
        .select({ tokenVersion: users.tokenVersion })
        .from(users)
        .where(eq(users.id, payload.sub))
        .limit(1);

      if (!user || user.tokenVersion !== payload.tokenVersion) {
        throw new UnauthorizedError("AUTH_TOKEN_INVALID", "Token has been invalidated");
      }

      request.userId = payload.sub;
      request.userEmail = payload.email;
      request.tokenVersion = payload.tokenVersion;
    } catch (err) {
      if (err instanceof UnauthorizedError) throw err;
      throw new UnauthorizedError("AUTH_TOKEN_INVALID", "Invalid or expired token");
    }
  });
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest) => Promise<void>;
  }
}

export default fp(authPlugin, {
  name: "auth",
  dependencies: ["@fastify/jwt"],
});
