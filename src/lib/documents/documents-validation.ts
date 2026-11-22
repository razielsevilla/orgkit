import { z } from "zod";

export const DOCUMENT_CATEGORIES = [
  "Finance",
  "Legal",
  "Templates",
  "Contacts",
  "General",
] as const;

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export const isDocumentCategory = (val: unknown): val is DocumentCategory =>
  typeof val === "string" && (DOCUMENT_CATEGORIES as readonly string[]).includes(val);

/**
 * Validates that a string is a safe external HTTP or HTTPS URL.
 * Rejects javascript:, data:, file:, relative paths, and malformed URLs.
 */
export function isValidExternalUrl(urlString: string): boolean {
  if (!urlString || typeof urlString !== "string") return false;
  const trimmed = urlString.trim();
  if (trimmed.length < 8 || trimmed.length > 2000) return false;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }
    // Hostname must be present and contain at least one dot or be a valid domain
    if (!parsed.hostname || parsed.hostname.length < 3) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export const addDocumentLinkSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Title must be at least 2 characters.")
    .max(150, "Title cannot exceed 150 characters."),
  category: z.enum(DOCUMENT_CATEGORIES, {
    errorMap: () => ({ message: "Please select a valid category." }),
  }),
  url: z
    .string()
    .trim()
    .refine(isValidExternalUrl, {
      message: "Please enter a valid web URL starting with http:// or https://.",
    }),
});

export type AddDocumentLinkInput = z.infer<typeof addDocumentLinkSchema>;
