import { beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToReadableStream } from "react-dom/server";
import type { UsageWeek } from "@/src/lib/owner/usage-report";

/**
 * The owner-only usage report: who may open it, and what it shows. There is no
 * real browser here, so the 360px layout is checked as markup: a card list that
 * is shown at 640px and below, and a media query that hides the table.
 */

interface FakeState {
  rpcResult: { data: unknown; error: { message: string } | null };
  sessionUser: { id: string } | null;
  officer: { id: string } | null;
  rpcCalls: string[];
}

const state: FakeState = {
  rpcResult: { data: true, error: null },
  sessionUser: { id: "user-1" },
  officer: { id: "user-1" },
  rpcCalls: [],
};

class NotFoundError extends Error {
  constructor() {
    super("NEXT_NOT_FOUND");
  }
}

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new NotFoundError();
  },
  redirect: (to: string) => {
    throw new Error(`REDIRECT:${to}`);
  },
}));
vi.mock("@/src/lib/auth/officer", () => ({
  requireOfficer: async () => {
    if (!state.sessionUser) throw new Error("REDIRECT:/signin");
    return { user: state.sessionUser, officer: state.officer };
  },
}));
vi.mock("@/src/lib/auth/session-user", () => ({
  getSessionUser: async () => ({
    user: state.sessionUser,
    supabase: {
      rpc: async (fn: string) => {
        state.rpcCalls.push(fn);
        return state.rpcResult;
      },
    },
  }),
}));

const { requireOwner } = await import("@/src/lib/auth/owner");
const { getUsageReport } = await import("@/src/lib/owner/usage-queries");
const { UsageTable } = await import("@/src/components/owner/usage-table");

beforeEach(() => {
  state.rpcResult = { data: true, error: null };
  state.sessionUser = { id: "user-1" };
  state.officer = { id: "user-1" };
  state.rpcCalls = [];
  vi.spyOn(console, "error").mockImplementation(() => {});
});

async function render(weeks: UsageWeek[]): Promise<string> {
  const stream = await renderToReadableStream(createElement(UsageTable, { weeks }));
  await stream.allReady;
  return (await new Response(stream).text()).replace(/<!-- -->/g, "");
}

const week = (over: Partial<UsageWeek>): UsageWeek => ({
  weekStart: "2026-11-09",
  weekEnd: "2026-11-15",
  status: "ready",
  orgsActive: 3,
  orgsInactive: 2,
  eventsCreated: 7,
  checkIns: 41,
  activeOfficers: 6,
  attempts: 1,
  ...over,
});

describe("requireOwner", () => {
  it("lets the owner in", async () => {
    await expect(requireOwner()).resolves.toMatchObject({ user: { id: "user-1" } });
    expect(state.rpcCalls).toEqual(["is_platform_owner"]);
  });

  it("gives anyone else a 404, including an org admin", async () => {
    state.rpcResult = { data: false, error: null };
    await expect(requireOwner()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("treats a failed ownership check as not the owner", async () => {
    state.rpcResult = { data: null, error: { message: "boom" } };
    await expect(requireOwner()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("sends a signed-out visitor to sign-in before checking anything", async () => {
    state.sessionUser = null;
    await expect(requireOwner()).rejects.toThrow("REDIRECT:/signin");
    expect(state.rpcCalls).toEqual([]);
  });
});

describe("getUsageReport", () => {
  it("returns the weeks in the page's shape, newest first as the database sends them", async () => {
    state.rpcResult = {
      data: [
        {
          week_start: "2026-11-09",
          week_end: "2026-11-15",
          status: "ready",
          orgs_total: 5,
          orgs_active: 3,
          orgs_inactive: 2,
          events_created: 7,
          check_ins: 41,
          active_officers: 6,
          attempts: 1,
        },
      ],
      error: null,
    };
    const result = await getUsageReport();
    expect(result).toEqual({
      ok: true,
      weeks: [expect.objectContaining({ weekStart: "2026-11-09", checkIns: 41, orgsInactive: 2 })],
    });
  });

  it("gives a 404 when the database says the caller is not the owner", async () => {
    state.rpcResult = { data: null, error: { message: "not_authorized" } };
    await expect(getUsageReport()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("reports a failure instead of throwing for any other database error", async () => {
    state.rpcResult = { data: null, error: { message: "connection reset" } };
    expect(await getUsageReport()).toEqual({ ok: false });
  });
});

describe("UsageTable", () => {
  it("shows the five labelled figures for a ready week", async () => {
    const html = await render([week({})]);

    for (const label of ["Active orgs", "Inactive orgs", "Events", "Check-ins", "Active officers"]) {
      expect(html, label).toContain(label);
    }
    expect(html).toContain("Nov 9 – 15, 2026");
    expect(html).toContain(">41<");
  });

  it("shows an inactive count for a week where nothing happened, not an empty row", async () => {
    const html = await render([
      week({ weekStart: "2026-11-02", weekEnd: "2026-11-08", orgsActive: 0, orgsInactive: 4, eventsCreated: 0, checkIns: 0, activeOfficers: 0 }),
    ]);
    expect(html).toContain("Nov 2 – 8, 2026");
    expect(html).toContain(">4<");
  });

  it('shows "No data yet" when no week has been produced', async () => {
    const html = await render([
      week({ status: "pending" }),
      week({ status: "pending", weekStart: "2026-11-02", weekEnd: "2026-11-08" }),
    ]);
    expect(html).toContain("No data yet");
    expect(html).not.toContain("<table");
  });

  it("shows a failed week with its attempt count while the other weeks keep their numbers", async () => {
    const html = await render([
      week({ status: "failed", attempts: 2, weekStart: "2026-11-16", weekEnd: "2026-11-22" }),
      week({}),
    ]);
    expect(html).toContain("Report failed (2 attempts). Retrying automatically.");
    expect(html).toContain('role="alert"');
    expect(html).toContain(">41<");
  });

  it("has a card layout for phones and hides the table at 640px and below", async () => {
    const html = await render([week({})]);

    expect(html).toContain("orgkit-usage-cards");
    expect(html).toContain("@media (max-width: 640px)");
    expect(html).toMatch(/\.orgkit-usage-table-wrap\s*\{\s*display:\s*none/);
    // The phone cards use a shrinkable 2-column grid, so nothing forces a wide page
    expect(html).toContain("repeat(2, minmax(0, 1fr))");
  });
});
