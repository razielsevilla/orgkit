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

/** 15 MB maximum file size */
export const MAX_DOCUMENT_FILE_SIZE = 15 * 1024 * 1024;

export const ALLOWED_DOCUMENT_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".csv",
  ".txt",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
] as const;

export const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/csv",
  "text/plain",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

/**
 * Checks whether a given filename and optional mime type are permitted for upload.
 */
export function isAllowedDocumentFileType(fileName: string, mimeType?: string): boolean {
  if (!fileName || typeof fileName !== "string") return false;

  const lowerName = fileName.toLowerCase();
  const hasAllowedExt = ALLOWED_DOCUMENT_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
  if (!hasAllowedExt) return false;

  if (mimeType && mimeType !== "application/octet-stream") {
    return ALLOWED_DOCUMENT_MIME_TYPES.has(mimeType.toLowerCase());
  }

  return true;
}

export const DOCUMENTS_ERROR_MESSAGES = {
  invalid_title: "Title must be between 2 and 150 characters.",
  invalid_category: "Please select a valid category.",
  invalid_url: "Please enter a valid web URL starting with http:// or https://.",
  file_required: "Please select a file to upload.",
  file_too_large: "File size exceeds the 15 MB limit.",
  disallowed_file_type:
    "This file type is not allowed. Supported formats: PDF, Word, Excel, PowerPoint, CSV, TXT, and images.",
  not_authenticated: "You must be signed in to perform this action.",
  access_revoked: "You no longer have access to this organization.",
  not_found: "The requested document was not found.",
  storage_error: "Failed to upload file to storage. Please try again.",
  failed: "An unexpected error occurred. Please try again.",
} as const;

export type DocumentsActionError = keyof typeof DOCUMENTS_ERROR_MESSAGES;

export const addDocumentFileMetadataSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, DOCUMENTS_ERROR_MESSAGES.invalid_title)
    .max(150, DOCUMENTS_ERROR_MESSAGES.invalid_title),
  category: z.enum(DOCUMENT_CATEGORIES, {
    errorMap: () => ({ message: DOCUMENTS_ERROR_MESSAGES.invalid_category }),
  }),
});

export type AddDocumentFileMetadata = z.infer<typeof addDocumentFileMetadataSchema>;

