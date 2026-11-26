import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildAttentionItems,
  daysBetween,
  duesStatus,
  eventsStatus,
  expectedPacePct,
  formatPesoCompact,
  handoverStatus,
  mapOrgHealthRpcResponse,
  membersStatus,
  officersStatus,
  percentOf,
  summarizeHealth,
  turnoutChange,
  type OrgHealthData,
} from "../../src/lib/health/org-health.ts";
import { brandNew, healthy } from "../stubs/org-health-fixture.ts";

const withDues = (patch: Partial<NonNullable<OrgHealthData["dues"]>>, base = healthy()): OrgHealthData => ({
  ...base,
  dues: { ...base.dues!, ...patch },
});

describe("date and number helpers", () => {
  it("counts whole days between dates, either direction", () => {
    assert.equal(daysBetween("2026-12-01", "2026-12-21"), 20);
    assert.equal(daysBetween("2026-12-21", "2026-12-01"), -20);
    assert.equal(daysBetween("2026-12-01", "2026-12-01"), 0);
  });

  it("is not thrown off by a timestamp or a month boundary", () => {
    assert.equal(daysBetween("2026-11-30T23:00:00Z", "2026-12-01"), 1);
    assert.equal(daysBetween("2026-02-27", "2026-03-01"), 2);
  });

  it("returns 0 for an unreadable date instead of NaN", () => {
    assert.equal(daysBetween("", "2026-12-01"), 0);
  });

  it("percentOf never divides by zero and caps at 100", () => {
    assert.equal(percentOf(50, 200), 25);
    assert.equal(percentOf(5, 0), 0);
    assert.equal(percentOf(0, 100), 0);
    assert.equal(percentOf(500, 100), 100);
  });

  it("expectedPacePct is how far through the period we are, held to 0 to 100", () => {
    assert.equal(expectedPacePct("2026-11-21", "2026-12-21", "2026-12-06"), 50);
    assert.equal(expectedPacePct("2026-11-21", "2026-12-21", "2026-11-01"), 0, "before it started");
    assert.equal(expectedPacePct("2026-11-21", "2026-12-21", "2027-01-15"), 100, "after the due date");
    assert.equal(expectedPacePct("2026-12-01", "2026-12-01", "2026-12-01"), 0, "due the day it was made");
  });

  it("formats pesos without cents unless there are cents", () => {
    assert.equal(formatPesoCompact(12500), "₱12,500");
    assert.equal(formatPesoCompact(250.5), "₱250.50");
    assert.equal(formatPesoCompact(0), "₱0");
  });
});

describe("mapOrgHealthRpcResponse", () => {
  it("maps a full payload, turning numeric strings into numbers", () => {
    const mapped = mapOrgHealthRpcResponse({
      today: "2026-12-01",
      generated_at: "2026-12-01T02:00:00Z",
      members: { active: 5, pending: "2", inactive: 0, joined_30d: 1, joined_prev_30d: 0, oldest_pending_days: 9 },
      dues: {
        period_id: "p",
        name: "Dues",
        amount: "100.00",
        due_on: "2026-12-21",
        created_on: "2026-11-21",
        active_members: 5,
        paid: 1,
        pending: 1,
        rejected: 0,
        unpaid: 3,
        collected: "100.00",
        expected: "500.00",
        outstanding: "400.00",
      },
      events: {
        total: 1,
        upcoming: 1,
        next_event: { id: "e", title: "Meet", starts_at: "2026-12-05T00:00:00Z" },
        held_90d: 0,
        turnout_pct_90d: null,
        held_prev_90d: 0,
        turnout_pct_prev_90d: null,
      },
      officers: { with_access: 2, terms_total: 2, terms_current: 2, terms_ending_30d: 1, next_term_end: "2026-12-20" },
      handover: {
        ending_total: 1,
        ending_ready: 0,
        ending_draft: 1,
        ending_missing: 0,
        roles: [{ role_title: "Treasurer", end_date: "2026-12-20", guide_status: "draft" }],
        guides_ready: 0,
        guides_draft: 1,
      },
      documents: { total: 2, categories_covered: 2 },
    });
    assert.equal(mapped.members.pending, 2);
    assert.equal(mapped.dues?.collected, 100);
    assert.equal(mapped.dues?.outstanding, 400);
    assert.equal(mapped.events.nextEvent?.title, "Meet");
    assert.equal(mapped.events.turnoutPct90d, null);
    assert.equal(mapped.officers.nextTermEnd, "2026-12-20");
    assert.equal(mapped.handover.roles[0].guideStatus, "draft");
  });

  it("keeps a null dues period as null", () => {
    assert.equal(mapOrgHealthRpcResponse({ dues: null }).dues, null);
  });

  it("survives a payload with missing parts, defaulting to zeros", () => {
    const mapped = mapOrgHealthRpcResponse({});
    assert.equal(mapped.members.active, 0);
    assert.equal(mapped.events.nextEvent, null);
    assert.deepEqual(mapped.handover.roles, []);
    assert.equal(mapped.documents.total, 0);
  });

  it("treats an unknown guide status as missing", () => {
    const mapped = mapOrgHealthRpcResponse({
      handover: { roles: [{ role_title: "X", end_date: "2026-12-20", guide_status: "weird" }] },
    });
    assert.equal(mapped.handover.roles[0].guideStatus, "missing");
  });

  it("throws on something that is not an object", () => {
    assert.throws(() => mapOrgHealthRpcResponse(null));
    assert.throws(() => mapOrgHealthRpcResponse("nope"));
    assert.throws(() => mapOrgHealthRpcResponse([]));
  });
});

describe("duesStatus", () => {
  it("is empty with no open period, or no members to collect from", () => {
    assert.equal(duesStatus(healthy({ dues: null })), "empty");
    assert.equal(duesStatus(withDues({ expected: 0, activeMembers: 0, outstanding: 0 })), "empty");
  });

  it("is good when collection keeps up with the calendar and nothing waits on an officer", () => {
    // 10 of 30 days used (pace 33%), 75% collected
    assert.equal(duesStatus(healthy()), "good");
  });

  it("is good once everyone has paid, even past the due date", () => {
    const base = healthy({ today: "2027-01-05" });
    assert.equal(duesStatus(withDues({ collected: 4000, outstanding: 0, paid: 40, unpaid: 0 }, base)), "good");
  });

  it("is critical when overdue with money outstanding", () => {
    const base = healthy({ today: "2026-12-28" });
    assert.equal(duesStatus(base), "critical");
  });

  it("is watch when payments wait for review, because that is the officer's job", () => {
    assert.equal(duesStatus(withDues({ pending: 3, paid: 27 })), "watch");
  });

  it("is watch when collection trails the date-based pace by more than the gap", () => {
    // 15 of 30 days used (pace 50%) and 10% collected
    const base = healthy({ today: "2026-12-06" });
    assert.equal(duesStatus(withDues({ collected: 400, outstanding: 3600 }, base)), "watch");
  });

  it("does not worry about a gap at or under 20 points", () => {
    // pace 50%, collected 30%: a 20 point gap is the limit, not over it
    const base = healthy({ today: "2026-12-06" });
    assert.equal(duesStatus(withDues({ collected: 1200, outstanding: 2800 }, base)), "good");
  });

  it("is watch within 7 days of the due date with under 80% collected", () => {
    // pace 83%, 70% collected: also behind by less than 20, so this isolates the near-due rule
    const base = healthy({ today: "2026-12-16" });
    assert.equal(duesStatus(withDues({ collected: 2800, outstanding: 1200 }, base)), "watch");
  });
});

describe("membersStatus", () => {
  const members = (patch: Partial<OrgHealthData["members"]>) =>
    healthy({ members: { ...healthy().members, ...patch } });

  it("is empty before anyone has joined", () => {
    assert.equal(membersStatus(members({ active: 0, pending: 0, inactive: 0 })), "empty");
  });
  it("is good with a roster and nobody waiting", () => {
    assert.equal(membersStatus(members({})), "good");
  });
  it("is watch while someone waits", () => {
    assert.equal(membersStatus(members({ pending: 2, oldestPendingDays: 3 })), "watch");
  });
  it("is critical once the longest wait reaches 14 days", () => {
    assert.equal(membersStatus(members({ pending: 1, oldestPendingDays: 13 })), "watch");
    assert.equal(membersStatus(members({ pending: 1, oldestPendingDays: 14 })), "critical");
  });
  it("counts a first member who is still pending as having a roster", () => {
    assert.equal(membersStatus(members({ active: 0, pending: 1, oldestPendingDays: 0 })), "watch");
  });
});

describe("eventsStatus and turnoutChange", () => {
  const events = (patch: Partial<OrgHealthData["events"]>) =>
    healthy({ events: { ...healthy().events, ...patch } });

  it("is empty when no event was ever scheduled", () => {
    assert.equal(eventsStatus(events({ total: 0, upcoming: 0, nextEvent: null })), "empty");
  });
  it("is watch with nothing coming up", () => {
    assert.equal(eventsStatus(events({ upcoming: 0, nextEvent: null })), "watch");
  });
  it("is good with events ahead and steady turnout", () => {
    assert.equal(eventsStatus(events({})), "good");
  });
  it("is watch when turnout falls 10 points or more, not for 9", () => {
    assert.equal(eventsStatus(events({ turnoutPct90d: 51, turnoutPctPrev90d: 60 })), "good");
    assert.equal(eventsStatus(events({ turnoutPct90d: 50, turnoutPctPrev90d: 60 })), "watch");
  });
  it("cannot compare turnout without events in both windows", () => {
    assert.equal(turnoutChange(events({ heldPrev90d: 0, turnoutPctPrev90d: null })), null);
    assert.equal(turnoutChange(events({ held90d: 0, turnoutPct90d: null })), null);
    assert.equal(turnoutChange(events({})), 2);
  });
});

describe("officersStatus", () => {
  const officers = (patch: Partial<OrgHealthData["officers"]>) =>
    healthy({ officers: { ...healthy().officers, ...patch } });

  it("is empty with no terms on record", () => {
    assert.equal(officersStatus(officers({ termsTotal: 0, termsCurrent: 0 })), "empty");
  });
  it("is watch when every recorded term has ended", () => {
    assert.equal(officersStatus(officers({ termsCurrent: 0 })), "watch");
  });
  it("is watch when a term ends within 30 days", () => {
    assert.equal(officersStatus(officers({ termsEnding30d: 1 })), "watch");
  });
  it("is good otherwise", () => {
    assert.equal(officersStatus(officers({})), "good");
  });
});

describe("handoverStatus", () => {
  const handover = (patch: Partial<OrgHealthData["handover"]>) =>
    healthy({ handover: { ...healthy().handover, ...patch } });

  it("is empty with nobody leaving and no guides", () => {
    assert.equal(handoverStatus(handover({ guidesReady: 0, guidesDraft: 0 })), "empty");
  });
  it("is good with nobody leaving and guides on file", () => {
    assert.equal(handoverStatus(handover({})), "good");
  });
  it("is good when every leaving role has a ready guide", () => {
    assert.equal(
      handoverStatus(
        handover({
          endingTotal: 1,
          endingReady: 1,
          roles: [{ roleTitle: "Treasurer", endDate: "2026-12-20", guideStatus: "ready" }],
        })
      ),
      "good"
    );
  });
  it("is watch for an unready role leaving later than 14 days", () => {
    assert.equal(
      handoverStatus(
        handover({
          endingTotal: 1,
          endingMissing: 1,
          roles: [{ roleTitle: "Treasurer", endDate: "2027-01-15", guideStatus: "missing" }],
        })
      ),
      "watch"
    );
  });
  it("is critical for an unready role leaving within 14 days", () => {
    assert.equal(
      handoverStatus(
        handover({
          endingTotal: 1,
          endingDraft: 1,
          roles: [{ roleTitle: "Treasurer", endDate: "2026-12-15", guideStatus: "draft" }],
        })
      ),
      "critical"
    );
  });
  it("judges by the soonest unready role, not a ready one that leaves earlier", () => {
    assert.equal(
      handoverStatus(
        handover({
          endingTotal: 2,
          endingReady: 1,
          endingMissing: 1,
          roles: [
            { roleTitle: "Auditor", endDate: "2026-12-05", guideStatus: "ready" },
            { roleTitle: "Treasurer", endDate: "2027-01-20", guideStatus: "missing" },
          ],
        })
      ),
      "watch"
    );
  });
});

describe("summarizeHealth headline", () => {
  it("welcomes a brand new workspace instead of grading it", () => {
    const empty = brandNew();
    const s = summarizeHealth(empty);
    assert.equal(s.considered, 0);
    assert.equal(s.counts.empty, 5);
    assert.equal(s.headline, "Your workspace is ready");
    assert.equal(s.subline, "Next: add your members");
    assert.deepEqual(s.attention, []);
  });

  it("says everything is on track when nothing needs a look", () => {
    const s = summarizeHealth(healthy());
    assert.equal(s.headline, "Everything is on track");
    assert.equal(s.counts.good, 5);
    assert.deepEqual(s.attention, []);
  });

  it("counts areas that need a look, with correct singular and plural", () => {
    const one = summarizeHealth(healthy({ members: { ...healthy().members, pending: 2, oldestPendingDays: 3 } }));
    assert.equal(one.headline, "1 area is worth a look");
    assert.equal(one.subline, "4 of 5 areas are on track");

    const two = summarizeHealth(
      healthy({
        members: { ...healthy().members, pending: 2, oldestPendingDays: 3 },
        events: { ...healthy().events, upcoming: 0, nextEvent: null },
      })
    );
    assert.equal(two.headline, "2 areas are worth a look");
  });

  it("leads with action when anything is critical", () => {
    const s = summarizeHealth(
      healthy({
        today: "2026-12-28",
        members: { ...healthy().members, pending: 2, oldestPendingDays: 3 },
      })
    );
    assert.equal(s.counts.critical, 1);
    assert.equal(s.headline, "1 area needs action");
    assert.equal(s.subline, "1 more is worth a look");
  });

  it("does not count not-started areas against the org", () => {
    const s = summarizeHealth(healthy({ dues: null }));
    assert.equal(s.counts.empty, 1);
    assert.equal(s.considered, 4);
    assert.equal(s.headline, "Everything is on track");
    assert.equal(s.subline, "All 4 areas with data look healthy");
  });
});

describe("buildAttentionItems", () => {
  it("is empty for a healthy org", () => {
    assert.deepEqual(buildAttentionItems(healthy()), []);
  });

  it("puts critical items first, then orders by area", () => {
    const data = healthy({
      today: "2026-12-01",
      members: { ...healthy().members, pending: 2, oldestPendingDays: 20 },
      events: { ...healthy().events, upcoming: 0, nextEvent: null },
      handover: {
        ...healthy().handover,
        endingTotal: 1,
        endingMissing: 1,
        roles: [{ roleTitle: "Treasurer", endDate: "2027-01-20", guideStatus: "missing" }],
      },
    });
    const items = buildAttentionItems(withDues({ pending: 4, paid: 26 }, data));
    assert.deepEqual(
      items.map((i) => i.id),
      ["members-pending", "dues-review", "handover-treasurer", "events-none-upcoming"]
    );
    assert.equal(items[0].severity, "critical");
  });

  it("describes overdue dues with the amount and how many members owe it", () => {
    const [item] = buildAttentionItems(
      withDues({ pending: 0, rejected: 1, unpaid: 9, outstanding: 1000 }, healthy({ today: "2026-12-28" }))
    );
    assert.equal(item.id, "dues-overdue");
    assert.equal(item.severity, "critical");
    assert.equal(item.detail, "₱1,000 still owed by 10 members");
  });

  it("uses singular wording for one payment and one student", () => {
    const items = buildAttentionItems(
      withDues(
        { pending: 1, paid: 29 },
        healthy({ members: { ...healthy().members, pending: 1, oldestPendingDays: 0 } })
      )
    );
    const titles = items.map((i) => i.title);
    assert.ok(titles.includes("1 payment waiting for review"));
    assert.ok(titles.includes("1 student waiting to be confirmed"));
  });

  it("names a role that is leaving with no guide, and one with only a draft", () => {
    const items = buildAttentionItems(
      healthy({
        handover: {
          ...healthy().handover,
          endingTotal: 2,
          endingMissing: 1,
          endingDraft: 1,
          roles: [
            { roleTitle: "Treasurer", endDate: "2026-12-11", guideStatus: "missing" },
            { roleTitle: "Secretary", endDate: "2027-01-10", guideStatus: "draft" },
          ],
        },
      })
    );
    assert.equal(items[0].title, "Treasurer has no handover guide");
    assert.equal(items[0].detail, "Term ends in 10 days");
    assert.equal(items[0].severity, "critical");
    assert.equal(items[1].title, "Secretary handover guide is still a draft");
    assert.equal(items[1].severity, "watch");
  });

  it("words a term ending today or tomorrow naturally", () => {
    const roles = (endDate: string) =>
      healthy({
        handover: {
          ...healthy().handover,
          endingTotal: 1,
          endingMissing: 1,
          roles: [{ roleTitle: "Treasurer", endDate, guideStatus: "missing" }],
        },
      });
    assert.equal(buildAttentionItems(roles("2026-12-01"))[0].detail, "Term ends today");
    assert.equal(buildAttentionItems(roles("2026-12-02"))[0].detail, "Term ends tomorrow");
  });

  it("reports a turnout drop with both numbers", () => {
    const items = buildAttentionItems(
      healthy({ events: { ...healthy().events, turnoutPct90d: 40, turnoutPctPrev90d: 62 } })
    );
    assert.equal(items[0].title, "Turnout fell to 40%");
    assert.equal(items[0].detail, "Down from 62% over the previous 90 days");
  });

  it("never writes a sentence-ending period, an exclamation mark or a double space", () => {
    const data = healthy({
      today: "2026-12-28",
      members: { ...healthy().members, pending: 3, oldestPendingDays: 30 },
      events: { ...healthy().events, upcoming: 0, nextEvent: null, turnoutPct90d: 30, turnoutPctPrev90d: 60 },
      officers: { ...healthy().officers, termsCurrent: 0 },
      handover: {
        ...healthy().handover,
        endingTotal: 1,
        endingMissing: 1,
        roles: [{ roleTitle: "Treasurer", endDate: "2026-12-30", guideStatus: "missing" }],
      },
    });
    for (const item of buildAttentionItems(withDues({ pending: 2 }, data))) {
      for (const text of [item.title, item.detail]) {
        assert.doesNotMatch(text, /[.!]$/, `"${text}" ends with punctuation`);
        assert.doesNotMatch(text, /\s{2,}/, `"${text}" has a double space`);
      }
    }
  });
});
