import { Resend } from "resend";
import { getResendApiKey, requireResendApiKey } from "./env";

let cachedClient: Resend | null = null;

/**
 * Returns a cached Resend client instance initialized with the configured RESEND_API_KEY.
 * Throws a descriptive error if RESEND_API_KEY is not configured.
 */
export function getResendClient(): Resend {
  const apiKey = requireResendApiKey();
  if (!cachedClient) {
    cachedClient = new Resend(apiKey);
  }
  return cachedClient;
}

/**
 * Returns a new or cached Resend client instance if configured, or null if unconfigured.
 */
export function getOptionalResendClient(): Resend | null {
  const apiKey = getResendApiKey();
  if (!apiKey) {
    return null;
  }
  if (!cachedClient) {
    cachedClient = new Resend(apiKey);
  }
  return cachedClient;
}

/**
 * Resets the cached Resend client instance (useful for testing or env changes).
 */
export function resetResendClientCache(): void {
  cachedClient = null;
}
