import { createCipheriv, createDecipheriv, randomBytes, hkdfSync } from "node:crypto";

import { env } from "../config/env.js";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

/**
 * Derive a per-user encryption key via HKDF from master key + user ID + key version.
 */
function deriveKey(userId: string, keyVersion: number): Buffer {
  const masterKey = Buffer.from(env.ENCRYPTION_MASTER_KEY, "hex");
  const info = `emovo:note:${userId}:v${keyVersion}`;
  return Buffer.from(hkdfSync("sha256", masterKey, "", info, 32));
}

/**
 * Build AAD (Additional Authenticated Data) for AES-256-GCM.
 * AAD = userId || entryId || keyVersion
 * Prevents cross-user or cross-row ciphertext swapping.
 */
function buildAAD(userId: string, entryId: string, keyVersion: number): Buffer {
  return Buffer.from(`${userId}||${entryId}||${keyVersion}`);
}

/**
 * Encrypt a plaintext note.
 * Returns: iv (12B) || authTag (16B) || ciphertext
 */
export function encryptNote(
  plaintext: string,
  userId: string,
  entryId: string,
  keyVersion: number,
): Buffer {
  const key = deriveKey(userId, keyVersion);
  const iv = randomBytes(IV_LENGTH);
  const aad = buildAAD(userId, entryId, keyVersion);

  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  cipher.setAAD(aad);

  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  // iv || tag || ciphertext
  return Buffer.concat([iv, tag, encrypted]);
}

/**
 * Decrypt an encrypted note blob.
 * Input: iv (12B) || authTag (16B) || ciphertext
 */
export function decryptNote(
  blob: Buffer,
  userId: string,
  entryId: string,
  keyVersion: number,
): string {
  if (blob.length < IV_LENGTH + TAG_LENGTH) {
    throw new Error("Encrypted note blob too short");
  }

  const key = deriveKey(userId, keyVersion);
  const iv = blob.subarray(0, IV_LENGTH);
  const tag = blob.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = blob.subarray(IV_LENGTH + TAG_LENGTH);
  const aad = buildAAD(userId, entryId, keyVersion);

  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(tag);
  decipher.setAAD(aad);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString("utf8");
}
