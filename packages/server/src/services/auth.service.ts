import { randomUUID } from "node:crypto";

import argon2 from "argon2";
import { eq, and, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";

import { db, client } from "../config/database.js";
import { env } from "../config/env.js";
import { refreshTokens } from "../db/schema/refresh-tokens.js";
import { users } from "../db/schema/users.js";
import {
  generateRandomToken,
  hashToken,
  hashIp,
  hashUserAgent,
  buildRefreshToken,
  parseRefreshToken,
} from "../utils/crypto.js";
import { UnauthorizedError, AppError, ValidationError } from "../utils/errors.js";

const LOCKOUT_THRESHOLD = 10;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const PROGRESSIVE_DELAYS = [0, 0, 0, 5000, 5000, 30000, 30000, 120000, 120000, 120000]; // ms per attempt index
const EMAIL_RATE_LIMIT_MS = 2 * 60 * 1000; // 2 minutes between emails
const VERIFICATION_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

export class AuthService {
  constructor(private fastify: FastifyInstance) {}

  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });
  }

  async verifyPassword(hash: string, password: string): Promise<boolean> {
    return argon2.verify(hash, password);
  }

  generateAccessToken(userId: string, email: string, tokenVersion: number): string {
    return this.fastify.jwt.sign({ sub: userId, email, tokenVersion }, { jti: randomUUID() });
  }

  async createRefreshToken(
    userId: string,
    familyId: string,
    ip?: string,
    userAgent?: string,
    deviceId?: string,
    deviceName?: string,
  ): Promise<{ token: string; id: string }> {
    const tokenId = randomUUID();
    const secret = generateRandomToken(64);
    const tokenHashValue = hashToken(secret);

    const refreshExpiryDays = parseInt(env.JWT_REFRESH_EXPIRY) || 30;
    const expiresAt = new Date(Date.now() + refreshExpiryDays * 24 * 60 * 60 * 1000);

    await db.insert(refreshTokens).values({
      id: tokenId,
      userId,
      tokenHash: tokenHashValue,
      tokenFamilyId: familyId,
      deviceId: deviceId || null,
      deviceName: deviceName || null,
      ipHash: ip ? hashIp(ip) : null,
      userAgentHash: userAgent ? hashUserAgent(userAgent) : null,
      expiresAt,
      lastUsedAt: new Date(),
    });

    return { token: buildRefreshToken(tokenId, secret), id: tokenId };
  }

  /**
   * Atomic refresh token rotation with SELECT FOR UPDATE.
   * Returns new tokens or throws on reuse/invalid.
   */
  async rotateRefreshToken(
    rawToken: string,
    ip?: string,
    userAgent?: string,
  ): Promise<{ accessToken: string; refreshToken: string; userId: string }> {
    const parsed = parseRefreshToken(rawToken);
    if (!parsed) throw new UnauthorizedError("AUTH_TOKEN_INVALID", "Invalid refresh token format");

    const secretHash = hashToken(parsed.secret);

    // Use raw SQL for the atomic transaction with FOR UPDATE
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await client.begin(async (tx: any) => {
      // Lock the row
      const [existing] = await tx`
        SELECT rt.id, rt.user_id, rt.token_hash, rt.token_family_id, rt.revoked, rt.expires_at,
               rt.device_id, rt.device_name,
               u.email, u.token_version, u.email_verified
        FROM refresh_tokens rt
        JOIN users u ON u.id = rt.user_id
        WHERE rt.id = ${parsed.id} AND rt.token_hash = ${secretHash}
        FOR UPDATE OF rt
      `;

      if (!existing) {
        throw new UnauthorizedError("AUTH_TOKEN_INVALID", "Refresh token not found");
      }

      // Check if revoked — compromise detected, revoke entire family
      if (existing.revoked) {
        await tx`
          UPDATE refresh_tokens SET revoked = true
          WHERE token_family_id = ${existing.token_family_id} AND revoked = false
        `;
        throw new UnauthorizedError("TOKEN_REUSED", "Refresh token reuse detected");
      }

      // Check expiry
      if (new Date(existing.expires_at) < new Date()) {
        throw new UnauthorizedError("AUTH_TOKEN_EXPIRED", "Refresh token expired");
      }

      // Revoke old token
      await tx`
        UPDATE refresh_tokens
        SET revoked = true, last_used_at = now()
        WHERE id = ${existing.id}
      `;

      // Issue new token in the same family
      const newTokenId = randomUUID();
      const newSecret = generateRandomToken(64);
      const newTokenHash = hashToken(newSecret);
      const refreshExpiryDays = parseInt(env.JWT_REFRESH_EXPIRY) || 30;
      const newExpiresAt = new Date(Date.now() + refreshExpiryDays * 24 * 60 * 60 * 1000);

      await tx`
        INSERT INTO refresh_tokens (id, user_id, token_hash, token_family_id, device_id, device_name, ip_hash, user_agent_hash, expires_at, last_used_at)
        VALUES (
          ${newTokenId},
          ${existing.user_id},
          ${newTokenHash},
          ${existing.token_family_id},
          ${existing.device_id},
          ${existing.device_name},
          ${ip ? hashIp(ip) : existing.ip_hash || null},
          ${userAgent ? hashUserAgent(userAgent) : existing.user_agent_hash || null},
          ${newExpiresAt},
          now()
        )
      `;

      const accessToken = this.generateAccessToken(
        existing.user_id,
        existing.email,
        existing.token_version,
      );

      return {
        accessToken,
        refreshToken: buildRefreshToken(newTokenId, newSecret),
        userId: existing.user_id as string,
      };
    });

    return result;
  }

  /**
   * Check brute force protection and apply progressive delays.
   */
  async checkBruteForce(email: string): Promise<void> {
    const [user] = await db
      .select({
        failedLoginAttempts: users.failedLoginAttempts,
        lockedUntil: users.lockedUntil,
      })
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);

    if (!user) return; // Don't reveal if user exists

    // Check full lockout
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      throw new AppError("AUTH_LOCKED", "Account is temporarily locked. Try again later.", 423);
    }

    // Apply progressive delay
    const delayIndex = Math.min(user.failedLoginAttempts, PROGRESSIVE_DELAYS.length - 1);
    const delay = PROGRESSIVE_DELAYS[delayIndex];
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  async recordFailedLogin(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();
    const [user] = await db
      .select({ id: users.id, failedLoginAttempts: users.failedLoginAttempts })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (!user) return;

    const newAttempts = user.failedLoginAttempts + 1;
    const lockedUntil =
      newAttempts >= LOCKOUT_THRESHOLD ? new Date(Date.now() + LOCKOUT_DURATION_MS) : null;

    await db
      .update(users)
      .set({
        failedLoginAttempts: newAttempts,
        lockedUntil,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));
  }

  async resetFailedLogins(userId: string): Promise<void> {
    await db
      .update(users)
      .set({
        failedLoginAttempts: 0,
        lockedUntil: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  /**
   * Check if email sending is rate-limited for verification emails.
   */
  async canSendVerificationEmail(userId: string): Promise<boolean> {
    const [user] = await db
      .select({ emailVerificationSentAt: users.emailVerificationSentAt })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user?.emailVerificationSentAt) return true;
    return Date.now() - new Date(user.emailVerificationSentAt).getTime() > EMAIL_RATE_LIMIT_MS;
  }

  /**
   * Check if password reset email sending is rate-limited.
   */
  async canSendResetEmail(email: string): Promise<boolean> {
    const [user] = await db
      .select({ passwordResetSentAt: users.passwordResetSentAt })
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);

    if (!user?.passwordResetSentAt) return true;
    return Date.now() - new Date(user.passwordResetSentAt).getTime() > EMAIL_RATE_LIMIT_MS;
  }

  async createVerificationToken(userId: string): Promise<string> {
    const token = generateRandomToken(32);
    const tokenHash = hashToken(token);
    const expires = new Date(Date.now() + VERIFICATION_TOKEN_EXPIRY_MS);

    await db
      .update(users)
      .set({
        emailVerificationTokenHash: tokenHash,
        emailVerificationExpires: expires,
        emailVerificationSentAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return token;
  }

  async verifyEmailToken(token: string): Promise<string> {
    const tokenHash = hashToken(token);
    const [user] = await db
      .select({ id: users.id, emailVerificationExpires: users.emailVerificationExpires })
      .from(users)
      .where(and(eq(users.emailVerificationTokenHash, tokenHash), eq(users.emailVerified, false)))
      .limit(1);

    if (!user) throw new ValidationError("Invalid or expired verification token");

    if (user.emailVerificationExpires && new Date(user.emailVerificationExpires) < new Date()) {
      throw new ValidationError("Verification token has expired");
    }

    await db
      .update(users)
      .set({
        emailVerified: true,
        emailVerificationTokenHash: null,
        emailVerificationExpires: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    return user.id;
  }

  async createPasswordResetToken(email: string): Promise<{ token: string; userId: string } | null> {
    const normalizedEmail = email.toLowerCase().trim();
    const [user] = await db
      .select({ id: users.id, emailVerified: users.emailVerified })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (!user || !user.emailVerified) return null;

    const token = generateRandomToken(32);
    const tokenHash = hashToken(token);
    const expires = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);

    await db
      .update(users)
      .set({
        passwordResetTokenHash: tokenHash,
        passwordResetExpires: expires,
        passwordResetSentAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    return { token, userId: user.id };
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = hashToken(token);
    const [user] = await db
      .select({ id: users.id, passwordResetExpires: users.passwordResetExpires })
      .from(users)
      .where(eq(users.passwordResetTokenHash, tokenHash))
      .limit(1);

    if (!user) throw new ValidationError("Invalid or expired reset token");

    if (user.passwordResetExpires && new Date(user.passwordResetExpires) < new Date()) {
      throw new ValidationError("Reset token has expired");
    }

    const passwordHash = await this.hashPassword(newPassword);

    await db
      .update(users)
      .set({
        passwordHash,
        passwordResetTokenHash: null,
        passwordResetExpires: null,
        tokenVersion: sql`${users.tokenVersion} + 1`,
        failedLoginAttempts: 0,
        lockedUntil: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    // Revoke all refresh tokens
    await db
      .update(refreshTokens)
      .set({ revoked: true })
      .where(and(eq(refreshTokens.userId, user.id), eq(refreshTokens.revoked, false)));
  }

  async revokeAllTokens(userId: string): Promise<void> {
    // Bump token version to invalidate all JWTs
    await db
      .update(users)
      .set({
        tokenVersion: sql`${users.tokenVersion} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    // Revoke all refresh tokens
    await db
      .update(refreshTokens)
      .set({ revoked: true })
      .where(and(eq(refreshTokens.userId, userId), eq(refreshTokens.revoked, false)));
  }

  async revokeSession(userId: string, sessionId: string): Promise<boolean> {
    const result = await db
      .update(refreshTokens)
      .set({ revoked: true })
      .where(
        and(
          eq(refreshTokens.id, sessionId),
          eq(refreshTokens.userId, userId),
          eq(refreshTokens.revoked, false),
        ),
      )
      .returning({ id: refreshTokens.id });

    return result.length > 0;
  }

  async getActiveSessions(userId: string): Promise<
    Array<{
      id: string;
      deviceName: string | null;
      lastUsedAt: Date | null;
      createdAt: Date;
    }>
  > {
    return db
      .select({
        id: refreshTokens.id,
        deviceName: refreshTokens.deviceName,
        lastUsedAt: refreshTokens.lastUsedAt,
        createdAt: refreshTokens.createdAt,
      })
      .from(refreshTokens)
      .where(and(eq(refreshTokens.userId, userId), eq(refreshTokens.revoked, false)))
      .orderBy(refreshTokens.lastUsedAt);
  }

  async revokeRefreshToken(tokenString: string): Promise<void> {
    const parsed = parseRefreshToken(tokenString);
    if (!parsed) return;

    const secretHash = hashToken(parsed.secret);
    await db
      .update(refreshTokens)
      .set({ revoked: true })
      .where(and(eq(refreshTokens.id, parsed.id), eq(refreshTokens.tokenHash, secretHash)));
  }
}
