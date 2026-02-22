import { eq } from "drizzle-orm";
import type { FastifyInstance, FastifyRequest } from "fastify";
import fp from "fastify-plugin";

import { db } from "../config/database.js";
import { users } from "../db/schema/index.js";
import { ForbiddenError, UnauthorizedError } from "../utils/errors.js";

declare module "fastify" {
  interface FastifyRequest {
    userId: string;
    userEmail: string;
    tokenVersion: number;
    isAdmin: boolean;
    isBanned: boolean;
    isSuspended: boolean;
  }
}

async function authPlugin(fastify: FastifyInstance) {
  fastify.decorateRequest("userId", "");
  fastify.decorateRequest("userEmail", "");
  fastify.decorateRequest("tokenVersion", 0);
  fastify.decorateRequest("isAdmin", false);
  fastify.decorateRequest("isBanned", false);
  fastify.decorateRequest("isSuspended", false);

  fastify.decorate("authenticate", async function (request: FastifyRequest) {
    try {
      const payload = await request.jwtVerify<{
        sub: string;
        email: string;
        tokenVersion: number;
      }>();

      // Mandatory tokenVersion check + fetch moderation fields
      const [user] = await db
        .select({
          tokenVersion: users.tokenVersion,
          isAdmin: users.isAdmin,
          bannedAt: users.bannedAt,
          suspendedUntil: users.suspendedUntil,
        })
        .from(users)
        .where(eq(users.id, payload.sub))
        .limit(1);

      if (!user || user.tokenVersion !== payload.tokenVersion) {
        throw new UnauthorizedError("AUTH_TOKEN_INVALID", "Token has been invalidated");
      }

      request.userId = payload.sub;
      request.userEmail = payload.email;
      request.tokenVersion = payload.tokenVersion;
      request.isAdmin = user.isAdmin;
      request.isBanned = user.bannedAt !== null;
      request.isSuspended = user.suspendedUntil !== null && user.suspendedUntil > new Date();
    } catch (err) {
      if (err instanceof UnauthorizedError) throw err;
      throw new UnauthorizedError("AUTH_TOKEN_INVALID", "Invalid or expired token");
    }
  });

  /**
   * Require the user is not banned or suspended.
   * Attach after `authenticate`.
   */
  fastify.decorate("requireNotBanned", async function (request: FastifyRequest) {
    if (request.isBanned) {
      throw new ForbiddenError("Your account has been suspended");
    }
    if (request.isSuspended) {
      throw new ForbiddenError("Your account is temporarily suspended");
    }
  });

  /**
   * Require the user is an admin.
   * Attach after `authenticate`.
   */
  fastify.decorate("requireAdmin", async function (request: FastifyRequest) {
    if (!request.isAdmin) {
      throw new ForbiddenError("Admin access required");
    }
  });
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest) => Promise<void>;
    requireNotBanned: (request: FastifyRequest) => Promise<void>;
    requireAdmin: (request: FastifyRequest) => Promise<void>;
  }
}

export default fp(authPlugin, {
  name: "auth",
  dependencies: ["@fastify/jwt"],
});
