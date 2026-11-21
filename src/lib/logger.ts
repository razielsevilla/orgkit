/**
 * Structured logging: one JSON line per call, with sensitive fields removed.
 *
 *   logger.error("dues.reminder_log_failed", "Could not write the reminder log", {
 *     periodId,
 *     error,
 *   });
 *
 * - `event` is a short, stable name to search for (`area.what_happened`).
 * - `message` is optional, static text. Never put personal data in it: only the
 *   context object is cleaned. (The message may be left out: `error(event, context)`.)
 * - `context` holds IDs, statuses and codes. Keys whose names suggest personal data
 *   or secrets are replaced with "[redacted]", at any depth, whatever the value.
 *   Long terms (email, token, ...) match anywhere in the key. Short terms (ip, pin,
 *   key, name, body, phone) match only as a whole word of the key, so `clientIp` and
 *   `x-api-key` are redacted but `skippedCount` and `keyword` are not.
 *
 * Errors anywhere in the context become `{ name, message, stack }`, with the stack
 * only outside production. Database errors keep just `code`, `message`, `hint` and,
 * outside production, `details`; the rest of the object is never logged. Email
 * addresses inside any string (Postgres puts the offending row in `details`) are
 * masked too.
 *
 * Safe to import anywhere: nothing runs at import time, `process.env` is read
 * only when a line is written, and logging never throws.
 */

export type LogLevel = "error" | "warn" | "info";
export type LogContext = Record<string, unknown>;

export const REDACTED = "[redacted]";
const CIRCULAR = "[circular]";
const TRUNCATED = "[truncated]";

/** A key containing any of these anywhere (ignoring case) has its value replaced. */
const SENSITIVE_KEY_SUBSTRINGS = [
  "email",
  "token",
  "secret",
  "password",
  "authorization",
  "cookie",
  "screenshot",
] as const;

/**
 * Short terms that would match innocent words (`skipped`, `description`, `keyword`)
 * if searched for as substrings. A key is redacted only when one of its words, or
 * the plural of one, is exactly one of these.
 */
const SENSITIVE_KEY_WORDS = new Set(["ip", "pin", "key", "name", "body", "phone"]);

const MAX_DEPTH = 6;
const MAX_STRING_LENGTH = 2000;
const MAX_ARRAY_ITEMS = 50;

const EMAIL_PATTERN = /[^\s@"'<>()[\],;:]+@[^\s@"'<>()[\],;:]+\.[a-zA-Z]{2,}/g;

/**
 * The words of a key, lower-cased: split at camelCase and acronym boundaries
 * (`clientIP` -> client, ip), at digits, and at any non-letter-or-digit
 * (`access_token`, `x-api-key`).
 */
function keyWords(key: string): string[] {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/([a-zA-Z])(\d)/g, "$1 $2")
    .replace(/(\d)([a-zA-Z])/g, "$1 $2")
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((word) => word.toLowerCase());
}

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  if (SENSITIVE_KEY_SUBSTRINGS.some((part) => lower.includes(part))) return true;
  return keyWords(key).some(
    (word) =>
      SENSITIVE_KEY_WORDS.has(word) ||
      (word.endsWith("s") && SENSITIVE_KEY_WORDS.has(word.slice(0, -1)))
  );
}

function cleanString(value: string): string {
  const masked = value.replace(EMAIL_PATTERN, REDACTED);
  return masked.length > MAX_STRING_LENGTH ? `${masked.slice(0, MAX_STRING_LENGTH)}…` : masked;
}

/** Reads a property without letting a throwing getter break the log call. */
function read(source: object, key: string): unknown {
  try {
    return (source as Record<string, unknown>)[key];
  } catch {
    return "[unreadable]";
  }
}

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/** Anything shaped like a Supabase / PostgREST error, which may or may not be an Error. */
function looksLikeDatabaseError(value: object): boolean {
  return (
    typeof read(value, "message") === "string" &&
    (read(value, "code") !== undefined ||
      read(value, "details") !== undefined ||
      read(value, "hint") !== undefined)
  );
}

function serializeError(error: object, seen: WeakSet<object>, depth: number): LogContext {
  const out: LogContext = {};
  if (error instanceof Error) out.name = cleanString(String(read(error, "name")));
  out.message = cleanString(String(read(error, "message") ?? ""));
  // Only these three extras, never the rest of the object (it can hold request data).
  // `details` is left out in production: Postgres fills it with the offending row's
  // values (`Key (email_key)=(...) already exists`), and masking emails does not
  // cover every kind of value.
  for (const field of ["code", "details", "hint"] as const) {
    if (field === "details" && isProduction()) continue;
    const value = read(error, field);
    if (value !== undefined && value !== null) out[field] = sanitize(value, seen, depth + 1);
  }
  if (error instanceof Error && !isProduction()) {
    const stack = read(error, "stack");
    if (typeof stack === "string") out.stack = cleanString(stack);
  }
  return out;
}

function sanitize(value: unknown, seen: WeakSet<object>, depth: number): unknown {
  if (value === null || value === undefined) return value;

  switch (typeof value) {
    case "string":
      return cleanString(value);
    case "number":
      return Number.isFinite(value) ? value : String(value);
    case "boolean":
      return value;
    case "bigint":
      return value.toString();
    case "function":
      return "[function]";
    case "symbol":
      return value.toString();
  }

  const object = value as object;
  if (seen.has(object)) return CIRCULAR;
  if (depth > MAX_DEPTH) return TRUNCATED;
  if (object instanceof Date) {
    return Number.isNaN(object.getTime()) ? "[invalid date]" : object.toISOString();
  }
  if (ArrayBuffer.isView(object) || object instanceof ArrayBuffer) return "[binary]";

  // `seen` holds the objects on the current path only, so a shared (non-circular)
  // object that appears twice is logged both times
  seen.add(object);
  try {
    if (object instanceof Error || looksLikeDatabaseError(object)) {
      return serializeError(object, seen, depth);
    }
    if (Array.isArray(object)) {
      const items = object.slice(0, MAX_ARRAY_ITEMS).map((item) => sanitize(item, seen, depth + 1));
      if (object.length > MAX_ARRAY_ITEMS) items.push(`[${object.length - MAX_ARRAY_ITEMS} more]`);
      return items;
    }
    if (object instanceof Map || object instanceof Set) return `[${object.constructor.name}]`;

    const out: LogContext = {};
    for (const key of Object.keys(object)) {
      out[key] = isSensitiveKey(key)
        ? REDACTED
        : sanitize(read(object, key), seen, depth + 1);
    }
    return out;
  } finally {
    seen.delete(object);
  }
}

function write(
  level: LogLevel,
  event: string,
  messageOrContext?: string | LogContext,
  maybeContext?: LogContext
): void {
  let line: string;
  try {
    const message = typeof messageOrContext === "string" ? messageOrContext : undefined;
    const context = typeof messageOrContext === "string" ? maybeContext : messageOrContext;

    const entry: LogContext = {
      timestamp: new Date().toISOString(),
      level,
      event: cleanString(String(event)),
    };
    if (message !== undefined) entry.message = cleanString(message);
    if (context !== undefined && context !== null) {
      entry.context = sanitize(context, new WeakSet(), 0);
    }
    line = JSON.stringify(entry);
  } catch {
    // Serialization itself failed: say so, without any of the caller's data
    try {
      line = JSON.stringify({
        timestamp: new Date().toISOString(),
        level,
        event: "logger.serialization_failed",
        message: "A log entry could not be serialized and was dropped.",
      });
    } catch {
      return;
    }
  }

  try {
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.info(line);
  } catch {
    // Logging must never break the request
  }
}

function error(event: string, message?: string, context?: LogContext): void;
function error(event: string, context?: LogContext): void;
function error(event: string, a?: string | LogContext, b?: LogContext): void {
  write("error", event, a, b);
}

function warn(event: string, message?: string, context?: LogContext): void;
function warn(event: string, context?: LogContext): void;
function warn(event: string, a?: string | LogContext, b?: LogContext): void {
  write("warn", event, a, b);
}

function info(event: string, message?: string, context?: LogContext): void;
function info(event: string, context?: LogContext): void;
function info(event: string, a?: string | LogContext, b?: LogContext): void {
  write("info", event, a, b);
}

export const logger = { error, warn, info };
