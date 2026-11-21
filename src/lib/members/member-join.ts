export const JOIN_MESSAGES = {
  consentMissing: "Please tick the box to agree before joining.",
  underAge: "This workspace is for members aged 18 or over.",
  inactiveLink: "This link isn't active. Ask your org's officers for a new one.",
  tooMany: "Too many attempts. Please wait a minute and try again.",
  saveFailed: "We couldn't save your details. Please try again.",
  pageUpdated: "This page was updated. Please reload it and try again.",
  nameInvalid: "Please enter your full name (2 to 100 characters).",
  emailInvalid: "Please enter a valid email address.",
} as const;

// Matches valid email format: user@domain.tld with at least 2 letters in the TLD (e.g. .com, .ph, .edu)
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)*\.[a-zA-Z]{2,}$/;

export function cleanName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

export function isValidName(name: string): boolean {
  return name.length >= 2 && name.length <= 100;
}

export function isValidEmail(email: string): boolean {
  return email.length <= 254 && EMAIL_PATTERN.test(email);
}

/**
 * The privacy contact shown in the consent text and the privacy notice, from
 * PRIVACY_CONTACT_EMAIL. Null when it is missing or doesn't look like an email,
 * so callers can refuse to collect member data instead of showing a placeholder.
 */
export function parseContactEmail(raw: string | undefined | null): string | null {
  const email = (raw ?? "").trim();
  return isValidEmail(email) ? email : null;
}

/** Tokens are two UUIDs without dashes. Anything else can't be a real link. */
export function looksLikeToken(token: string): boolean {
  return /^[0-9a-f]{64}$/.test(token);
}
