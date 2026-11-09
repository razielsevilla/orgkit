/**
 * Pure logic for the R4 roster export: which fields exist, how a cell is
 * escaped, how the file is named. No imports, so the node:test checks can
 * load it directly. The route that streams the file lives in
 * src/app/(workspace)/workspace/[id]/members/export/route.ts.
 */

export const EXPORT_STATUSES = ["pending", "active", "inactive"] as const;
export type ExportStatus = (typeof EXPORT_STATUSES)[number];

export const EXPORT_FIELD_KEYS = [
  "full_name",
  "email",
  "status",
  "created_at",
  "consent_at",
  "consent_language",
] as const;
export type ExportFieldKey = (typeof EXPORT_FIELD_KEYS)[number];

export interface ExportField {
  key: ExportFieldKey;
  /** Plain-language label, used for the dialog and as the CSV heading */
  label: string;
  /** Shown beside personal-data fields */
  personal: boolean;
  /** Selected the first time the dialog opens */
  defaultSelected: boolean;
}

/** The single source of truth for the dialog, the route and the column order. */
export const EXPORT_FIELDS: readonly ExportField[] = [
  { key: "full_name", label: "Full name", personal: false, defaultSelected: true },
  { key: "email", label: "Email", personal: true, defaultSelected: true },
  { key: "status", label: "Status", personal: false, defaultSelected: true },
  { key: "created_at", label: "Date joined", personal: false, defaultSelected: false },
  { key: "consent_at", label: "Consent date", personal: true, defaultSelected: false },
  { key: "consent_language", label: "Consent language", personal: true, defaultSelected: false },
];

export const DEFAULT_EXPORT_FIELDS: ExportFieldKey[] = EXPORT_FIELDS.filter(
  (f) => f.defaultSelected
).map((f) => f.key);

export const DEFAULT_EXPORT_STATUSES: ExportStatus[] = ["active"];

export const PERSONAL_DATA_NOTE = "Personal data. Share carefully.";

/** Excel needs this at the start of a UTF-8 file to show Filipino and accented names. */
export const CSV_BOM = "﻿";
export const CSV_NEWLINE = "\r\n";

/** Rows are read from the database in pages of this size */
export const EXPORT_PAGE_SIZE = 1000;

const FORMULA_START = /^[=+\-@\t\r]/;

/**
 * Makes one value safe for a CSV cell: a leading = + - @ (or tab / CR) gets an
 * apostrophe so a spreadsheet shows text instead of running a formula, then
 * anything with a comma, quote or line break is quoted with inner quotes doubled.
 */
export function escapeCsvCell(value: string | number | null | undefined): string {
  let text = value === null || value === undefined ? "" : String(value);
  if (FORMULA_START.test(text)) text = `'${text}`;
  if (/[",\r\n]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function buildCsvRow(cells: readonly (string | number | null | undefined)[]): string {
  return cells.map(escapeCsvCell).join(",") + CSV_NEWLINE;
}

/** Chosen fields, always in the catalogue's order regardless of request order. */
export function orderedFields(fields: readonly ExportFieldKey[]): ExportField[] {
  return EXPORT_FIELDS.filter((f) => fields.includes(f.key));
}

/** The heading row for the chosen fields, in catalogue order. */
export function buildHeaderRow(fields: readonly ExportFieldKey[]): string {
  return buildCsvRow(orderedFields(fields).map((f) => f.label));
}

/** The database columns to select: only the chosen ones. */
export function columnsFor(fields: readonly ExportFieldKey[]): string {
  return orderedFields(fields)
    .map((f) => f.key)
    .join(", ");
}

/** One unambiguous date format for every date cell: 2026-11-02 (UTC). */
export function formatExportDate(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  active: "Active",
  inactive: "Inactive",
};

const LANGUAGE_LABELS: Record<string, string> = { en: "English", fil: "Filipino" };

/** A database row holding only the chosen columns. */
export type ExportRow = Partial<Record<ExportFieldKey, string | null>>;

export function buildDataRow(row: ExportRow, fields: readonly ExportFieldKey[]): string {
  return buildCsvRow(
    orderedFields(fields).map((f) => {
      const value = row[f.key];
      switch (f.key) {
        case "created_at":
        case "consent_at":
          return formatExportDate(value);
        case "status":
          return value ? (STATUS_LABELS[value] ?? value) : "";
        case "consent_language":
          return value ? (LANGUAGE_LABELS[value] ?? value) : "";
        default:
          return value ?? "";
      }
    })
  );
}

/** devcon-laguna-members-2026-11-02.csv: always a valid file name. */
export function exportFileName(orgName: string | null | undefined, now: Date = new Date()): string {
  const slug = (orgName ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  const date = now.toISOString().slice(0, 10);
  return `${slug ? `${slug}-` : ""}members-${date}.csv`;
}

export interface ExportRequest {
  fields: ExportFieldKey[];
  statuses: ExportStatus[];
}

/**
 * Validates an untrusted request body. Anything unknown, or an empty choice,
 * is refused rather than quietly corrected.
 */
export function parseExportRequest(
  input: unknown
): { ok: true; value: ExportRequest } | { ok: false } {
  if (typeof input !== "object" || input === null) return { ok: false };
  const { fields, statuses } = input as Record<string, unknown>;
  if (!Array.isArray(fields) || !Array.isArray(statuses)) return { ok: false };

  const validFields = fields.every((f) => (EXPORT_FIELD_KEYS as readonly unknown[]).includes(f));
  const validStatuses = statuses.every((s) => (EXPORT_STATUSES as readonly unknown[]).includes(s));
  if (!validFields || !validStatuses) return { ok: false };

  const uniqueFields = EXPORT_FIELD_KEYS.filter((k) => (fields as unknown[]).includes(k));
  const uniqueStatuses = EXPORT_STATUSES.filter((s) => (statuses as unknown[]).includes(s));
  if (uniqueFields.length === 0 || uniqueStatuses.length === 0) return { ok: false };

  return { ok: true, value: { fields: uniqueFields, statuses: uniqueStatuses } };
}
