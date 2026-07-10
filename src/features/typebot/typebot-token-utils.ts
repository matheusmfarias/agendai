/**
 * Pure crypto functions for Typebot token generation and hashing.
 * No database dependencies — safe to import in test files.
 */

import crypto from "node:crypto";

const TOKEN_PREFIX = "agz_tb_";
const SECRET_BYTES = 32;

/** Generate a new Typebot token with its hash and prefix. */
export function generateTypebotToken(): { token: string; hash: string; prefix: string } {
  const secret = crypto.randomBytes(SECRET_BYTES).toString("base64url");
  const token = `${TOKEN_PREFIX}${secret}`;
  const hash = hashToken(token);
  const prefix = token.slice(0, 16);
  return { token, hash, prefix };
}

/** Hash a Typebot token with SHA-256 (hex output). */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
