export const MEMBERS_PAGE_SIZE = 20;

/** Collapse runs of whitespace and trim. Case is handled by `ilike`. */
export function normalizeSearchTerm(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

const BACKSLASH = "\\";

/**
 * Build a PostgREST `or(...)` filter matching `full_name` or `email` against
 * a user-typed term. LIKE wildcards are matched literally and the value is
 * double-quoted so commas and parentheses cannot break out of the filter.
 */
export function buildMemberSearchFilter(raw: string): string | null {
  const term = normalizeSearchTerm(raw);
  if (!term) return null;
  // 1) make % _ \ literal for LIKE; 2) escape \ and " for the quoted value
  const likeEscaped = term.replace(/[\\%_]/g, (ch) => BACKSLASH + ch);
  const quotedEscaped = likeEscaped.replace(/[\\"]/g, (ch) => BACKSLASH + ch);
  const quoted = `"%${quotedEscaped}%"`;
  return `full_name.ilike.${quoted},email.ilike.${quoted}`;
}
