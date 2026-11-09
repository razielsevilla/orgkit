import { isValidEmail } from "@/src/lib/members/member-join";

/**
 * Reading an org's member list (CSV) for R3. Pure functions, no I/O: the Server
 * Action in member-invites-actions.ts feeds them the uploaded bytes, so the
 * limits are enforced on the server. The database function checks them again.
 */

export const MAX_CSV_BYTES = 1024 * 1024; // 1 MB
export const MAX_IMPORT_ROWS = 1000;
/** Invitations last this many days (the database sets the same 60) */
export const INVITE_VALID_DAYS = 60;

export type CsvErrorCode =
  | "too_large"
  | "too_many_rows"
  | "not_csv"
  | "empty"
  | "no_rows"
  | "no_emails";

export const CSV_ERROR_MESSAGES: Record<CsvErrorCode, string> = {
  too_large: "That file is over 1 MB. Split it into smaller files and upload them one at a time.",
  too_many_rows:
    "That file has more than 1,000 rows. Split it into smaller files and upload them one at a time.",
  not_csv: "We couldn't read that file. Save it as a CSV (UTF-8) and try again.",
  empty: "That file is empty. Choose a CSV that has your member list in it.",
  no_rows: "We couldn't find any rows in that file. Check that it has your member list.",
  no_emails: "We couldn't find any email addresses in that file.",
};

/** One non-empty line of the file. `row` is its line number in the file (1 = first line). */
export interface CsvRecord {
  row: number;
  cells: string[];
}

export type CsvParseResult =
  | { ok: true; records: CsvRecord[] }
  | { ok: false; error: CsvErrorCode };

export interface ParsedRoster {
  /** Every non-empty line, headings included */
  records: CsvRecord[];
  /** Our best guess that the first line is column headings */
  hasHeader: boolean;
  /** Our best guesses for the two columns, or null to make the admin choose */
  emailColumn: number | null;
  nameColumn: number | null;
}

export type RosterResult =
  | { ok: true; roster: ParsedRoster }
  | { ok: false; error: CsvErrorCode };

/** What the admin sees as a column name when the file has no headings */
export function columnLabel(index: number): string {
  return `Column ${index + 1}`;
}

/** A cell is never kept longer than this: nothing legitimate is, and it bounds what we send back */
const MAX_CELL_CHARS = 400;

function detectDelimiter(text: string): string {
  // Count candidates on the first line, outside quotes
  let inQuotes = false;
  const counts: Record<string, number> = { ",": 0, ";": 0, "\t": 0 };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes && (ch === "\n" || ch === "\r")) break;
    else if (!inQuotes && ch in counts) counts[ch]++;
  }
  let best = ",";
  for (const candidate of [";", "\t"]) {
    if (counts[candidate] > counts[best]) best = candidate;
  }
  return best;
}

/**
 * Reads CSV text (RFC 4180: quoted cells, doubled quotes, line breaks inside
 * quotes, CRLF or LF) into non-empty records. Returns null when a quote is
 * never closed, which is how a binary or truncated file usually looks.
 */
function splitCsv(text: string): CsvRecord[] | null {
  const delimiter = detectDelimiter(text);
  const records: CsvRecord[] = [];
  let cells: string[] = [];
  let cell = "";
  let inQuotes = false;
  let quotedCell = false;
  let line = 1;
  let recordLine = 1;

  const endCell = () => {
    cells.push(cell.length > MAX_CELL_CHARS ? cell.slice(0, MAX_CELL_CHARS) : cell);
    cell = "";
    quotedCell = false;
  };
  const endRecord = () => {
    endCell();
    if (cells.some((c) => c.trim() !== "")) records.push({ row: recordLine, cells });
    cells = [];
    recordLine = line + 1;
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        if (ch === "\n") line++;
        cell += ch;
      }
      continue;
    }

    if (ch === '"' && cell === "" && !quotedCell) {
      inQuotes = true;
      quotedCell = true;
    } else if (ch === delimiter) {
      endCell();
    } else if (ch === "\r" || ch === "\n") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      endRecord();
      line++;
      recordLine = line;
    } else {
      cell += ch;
    }
  }

  if (inQuotes) return null;
  if (cell !== "" || cells.length > 0) {
    endRecord();
  }
  return records;
}

/** Decodes the uploaded bytes (UTF-8, with or without a BOM) and splits them into records. */
export function parseCsvBytes(bytes: Uint8Array): CsvParseResult {
  if (bytes.byteLength > MAX_CSV_BYTES) return { ok: false, error: "too_large" };
  if (bytes.byteLength === 0) return { ok: false, error: "empty" };

  let text: string;
  try {
    // fatal: a file that is not valid UTF-8 is refused instead of saving garbled names.
    // TextDecoder drops a leading byte order mark by default.
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return { ok: false, error: "not_csv" };
  }
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  // A NUL byte means a binary file (a spreadsheet, an image) renamed to .csv
  if (text.includes("\u0000")) return { ok: false, error: "not_csv" };
  if (text.trim() === "") return { ok: false, error: "empty" };

  const records = splitCsv(text);
  if (!records) return { ok: false, error: "not_csv" };
  if (records.length === 0) return { ok: false, error: "no_rows" };

  // A heading line plus 1,000 people is fine, so allow one extra line here;
  // exceedsRowLimit decides once we know whether the first line is headings.
  if (records.length > MAX_IMPORT_ROWS + 1) return { ok: false, error: "too_many_rows" };

  return { ok: true, records };
}

/** Whether the lines that would be imported are over the limit */
export function exceedsRowLimit(totalRecords: number, hasHeader: boolean): boolean {
  return totalRecords - (hasHeader ? 1 : 0) > MAX_IMPORT_ROWS;
}

const looksLikeEmail = (cell: string) => isValidEmail(cell.trim());

/** A first line with no email address in it is column headings. */
export function looksLikeHeader(cells: string[]): boolean {
  return !cells.some(looksLikeEmail);
}

const EMAIL_HEADING = /e[\s_.-]*mail/i;
const NAME_HEADING = /name|pangalan/i;

/** Picks the email column from the headings, or from where the addresses actually are. */
export function guessEmailColumn(records: CsvRecord[], hasHeader: boolean): number | null {
  const width = Math.max(...records.map((r) => r.cells.length));
  if (hasHeader) {
    const idx = records[0].cells.findIndex((c) => EMAIL_HEADING.test(c));
    if (idx >= 0) return idx;
  }
  const sample = records.slice(hasHeader ? 1 : 0, (hasHeader ? 1 : 0) + 50);
  let best = -1;
  let bestCount = 0;
  for (let col = 0; col < width; col++) {
    const count = sample.filter((r) => looksLikeEmail(r.cells[col] ?? "")).length;
    if (count > bestCount) {
      best = col;
      bestCount = count;
    }
  }
  return best >= 0 ? best : null;
}

export function guessNameColumn(
  records: CsvRecord[],
  hasHeader: boolean,
  emailColumn: number | null
): number | null {
  if (!hasHeader) return null;
  const headings = records[0].cells;
  const named = headings.findIndex((c, i) => i !== emailColumn && NAME_HEADING.test(c) && !EMAIL_HEADING.test(c));
  if (named >= 0) {
    // Prefer a "full name" style column over "first name"
    const full = headings.findIndex((c, i) => i !== emailColumn && /full|buong/i.test(c) && NAME_HEADING.test(c));
    return full >= 0 ? full : named;
  }
  return null;
}

/** Reads the upload end to end: decode, split, and make the first guesses for the mapping step. */
export function readRoster(bytes: Uint8Array): RosterResult {
  const parsed = parseCsvBytes(bytes);
  if (!parsed.ok) return parsed;

  const { records } = parsed;
  if (!records.some((r) => r.cells.some(looksLikeEmail))) {
    return { ok: false, error: "no_emails" };
  }

  const hasHeader = looksLikeHeader(records[0].cells);
  if (exceedsRowLimit(records.length, hasHeader)) return { ok: false, error: "too_many_rows" };
  if (records.length - (hasHeader ? 1 : 0) < 1) return { ok: false, error: "no_rows" };

  const emailColumn = guessEmailColumn(records, hasHeader);
  const nameColumn = guessNameColumn(records, hasHeader, emailColumn);
  return { ok: true, roster: { records, hasHeader, emailColumn, nameColumn } };
}

/** What the browser sends the server to preview or import: only the two chosen columns. */
export interface InviteRow {
  row: number;
  email: string;
  name: string;
}

/** Applies the admin's choices: which line is headings, which column is the email and the name. */
export function buildInviteRows(
  records: CsvRecord[],
  hasHeader: boolean,
  emailColumn: number,
  nameColumn: number | null
): InviteRow[] {
  return records.slice(hasHeader ? 1 : 0).map((r) => ({
    row: r.row,
    email: (r.cells[emailColumn] ?? "").trim(),
    name: nameColumn === null ? "" : (r.cells[nameColumn] ?? "").trim(),
  }));
}

export type InviteRowReason = "missing_email" | "invalid_email" | "name_too_long" | "invalid_row";

export const INVITE_ROW_REASONS: Record<InviteRowReason, string> = {
  missing_email: "No email address",
  invalid_email: "Not a valid email address",
  name_too_long: "Name is too long (over 100 characters)",
  invalid_row: "Row could not be read",
};

export function reasonLabel(reason: string): string {
  return INVITE_ROW_REASONS[reason as InviteRowReason] ?? "Row could not be used";
}
