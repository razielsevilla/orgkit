/**
 * Org health dashboard (O1): types, the rules that turn raw facts into a status,
 * and the "do next" list shown on an officer's Home.
 *
 * The database (get_org_health) returns facts only. Every threshold lives here,
 * in one place, so it can change without a migration and be tested without a
 * database. Free of imports so the node:test unit tests can load it directly.
 */

// ---------------------------------------------------------------------------
// Thresholds. Change a rule here, then update docs/org-health.md.
// ---------------------------------------------------------------------------

export const HEALTH_RULES = {
  /** A student waiting this long to be confirmed turns Members from "look" to "action" */
  pendingMemberCriticalDays: 14,
  /** Dues are "behind pace" when collected % trails the date-based pace by more than this many points */
  duesBehindPaceGap: 20,
  /** Inside this many days of the due date, collection under duesNearDueTarget % needs a look */
  duesNearDueDays: 7,
  duesNearDueTarget: 80,
  /** Turnout is "falling" when it drops by at least this many percentage points */
  turnoutDropPoints: 10,
  /** A term ending inside this many days is flagged on Officer terms */
  termEndingDays: 30,
  /** A role whose term ends inside this many days and has no ready handover guide is "action" */
  handoverCriticalDays: 14,
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export const HEALTH_AREAS = ["dues", "members", "handover", "events", "officers"] as const;
export type HealthArea = (typeof HEALTH_AREAS)[number];

/** empty means "not started": there is nothing to judge yet */
export type HealthStatus = "good" | "watch" | "critical" | "empty";

export type GuideStatus = "ready" | "draft" | "missing";

export interface OrgHealthData {
  /** Today in Manila, as YYYY-MM-DD. Date maths below uses this, never the browser clock */
  today: string;
  generatedAt: string;
  members: {
    active: number;
    pending: number;
    inactive: number;
    joined30d: number;
    joinedPrev30d: number;
    oldestPendingDays: number | null;
  };
  dues: null | {
    periodId: string;
    name: string;
    amount: number;
    dueOn: string;
    createdOn: string;
    activeMembers: number;
    paid: number;
    pending: number;
    rejected: number;
    unpaid: number;
    collected: number;
    expected: number;
    outstanding: number;
  };
  events: {
    total: number;
    upcoming: number;
    nextEvent: null | { id: string; title: string; startsAt: string };
    held90d: number;
    turnoutPct90d: number | null;
    heldPrev90d: number;
    turnoutPctPrev90d: number | null;
  };
  officers: {
    withAccess: number;
    termsTotal: number;
    termsCurrent: number;
    termsEnding30d: number;
    nextTermEnd: string | null;
  };
  handover: {
    endingTotal: number;
    endingReady: number;
    endingDraft: number;
    endingMissing: number;
    roles: { roleTitle: string; endDate: string; guideStatus: GuideStatus }[];
    guidesReady: number;
    guidesDraft: number;
  };
  documents: {
    total: number;
    categoriesCovered: number;
  };
}

export interface AttentionItem {
  id: string;
  area: HealthArea;
  severity: "critical" | "watch";
  title: string;
  detail: string;
}

export interface HealthSummary {
  statuses: Record<HealthArea, HealthStatus>;
  counts: Record<HealthStatus, number>;
  /** Areas that have something to judge: everything except "empty" */
  considered: number;
  headline: string;
  subline: string;
  attention: AttentionItem[];
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const MS_PER_DAY = 86_400_000;

/** Whole days from one YYYY-MM-DD date to another (negative when `to` is earlier) */
export function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from.slice(0, 10)}T00:00:00Z`);
  const b = Date.parse(`${to.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / MS_PER_DAY);
}

/** Share of `part` in `whole` as a whole percent, 0 when there is no whole (never NaN) */
export function percentOf(part: number, whole: number): number {
  if (!(whole > 0) || !(part > 0)) return 0;
  return Math.min(100, Math.round((part / whole) * 100));
}

/**
 * How far through a dues period we should be by `today`, as a percent: the share of
 * days from creation to the due date that have passed. It is the benchmark the
 * collected % is compared with, so "42% collected" can be read as ahead or behind.
 */
export function expectedPacePct(createdOn: string, dueOn: string, today: string): number {
  const total = Math.max(1, daysBetween(createdOn, dueOn));
  const elapsed = Math.min(Math.max(daysBetween(createdOn, today), 0), total);
  return Math.round((elapsed / total) * 100);
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Whole pesos, or two decimals when the amount has cents */
export function formatPesoCompact(amount: number): string {
  const digits = Number.isInteger(amount) ? 0 : 2;
  return `₱${new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount)}`;
}

/** "today", "tomorrow" or "in 12 days" */
export function inDays(days: number): string {
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

// ---------------------------------------------------------------------------
// Mapping the database payload
// ---------------------------------------------------------------------------

type Obj = Record<string, unknown>;

const obj = (v: unknown): Obj => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {});
const num = (v: unknown): number => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "0"));
  return Number.isFinite(n) ? n : 0;
};
const numOrNull = (v: unknown): number | null =>
  v === null || v === undefined ? null : Number.isFinite(Number(v)) ? Number(v) : null;
const str = (v: unknown): string => (v === null || v === undefined ? "" : String(v));
const strOrNull = (v: unknown): string | null => (v === null || v === undefined || v === "" ? null : String(v));

function guideStatus(v: unknown): GuideStatus {
  return v === "ready" || v === "draft" ? v : "missing";
}

/** Maps the raw get_org_health JSON into typed data. Throws when it is not an object. */
export function mapOrgHealthRpcResponse(raw: unknown): OrgHealthData {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Invalid org health RPC response");
  }
  const r = raw as Obj;
  const members = obj(r.members);
  const events = obj(r.events);
  const officers = obj(r.officers);
  const handover = obj(r.handover);
  const documents = obj(r.documents);
  const next = obj(events.next_event);
  const dues = r.dues && typeof r.dues === "object" ? obj(r.dues) : null;

  return {
    today: str(r.today).slice(0, 10),
    generatedAt: str(r.generated_at),
    members: {
      active: num(members.active),
      pending: num(members.pending),
      inactive: num(members.inactive),
      joined30d: num(members.joined_30d),
      joinedPrev30d: num(members.joined_prev_30d),
      oldestPendingDays: numOrNull(members.oldest_pending_days),
    },
    dues: dues
      ? {
          periodId: str(dues.period_id),
          name: str(dues.name),
          amount: num(dues.amount),
          dueOn: str(dues.due_on).slice(0, 10),
          createdOn: str(dues.created_on).slice(0, 10),
          activeMembers: num(dues.active_members),
          paid: num(dues.paid),
          pending: num(dues.pending),
          rejected: num(dues.rejected),
          unpaid: num(dues.unpaid),
          collected: num(dues.collected),
          expected: num(dues.expected),
          outstanding: num(dues.outstanding),
        }
      : null,
    events: {
      total: num(events.total),
      upcoming: num(events.upcoming),
      nextEvent:
        next.id
          ?{ id: str(next.id), title: str(next.title), startsAt: str(next.starts_at) }
          : null,
      held90d: num(events.held_90d),
      turnoutPct90d: numOrNull(events.turnout_pct_90d),
      heldPrev90d: num(events.held_prev_90d),
      turnoutPctPrev90d: numOrNull(events.turnout_pct_prev_90d),
    },
    officers: {
      withAccess: num(officers.with_access),
      termsTotal: num(officers.terms_total),
      termsCurrent: num(officers.terms_current),
      termsEnding30d: num(officers.terms_ending_30d),
      nextTermEnd: strOrNull(officers.next_term_end)?.slice(0, 10) ?? null,
    },
    handover: {
      endingTotal: num(handover.ending_total),
      endingReady: num(handover.ending_ready),
      endingDraft: num(handover.ending_draft),
      endingMissing: num(handover.ending_missing),
      roles: (Array.isArray(handover.roles) ? handover.roles : []).map((item) => {
        const role = obj(item);
        return {
          roleTitle: str(role.role_title),
          endDate: str(role.end_date).slice(0, 10),
          guideStatus: guideStatus(role.guide_status),
        };
      }),
      guidesReady: num(handover.guides_ready),
      guidesDraft: num(handover.guides_draft),
    },
    documents: {
      total: num(documents.total),
      categoriesCovered: num(documents.categories_covered),
    },
  };
}

// ---------------------------------------------------------------------------
// Status rules, one per area
// ---------------------------------------------------------------------------

/** Dues: collected money against the open period's due date and the date-based pace */
export function duesStatus(data: OrgHealthData): HealthStatus {
  const d = data.dues;
  if (!d || d.expected <= 0) return "empty";

  const daysToDue = daysBetween(data.today, d.dueOn);
  const rate = percentOf(d.collected, d.expected);
  const pace = expectedPacePct(d.createdOn, d.dueOn, data.today);

  if (daysToDue < 0 && d.outstanding > 0) return "critical";
  if (d.pending > 0) return "watch";
  if (rate < pace - HEALTH_RULES.duesBehindPaceGap) return "watch";
  if (daysToDue <= HEALTH_RULES.duesNearDueDays && rate < HEALTH_RULES.duesNearDueTarget && d.outstanding > 0) {
    return "watch";
  }
  return "good";
}

/** Members: students waiting to be confirmed */
export function membersStatus(data: OrgHealthData): HealthStatus {
  const m = data.members;
  if (m.active + m.pending === 0) return "empty";
  if (m.pending > 0 && (m.oldestPendingDays ?? 0) >= HEALTH_RULES.pendingMemberCriticalDays) return "critical";
  if (m.pending > 0) return "watch";
  return "good";
}

/** How many points turnout moved against the previous 90 days, or null when either side has no data */
export function turnoutChange(data: OrgHealthData): number | null {
  const e = data.events;
  if (e.turnoutPct90d === null || e.turnoutPctPrev90d === null) return null;
  if (e.held90d === 0 || e.heldPrev90d === 0) return null;
  return e.turnoutPct90d - e.turnoutPctPrev90d;
}

/** Events: something on the calendar, and turnout holding up */
export function eventsStatus(data: OrgHealthData): HealthStatus {
  const e = data.events;
  if (e.total === 0) return "empty";
  if (e.upcoming === 0) return "watch";
  const change = turnoutChange(data);
  if (change !== null && change <= -HEALTH_RULES.turnoutDropPoints) return "watch";
  return "good";
}

/** Officer terms: terms on record, current, and not about to lapse */
export function officersStatus(data: OrgHealthData): HealthStatus {
  const o = data.officers;
  if (o.termsTotal === 0) return "empty";
  if (o.termsCurrent === 0) return "watch";
  if (o.termsEnding30d > 0) return "watch";
  return "good";
}

/** The roles that still need a ready guide, soonest first */
export function unreadyRoles(data: OrgHealthData) {
  return data.handover.roles.filter((r) => r.guideStatus !== "ready");
}

/** Handover: a ready guide for every role that is about to leave */
export function handoverStatus(data: OrgHealthData): HealthStatus {
  const h = data.handover;
  if (h.endingTotal === 0) return h.guidesReady + h.guidesDraft === 0 ? "empty" : "good";
  const unready = unreadyRoles(data);
  if (unready.length === 0 && h.endingReady >= h.endingTotal) return "good";

  // roles is capped at 10 rows by the database, soonest first: the first unready one is the soonest
  const soonest = unready[0];
  if (soonest && daysBetween(data.today, soonest.endDate) <= HEALTH_RULES.handoverCriticalDays) {
    return "critical";
  }
  return "watch";
}

// ---------------------------------------------------------------------------
// "Do next" list
// ---------------------------------------------------------------------------

const AREA_ORDER: Record<HealthArea, number> = {
  dues: 0,
  members: 1,
  handover: 2,
  events: 3,
  officers: 4,
};

export function buildAttentionItems(data: OrgHealthData): AttentionItem[] {
  const items: AttentionItem[] = [];

  // Dues
  const d = data.dues;
  if (d && d.expected > 0) {
    const daysToDue = daysBetween(data.today, d.dueOn);
    const rate = percentOf(d.collected, d.expected);
    const pace = expectedPacePct(d.createdOn, d.dueOn, data.today);
    const owing = d.pending + d.rejected + d.unpaid;

    if (daysToDue < 0 && d.outstanding > 0) {
      items.push({
        id: "dues-overdue",
        area: "dues",
        severity: "critical",
        title: `${d.name} is overdue`,
        detail: `${formatPesoCompact(d.outstanding)} still owed by ${plural(owing, "member")}`,
      });
    } else if (rate < pace - HEALTH_RULES.duesBehindPaceGap) {
      items.push({
        id: "dues-behind",
        area: "dues",
        severity: "watch",
        title: "Dues collection is behind pace",
        detail: `${rate}% collected, about ${pace}% expected by now`,
      });
    } else if (
      daysToDue <= HEALTH_RULES.duesNearDueDays &&
      rate < HEALTH_RULES.duesNearDueTarget &&
      d.outstanding > 0
    ) {
      items.push({
        id: "dues-near-due",
        area: "dues",
        severity: "watch",
        title: `${d.name} is due ${inDays(daysToDue)}`,
        detail: `${formatPesoCompact(d.outstanding)} still to collect`,
      });
    }
    if (d.pending > 0) {
      items.push({
        id: "dues-review",
        area: "dues",
        severity: "watch",
        title: `${plural(d.pending, "payment")} waiting for review`,
        detail: "Verify them so members show as paid",
      });
    }
  }

  // Members
  const m = data.members;
  if (m.pending > 0) {
    const waited = m.oldestPendingDays ?? 0;
    items.push({
      id: "members-pending",
      area: "members",
      severity: waited >= HEALTH_RULES.pendingMemberCriticalDays ? "critical" : "watch",
      title: `${plural(m.pending, "student")} waiting to be confirmed`,
      detail: waited > 0 ? `The longest has waited ${plural(waited, "day")}` : "They joined through your link",
    });
  }

  // Handover: one item per role that is leaving without a ready guide
  for (const role of unreadyRoles(data).slice(0, 3)) {
    const days = daysBetween(data.today, role.endDate);
    items.push({
      id: `handover-${role.roleTitle.toLowerCase()}`,
      area: "handover",
      severity: days <= HEALTH_RULES.handoverCriticalDays ? "critical" : "watch",
      title:
        role.guideStatus === "draft"
          ? `${role.roleTitle} handover guide is still a draft`
          : `${role.roleTitle} has no handover guide`,
      detail: `Term ends ${inDays(days)}`,
    });
  }

  // Events
  const e = data.events;
  if (e.total > 0 && e.upcoming === 0) {
    items.push({
      id: "events-none-upcoming",
      area: "events",
      severity: "watch",
      title: "No events are scheduled",
      detail: "Add the next one so members know what is coming",
    });
  }
  const change = turnoutChange(data);
  if (change !== null && change <= -HEALTH_RULES.turnoutDropPoints) {
    items.push({
      id: "events-turnout",
      area: "events",
      severity: "watch",
      title: `Turnout fell to ${e.turnoutPct90d}%`,
      detail: `Down from ${e.turnoutPctPrev90d}% over the previous 90 days`,
    });
  }

  // Officer terms
  const o = data.officers;
  if (o.termsTotal > 0 && o.termsCurrent === 0) {
    items.push({
      id: "officers-no-current",
      area: "officers",
      severity: "watch",
      title: "No officer terms are current",
      detail: "Record this term so handovers stay on track",
    });
  }

  return items.sort(
    (a, b) =>
      Number(b.severity === "critical") - Number(a.severity === "critical") ||
      AREA_ORDER[a.area] - AREA_ORDER[b.area]
  );
}

// ---------------------------------------------------------------------------
// The whole summary
// ---------------------------------------------------------------------------

export function summarizeHealth(data: OrgHealthData): HealthSummary {
  const statuses: Record<HealthArea, HealthStatus> = {
    dues: duesStatus(data),
    members: membersStatus(data),
    handover: handoverStatus(data),
    events: eventsStatus(data),
    officers: officersStatus(data),
  };

  const counts: Record<HealthStatus, number> = { good: 0, watch: 0, critical: 0, empty: 0 };
  for (const area of HEALTH_AREAS) counts[statuses[area]]++;
  const considered = counts.good + counts.watch + counts.critical;

  let headline: string;
  let subline: string;
  if (considered === 0) {
    headline = "Your workspace is ready";
    subline = "Next: add your members";
  } else if (counts.critical > 0) {
    headline = `${plural(counts.critical, "area")} ${counts.critical === 1 ? "needs" : "need"} action`;
    subline =
      counts.watch > 0 ? `${counts.watch} more ${counts.watch === 1 ? "is" : "are"} worth a look` : `${counts.good} of ${considered} areas are on track`;
  } else if (counts.watch > 0) {
    headline = `${plural(counts.watch, "area")} ${counts.watch === 1 ? "is" : "are"} worth a look`;
    subline = `${counts.good} of ${considered} areas are on track`;
  } else {
    headline = "Everything is on track";
    subline = `All ${considered} ${considered === 1 ? "area" : "areas"} with data look healthy`;
  }

  return { statuses, counts, considered, headline, subline, attention: buildAttentionItems(data) };
}
