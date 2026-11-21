const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Whether a value from a URL or a form has the shape of a UUID. Check this
 * before sending an ID to the database, which would otherwise answer a
 * malformed one with an error instead of a clean "not found".
 */
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}
