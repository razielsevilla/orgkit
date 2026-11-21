/**
 * Pure batch processing and error classification utilities for dues reminders.
 * Pure logic — safe to import in client, server, or standalone unit tests.
 */

/**
 * Splits an array into smaller chunks of given size.
 */
export function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  if (chunkSize <= 0) return [items];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Async delay helper to throttle email batch requests.
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Classifies an error message into a ReminderStatus ('failed' or 'bounced').
 */
export function classifyReminderError(
  errorMessage?: string | null
): "failed" | "bounced" {
  if (!errorMessage) return "failed";
  const lower = errorMessage.toLowerCase();
  if (
    lower.includes("bounce") ||
    lower.includes("does not exist") ||
    lower.includes("invalid email") ||
    lower.includes("recipient rejected") ||
    lower.includes("undeliverable")
  ) {
    return "bounced";
  }
  return "failed";
}

/**
 * Returns a human-friendly error description for member failure cards.
 */
export function formatReminderErrorMessage(rawError?: string | null): string {
  if (!rawError) return "Delivery failed";
  const lower = rawError.toLowerCase();
  if (
    lower.includes("bounce") ||
    lower.includes("does not exist") ||
    lower.includes("undeliverable")
  ) {
    return "Email bounced (address not found)";
  }
  if (lower.includes("rate limit") || lower.includes("429")) {
    return "Sending paused (rate limit reached, retry shortly)";
  }
  if (lower.includes("invalid") && lower.includes("key")) {
    return "Email service configuration error";
  }
  return rawError;
}
