/**
 * Email (Resend) environment configuration.
 * Checked here to provide clean fallbacks in development and explicit errors in production.
 */

export function getResendApiKey(): string | null {
  return process.env.RESEND_API_KEY?.trim() || null;
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export function getResendFromEmail(): string {
  return (
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "OrgKit Reminders <onboarding@resend.dev>"
  );
}

export function requireResendApiKey(): string {
  const key = getResendApiKey();
  if (!key) {
    throw new Error(
      "RESEND_API_KEY is not configured. Email reminders cannot be sent."
    );
  }
  return key;
}
