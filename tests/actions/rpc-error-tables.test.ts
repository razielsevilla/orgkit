import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { findErrorRule, type ErrorRule } from "@/src/lib/rpc-errors";

/**
 * Proof that the "longest match wins" matcher in rpc-errors.ts gives the same
 * answer as the old "first match wins" one for every message a database function
 * can really raise, in every rule table the app uses.
 *
 * It reads the real rule tables from the action files (following `...SPREAD` and
 * `.slice(n)`), the real call sites of rpcFailure, and the real RAISE EXCEPTION
 * messages from the latest definition of each function in supabase/migrations.
 */

const ROOT = process.cwd();
const ACTION_DIR = path.join(ROOT, "src/app/(workspace)");
const MIGRATIONS_DIR = path.join(ROOT, "supabase/migrations");

const read = (file: string) => readFileSync(file, "utf8").replace(/\r\n/g, "\n");
const actionFiles = readdirSync(ACTION_DIR)
  .filter((f) => f.endsWith(".ts"))
  .map((f) => ({ name: f, text: read(path.join(ACTION_DIR, f)) }));
const allActionText = actionFiles.map((f) => f.text).join("\n");

// --- parsing the rule tables -------------------------------------------------

interface ParsedRule {
  match: string;
  exact: boolean;
  error: string;
  message: string | null; // null when the message is not a string literal
}

function balanced(text: string, start: number, open: string, close: string): number {
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === open) depth++;
    else if (text[i] === close) {
      depth--;
      if (depth === 0) return i;
    }
  }
  throw new Error(`unbalanced ${open}${close} at ${start}`);
}

function parseRule(objectText: string): ParsedRule {
  const match = /match:\s*"([^"]+)"/.exec(objectText)?.[1];
  const error = /error:\s*"([^"]+)"/.exec(objectText)?.[1];
  if (!match || !error) throw new Error(`cannot read a rule from: ${objectText}`);
  const message = /message:\s*"((?:[^"\\]|\\.)*)"/.exec(objectText)?.[1] ?? null;
  return { match, exact: /exact:\s*true/.test(objectText), error, message };
}

const tableCache = new Map<string, ParsedRule[]>();

function parseTable(name: string): ParsedRule[] {
  const cached = tableCache.get(name);
  if (cached) return cached;

  const declaration = new RegExp(
    `(?:export )?const ${name}\\s*:\\s*(?:readonly )?ErrorRule<[^>]*>(?:\\[\\])?\\s*=\\s*`
  ).exec(allActionText);
  if (!declaration) throw new Error(`rule table ${name} not found`);

  const start = declaration.index + declaration[0].length;
  const rules: ParsedRule[] = [];

  if (allActionText[start] === "{") {
    rules.push(parseRule(allActionText.slice(start, balanced(allActionText, start, "{", "}") + 1)));
  } else {
    const end = balanced(allActionText, start, "[", "]");
    const body = allActionText.slice(start + 1, end);
    let i = 0;
    while (i < body.length) {
      if (body[i] === "{") {
        const close = balanced(body, i, "{", "}");
        rules.push(parseRule(body.slice(i, close + 1)));
        i = close + 1;
      } else if (body.startsWith("...", i)) {
        const spread = /^\.\.\.(\w+)(?:\.slice\((\d+)\))?/.exec(body.slice(i));
        if (!spread) throw new Error(`cannot read spread in ${name}`);
        const inner = parseTable(spread[1]);
        rules.push(...(spread[2] ? inner.slice(Number(spread[2])) : inner));
        i += spread[0].length;
      } else {
        i++;
      }
    }
  }
  tableCache.set(name, rules);
  return rules;
}

// --- call sites of rpcFailure ------------------------------------------------

interface CallSite {
  rpc: string;
  table: string; // a table name, or the literal inline array
  rules: ParsedRule[];
}

const CALL_SITE = /rpcFailure\(\s*"(\w+)"\s*,\s*[\w.]+\s*,\s*(\[[^\]]*\]|[A-Z][A-Z_]+)\s*,/g;

function parseCallSites(): CallSite[] {
  const sites: CallSite[] = [];
  for (const m of allActionText.matchAll(CALL_SITE)) {
    const expr = m[2];
    const rules = expr.startsWith("[")
      ? (expr.match(/[A-Z][A-Z_]{2,}/g) ?? []).flatMap((n) => parseTable(n))
      : parseTable(expr);
    sites.push({ rpc: m[1], table: expr, rules });
  }
  return sites;
}

// --- messages the database really raises -------------------------------------

function parseRaisedMessages(): Map<string, Set<string>> {
  const byFunction = new Map<string, Set<string>>();
  for (const file of readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort()) {
    const sql = read(path.join(MIGRATIONS_DIR, file));
    for (const fn of sql.matchAll(/create or replace function public\.(\w+)\s*\(([\s\S]*?)\n\$\$;/gi)) {
      const messages = new Set<string>();
      for (const raise of fn[0].matchAll(/raise exception\s+'([^']+)'/gi)) messages.add(raise[1]);
      byFunction.set(fn[1], messages); // a later migration replaces an earlier definition
    }
  }
  return byFunction;
}

// --- the two matchers ----------------------------------------------------------

/** The matcher before 5b: the first rule whose text appears in the message */
const oldIndex = (message: string, rules: ParsedRule[]) =>
  rules.findIndex((r) => message.includes(r.match));

/** The real matcher */
const newIndex = (message: string, rules: ParsedRule[]) => {
  const asRules: ErrorRule<string>[] = rules.map((r) => ({
    match: r.match,
    exact: r.exact,
    error: r.error,
    message: r.message ?? "",
  }));
  const found = findErrorRule(message, asRules);
  return found ? asRules.indexOf(found) : -1;
};

// --- the old dues table, frozen -----------------------------------------------
// The dues table as it was before 5b: one generic substring `not_found`, no
// `period_not_found` rule. [match, error, message], in the old order.
const OLD_DUES_TABLE: [string, string, string][] = [
  ["already_reviewed", "already_reviewed", "This payment has already been reviewed by another officer."],
  ["cannot_review_own_payment", "cannot_review_own_payment", "You cannot review your own payment."],
  ["admin_only", "admin_only", "Only organization admins can undo payment verifications."],
  ["payment_not_found", "not_found", "Payment submission not found."],
  ["reason_required", "invalid_input", "A reason is required."],
  ["reason_too_long", "invalid_input", "Reason cannot exceed 500 characters."],
  ["Cannot edit closed dues period", "closed_period", "Closed dues periods cannot be edited."],
  ["period_closed", "closed_period", "Closed dues periods cannot accept payment links."],
  ["Name must be between 2 and 100 characters", "invalid_input", "Name must be between 2 and 100 characters."],
  [
    "Amount must be above 0 and at most 100,000",
    "invalid_input",
    "Amount must be above ₱0 and at most ₱100,000 with up to 2 decimal places.",
  ],
  ["Due date is required", "invalid_input", "Due date is required."],
  ["invalid_action", "invalid_input", "Invalid action for payment link."],
  ["Dues period not found", "not_found", "Dues period not found."],
  ["not_found", "not_found", "Dues period not found."],
  ["Not permitted", "not_authorized", "You are not permitted to manage dues for this organization."],
  ["not_authorized", "not_authorized", "You are not permitted to manage dues for this organization."],
];

// --- the tests -------------------------------------------------------------------

const callSites = parseCallSites();
const raised = parseRaisedMessages();

/** The only overlapping patterns allowed, per table. Add to this on purpose, with a reason. */
const ALLOWED_OVERLAPS: Record<string, string[]> = {
  DUES_ERROR_RULES: ["not_found in payment_not_found", "not_found in period_not_found"],
};

describe("rule tables and call sites are read correctly", () => {
  it("finds every rpcFailure call", () => {
    const calls = (allActionText.match(/rpcFailure\(/g) ?? []).length;
    expect(callSites).toHaveLength(calls);
    expect(callSites.length).toBeGreaterThanOrEqual(25);
  });

  it("knows the real messages of every function it is called for", () => {
    for (const site of callSites) {
      expect(raised.has(site.rpc), `${site.rpc} has no definition in the migrations`).toBe(true);
    }
  });

  it("covers the dues table, with its spread-free rules, and the tables built from spreads", () => {
    const tables = new Set(callSites.map((s) => s.table));
    for (const name of [
      "DUES_ERROR_RULES",
      "SAVE_EVENT_ERRORS",
      "CANCEL_EVENT_ERRORS",
      "CHECKIN_ERRORS",
      "UPDATE_MEMBER_ERRORS",
    ]) {
      expect(tables.has(name), name).toBe(true);
    }
    // a spread really was followed: SAVE_EVENT_ERRORS includes EVENT_WRITE_ERRORS' rules
    expect(parseTable("SAVE_EVENT_ERRORS").map((r) => r.match)).toContain("event_not_found");
  });
});

describe("longest match wins gives the same result as first match wins, for real messages", () => {
  const sitesByTable = new Map<string, CallSite[]>();
  for (const site of callSites) sitesByTable.set(site.table, [...(sitesByTable.get(site.table) ?? []), site]);

  for (const [table, sites] of sitesByTable) {
    if (table === "DUES_ERROR_RULES") continue; // compared against the old table below

    it(`${table}: every real message and every rule's own text resolves to the same rule`, () => {
      const rules = sites[0].rules;
      const messages = new Set<string>(rules.map((r) => r.match));
      for (const site of sites) for (const m of raised.get(site.rpc) ?? []) messages.add(m);

      for (const message of messages) {
        expect(newIndex(message, rules), `message ${JSON.stringify(message)}`).toBe(oldIndex(message, rules));
      }
    });
  }

  it("DUES_ERROR_RULES: the new table and matcher answer exactly as the old table and matcher did", () => {
    const sites = callSites.filter((s) => s.table === "DUES_ERROR_RULES");
    expect(sites.length).toBeGreaterThanOrEqual(10);
    const newRules = sites[0].rules;

    const messages = new Set<string>(OLD_DUES_TABLE.map((r) => r[0]));
    for (const site of sites) for (const m of raised.get(site.rpc) ?? []) messages.add(m);
    expect(messages.size).toBeGreaterThan(20);

    for (const message of messages) {
      const before = OLD_DUES_TABLE.find(([match]) => message.includes(match));
      const index = newIndex(message, newRules);
      const after = index >= 0 ? newRules[index] : undefined;

      expect(
        after ? { error: after.error, message: after.message } : null,
        `message ${JSON.stringify(message)}`
      ).toEqual(before ? { error: before[1], message: before[2] } : null);
    }
  });

  it("the only answers that changed are for codes no dues function raises", () => {
    const newRules = parseTable("DUES_ERROR_RULES");
    const dueMessages = new Set(
      callSites.filter((s) => s.table === "DUES_ERROR_RULES").flatMap((s) => [...(raised.get(s.rpc) ?? [])])
    );
    // member_not_found is raised by log_dues_reminder, which does not go through this table
    expect(dueMessages.has("member_not_found")).toBe(false);
    expect(OLD_DUES_TABLE.find(([m]) => "member_not_found".includes(m))?.[2]).toBe("Dues period not found.");
    expect(newIndex("member_not_found", newRules)).toBe(-1);
  });
});

describe("the tables themselves", () => {
  const tables = new Map<string, ParsedRule[]>();
  for (const site of callSites) tables.set(site.table, site.rules);

  it("has no two rules with the same text, so a tie cannot depend on order", () => {
    for (const [name, rules] of tables) {
      const matches = rules.map((r) => r.match);
      expect(new Set(matches).size, name).toBe(matches.length);
    }
  });

  it("has overlapping patterns only where they are listed as allowed", () => {
    for (const [name, rules] of tables) {
      const overlaps: string[] = [];
      for (const a of rules) {
        for (const b of rules) {
          if (a !== b && b.match.includes(a.match)) overlaps.push(`${a.match} in ${b.match}`);
        }
      }
      expect(overlaps.sort(), name).toEqual((ALLOWED_OVERLAPS[name] ?? []).slice().sort());
    }
  });

  it("answers every real message the same in any order of the table", () => {
    for (const site of callSites) {
      const forward = site.rules;
      const reversed = [...site.rules].reverse();
      for (const message of raised.get(site.rpc) ?? []) {
        const a = newIndex(message, forward);
        const b = newIndex(message, reversed);
        expect(b < 0 ? null : reversed[b].match, `${site.rpc}: ${message}`).toBe(a < 0 ? null : forward[a].match);
      }
    }
  });
});
