import { randomUUID } from "node:crypto";

import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshTokenSchema,
  logoutSchema,
} from "@emovo/shared";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";

import { db } from "../config/database.js";
import { users } from "../db/schema/users.js";
import { AuthService } from "../services/auth.service.js";
import { sendVerificationEmail, sendPasswordResetEmail } from "../services/email.service.js";
import { UnauthorizedError } from "../utils/errors.js";

export async function authRoutes(fastify: FastifyInstance) {
  const authService = new AuthService(fastify);

  // Stricter rate limits for auth endpoints
  const authRateLimit = {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: "1 minute",
      },
    },
  };

  /**
   * POST /auth/register
   * Anti-enumeration: always returns same generic response.
   */
  fastify.post("/auth/register", authRateLimit, async (request, reply) => {
    const body = registerSchema.parse(request.body);

    // Check if user already exists
    const [existingUser] = await db
      .select({ id: users.id, emailVerified: users.emailVerified })
      .from(users)
      .where(eq(users.email, body.email))
      .limit(1);

    if (existingUser) {
      if (!existingUser.emailVerified) {
        const canSend = await authService.canSendVerificationEmail(existingUser.id);
        if (canSend) {
          const token = await authService.createVerificationToken(existingUser.id);
          await sendVerificationEmail(body.email, token);
        }
      }
      return reply.send({
        data: { message: "If that email is valid, a verification email has been sent." },
      });
    }

    const passwordHash = await authService.hashPassword(body.password);
    const [newUser] = await db
      .insert(users)
      .values({
        email: body.email,
        passwordHash,
        displayName: body.displayName,
      })
      .returning({ id: users.id });

    const token = await authService.createVerificationToken(newUser.id);
    await sendVerificationEmail(body.email, token);

    return reply.status(201).send({
      data: { message: "If that email is valid, a verification email has been sent." },
    });
  });

  /**
   * POST /auth/verify-email
   */
  fastify.post("/auth/verify-email", async (request, reply) => {
    const { token } = verifyEmailSchema.parse(request.body);
    const userId = await authService.verifyEmailToken(token);

    // Fetch the user
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        emailVerified: users.emailVerified,
        displayName: users.displayName,
        timezone: users.timezone,
        notificationsEnabled: users.notificationsEnabled,
        tokenVersion: users.tokenVersion,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const familyId = randomUUID();
    const ip = request.ip;
    const ua = request.headers["user-agent"] || "";

    const accessToken = authService.generateAccessToken(user.id, user.email, user.tokenVersion);
    const { token: refreshToken } = await authService.createRefreshToken(user.id, familyId, ip, ua);

    return reply.send({
      data: {
        user: {
          id: user.id,
          email: user.email,
          emailVerified: user.emailVerified,
          displayName: user.displayName,
          timezone: user.timezone,
          notificationsEnabled: user.notificationsEnabled,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        },
        accessToken,
        refreshToken,
      },
    });
  });

  /**
   * POST /auth/resend-verification
   * Anti-enumeration: always returns generic 200.
   */
  fastify.post("/auth/resend-verification", authRateLimit, async (request, reply) => {
    const { email } = resendVerificationSchema.parse(request.body);

    const [user] = await db
      .select({ id: users.id, emailVerified: users.emailVerified })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (user && !user.emailVerified) {
      const canSend = await authService.canSendVerificationEmail(user.id);
      if (canSend) {
        const verifyToken = await authService.createVerificationToken(user.id);
        await sendVerificationEmail(email, verifyToken);
      }
    }

    return reply.send({
      data: {
        message: "If that email is registered and unverified, a verification email has been sent.",
      },
    });
  });

  /**
   * POST /auth/login
   * Progressive lockout: delays escalate per failure, full lock after threshold.
   */
  fastify.post("/auth/login", authRateLimit, async (request, reply) => {
    const body = loginSchema.parse(request.body);

    await authService.checkBruteForce(body.email);

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        emailVerified: users.emailVerified,
        passwordHash: users.passwordHash,
        displayName: users.displayName,
        timezone: users.timezone,
        notificationsEnabled: users.notificationsEnabled,
        tokenVersion: users.tokenVersion,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.email, body.email))
      .limit(1);

    if (!user) {
      // Simulate delay to prevent timing attacks
      await authService.hashPassword("dummy-password-timing-attack-prevention");
      throw new UnauthorizedError("AUTH_INVALID", "Invalid email or password");
    }

    if (!user.emailVerified) {
      throw new UnauthorizedError("AUTH_EMAIL_UNVERIFIED", "Please verify your email first");
    }

    const validPassword = await authService.verifyPassword(user.passwordHash, body.password);
    if (!validPassword) {
      await authService.recordFailedLogin(body.email);
      throw new UnauthorizedError("AUTH_INVALID", "Invalid email or password");
    }

    // Success — reset failed attempts
    await authService.resetFailedLogins(user.id);

    const familyId = randomUUID();
    const ip = request.ip;
    const ua = request.headers["user-agent"] || "";
    const deviceName = request.headers["x-device-name"]?.toString() || null;
    const deviceId = request.headers["x-device-id"]?.toString() || null;

    const accessToken = authService.generateAccessToken(user.id, user.email, user.tokenVersion);
    const { token: refreshToken } = await authService.createRefreshToken(
      user.id,
      familyId,
      ip,
      ua,
      deviceId || undefined,
      deviceName || undefined,
    );

    return reply.send({
      data: {
        user: {
          id: user.id,
          email: user.email,
          emailVerified: user.emailVerified,
          displayName: user.displayName,
          timezone: user.timezone,
          notificationsEnabled: user.notificationsEnabled,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        },
        accessToken,
        refreshToken,
      },
    });
  });

  /**
   * POST /auth/refresh
   * Atomic rotation with SELECT FOR UPDATE.
   */
  fastify.post("/auth/refresh", async (request, reply) => {
    const { refreshToken } = refreshTokenSchema.parse(request.body);
    const ip = request.ip;
    const ua = request.headers["user-agent"] || "";

    const result = await authService.rotateRefreshToken(refreshToken, ip, ua);

    return reply.send({
      data: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    });
  });

  /**
   * POST /auth/forgot-password
   * Anti-enumeration: always returns 200.
   */
  fastify.post("/auth/forgot-password", authRateLimit, async (request, reply) => {
    const { email } = forgotPasswordSchema.parse(request.body);

    const canSend = await authService.canSendResetEmail(email);
    if (canSend) {
      const result = await authService.createPasswordResetToken(email);
      if (result) {
        await sendPasswordResetEmail(email, result.token);
      }
    }

    return reply.send({
      data: { message: "If that email is registered, a password reset email has been sent." },
    });
  });

  /**
   * POST /auth/reset-password
   */
  fastify.post("/auth/reset-password", async (request, reply) => {
    const { token, newPassword } = resetPasswordSchema.parse(request.body);
    await authService.resetPassword(token, newPassword);

    return reply.send({ data: { success: true } });
  });

  /**
   * POST /auth/logout
   */
  fastify.post("/auth/logout", async (request, reply) => {
    const { refreshToken } = logoutSchema.parse(request.body);
    await authService.revokeRefreshToken(refreshToken);

    return reply.send({ data: { success: true } });
  });

  /**
   * POST /auth/logout-all (authenticated)
   * Bumps token_version + revokes all refresh tokens.
   */
  fastify.post(
    "/auth/logout-all",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      await authService.revokeAllTokens(request.userId);
      return reply.send({ data: { success: true } });
    },
  );
}
