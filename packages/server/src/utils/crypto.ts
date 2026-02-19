import { createHash, randomBytes } from "node:crypto";

export function generateRandomToken(bytes = 64): string {
  return randomBytes(bytes).toString("hex");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}

export function hashUserAgent(ua: string): string {
  return createHash("sha256").update(ua).digest("hex");
}

/**
 * Parse refresh token format: rt_<id>.<secret>
 * Returns { id, secret } or null if invalid format.
 */
export function parseRefreshToken(token: string): { id: string; secret: string } | null {
  if (!token.startsWith("rt_")) return null;
  const rest = token.slice(3);
  const dotIndex = rest.indexOf(".");
  if (dotIndex === -1) return null;
  const id = rest.slice(0, dotIndex);
  const secret = rest.slice(dotIndex + 1);
  if (!id || !secret) return null;
  return { id, secret };
}

/**
 * Build refresh token string: rt_<id>.<secret>
 */
export function buildRefreshToken(id: string, secret: string): string {
  return `rt_${id}.${secret}`;
}
