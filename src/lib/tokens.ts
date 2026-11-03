import crypto from "crypto";

/**
 * Generates a secure single-use invite token consisting of 32 cryptographically
 * strong random bytes, encoded as a URL-safe base64 (base64url) string.
 */
export function generateInviteToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

/**
 * Computes the SHA-256 hex digest of a token.
 * Tokens are never stored raw in the database; only this hash is persisted and indexed.
 */
export function hashInviteToken(token: string): string {
  return crypto.createHash("sha256").update(token.trim()).digest("hex");
}

/**
 * Checks that a string has the shape of a token from generateInviteToken():
 * 32 bytes in base64url is exactly 43 URL-safe characters. Used before a token
 * from a URL or cookie is trusted for lookups or redirects.
 */
export function isValidInviteToken(token: unknown): token is string {
  return typeof token === "string" && /^[A-Za-z0-9_-]{43}$/.test(token);
}

/**
 * Normalizes an email address according to OrgKit decisions:
 * Trim and lowercase for comparison.
 * Note: Never strip dots or plus signs (e.g. name+tag@school.edu is preserved).
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Simple email validation regex checking standard structure.
 */
const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export function isValidEmail(email: string): boolean {
  if (!email || email.length > 254) return false;
  return EMAIL_REGEX.test(email.trim());
}

