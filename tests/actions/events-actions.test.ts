import { beforeEach, describe, expect, it, vi } from "vitest";
import { EVENT_MESSAGES } from "@/src/lib/events/event-validation";

interface FakeState {
  user: { id: string } | null;
  callerRole: string | null;
  rpcCalls: { fn: string; args: Record<string, unknown> }[];
  rpcResult: { data: unknown; error: { message: string } | null };
  eventRow: Record<string, unknown> | null;
  eventRows: Record<string, unknown>[];
  /** Every table the fake was asked to read, to prove a malformed ID reads nothing */
  tablesRead: string[];
}

const state: FakeState = {
  user: null,
  callerRole: null,
  rpcCalls: [],
  rpcResult: { data: "ok", error: null },
  eventRow: null,
  eventRows: [],
  tablesRead: [],
};

const fakeClient = {
  auth: { getUser: async () => ({ data: { user: state.user } }) },
  from: (table: string) => {
    state.tablesRead.push(table);
    return {
      select: () => ({
        eq: () => ({
          // getWorkspaceEvents: .eq(org).order().order()
          order: () => ({ order: async () => ({ data: state.eventRows, error: null }) }),
          eq: () => ({
            maybeSingle: async () => {
              if (table === "org_officers") {
                return { data: state.callerRole ? { role: state.callerRole } : null, error: null };
              }
              return { data: state.eventRow, error: null };
            },
          }),
        }),
      }),
    };
  },
  rpc: async (fn: string, args: Record<string, unknown>) => {
    state.rpcCalls.push({ fn, args });
    return state.rpcResult;
  },
};

vi.mock("@/src/lib/supabase/server", () => ({ createClient: async () => fakeClient }));
const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: (p: string) => revalidatePath(p) }));

const { createEventAction, updateEventAction, cancelEventAction, getWorkspaceEvent, getWorkspaceEvents } =
  await import("@/src/app/(workspace)/events-actions");

const ORG = "11111111-1111-4111-8111-111111111111";
const ME = "22222222-2222-4222-8222-222222222222";
const EVENT = "33333333-3333-4333-8333-333333333333";

const input = {
  title: "General meeting",
  startsAt: "2030-05-01T10:00:00.000Z",
  endsAt: "2030-05-01T12:00:00.000Z",
  location: "Room 4",
};

beforeEach(() => {
  state.user = { id: ME };
  state.callerRole = "officer";
  state.rpcCalls = [];
  state.rpcResult = { data: "ok", error: null };
  state.eventRow = null;
  state.eventRows = [];
  state.tablesRead = [];
  revalidatePath.mockClear();
});

describe("createEventAction", () => {
  it("creates an event through create_event and revalidates the list", async () => {
    state.rpcResult = { data: EVENT, error: null };
    const res = await createEventAction(ORG, input);

    expect(res.success).toBe(true);
    expect(res.data).toEqual({ id: EVENT });
    expect(state.rpcCalls).toEqual([
      {
        fn: "create_event",
        args: {
          target_org: ORG,
          new_title: "General meeting",
          new_starts_at: input.startsAt,
          new_ends_at: input.endsAt,
          new_location: "Room 4",
        },
      },
    ]);
    expect(revalidatePath).toHaveBeenCalledWith(`/workspace/${ORG}/events`);
  });

  it("sends a blank location as null", async () => {
    state.rpcResult = { data: EVENT, error: null };
    await createEventAction(ORG, { ...input, location: "   " });
    expect(state.rpcCalls[0].args.new_location).toBeNull();
  });

  it.each([
    ["a 1-character title", { ...input, title: "a" }, EVENT_MESSAGES.titleInvalid],
    ["a 101-character title", { ...input, title: "x".repeat(101) }, EVENT_MESSAGES.titleInvalid],
    ["an end before the start", { ...input, endsAt: "2030-05-01T09:00:00.000Z" }, EVENT_MESSAGES.endBeforeStart],
    ["a missing start", { ...input, startsAt: "" }, EVENT_MESSAGES.startInvalid],
  ])("rejects %s without calling the database", async (_name, bad, message) => {
    const res = await createEventAction(ORG, bad);
    expect(res.success).toBe(false);
    expect(res.error).toBe("invalid_request");
    expect(res.errorMessage).toBe(message);
    expect(state.rpcCalls).toEqual([]);
    expect(state.tablesRead).toEqual([]);
  });

  it("refuses a malformed org ID without touching the database", async () => {
    const res = await createEventAction("not-a-uuid", input);
    expect(res.error).toBe("invalid_request");
    expect(state.rpcCalls).toEqual([]);
    expect(state.tablesRead).toEqual([]);
  });

  it("refuses a signed-out caller", async () => {
    state.user = null;
    const res = await createEventAction(ORG, input);
    expect(res.error).toBe("not_authenticated");
    expect(state.rpcCalls).toEqual([]);
  });

  it("refuses an officer of another org", async () => {
    state.callerRole = null;
    const res = await createEventAction(ORG, input);
    expect(res.error).toBe("access_revoked");
    expect(state.rpcCalls).toEqual([]);
  });

  it("maps a database refusal to a message and hides unknown errors", async () => {
    state.rpcResult = { data: null, error: { message: "not_permitted" } };
    expect((await createEventAction(ORG, input)).error).toBe("access_revoked");

    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    state.rpcResult = { data: null, error: { message: "relation events exploded at /var/db" } };
    const res = await createEventAction(ORG, input);
    expect(res.error).toBe("failed");
    expect(res.errorMessage).toBe(EVENT_MESSAGES.saveFailed);
    spy.mockRestore();
  });
});

describe("updateEventAction", () => {
  it("updates through update_event and revalidates the list and the event page", async () => {
    const res = await updateEventAction(ORG, EVENT, input);
    expect(res.success).toBe(true);
    expect(state.rpcCalls[0].fn).toBe("update_event");
    expect(state.rpcCalls[0].args.target_event).toBe(EVENT);
    expect(revalidatePath).toHaveBeenCalledWith(`/workspace/${ORG}/events`);
    expect(revalidatePath).toHaveBeenCalledWith(`/workspace/${ORG}/events/${EVENT}`);
  });

  it("rejects bad input and malformed IDs without calling the database", async () => {
    expect((await updateEventAction(ORG, EVENT, { ...input, title: "a" })).error).toBe("invalid_request");
    expect((await updateEventAction(ORG, "nope", input)).error).toBe("invalid_request");
    expect(state.rpcCalls).toEqual([]);
    expect(state.tablesRead).toEqual([]);
  });

  it("explains that a cancelled event can't be edited", async () => {
    state.rpcResult = { data: null, error: { message: "event_cancelled" } };
    const res = await updateEventAction(ORG, EVENT, input);
    expect(res.error).toBe("cancelled");
    expect(res.errorMessage).toBe(EVENT_MESSAGES.alreadyCancelled);
  });
});

describe("cancelEventAction", () => {
  it("cancels through cancel_event, and cancelling again also succeeds", async () => {
    expect((await cancelEventAction(ORG, EVENT)).success).toBe(true);
    expect((await cancelEventAction(ORG, EVENT)).success).toBe(true);
    expect(state.rpcCalls.map((c) => c.fn)).toEqual(["cancel_event", "cancel_event"]);
    expect(revalidatePath).toHaveBeenCalledWith(`/workspace/${ORG}/events`);
  });

  it("refuses a malformed event ID without touching the database", async () => {
    const res = await cancelEventAction(ORG, "../../etc");
    expect(res.error).toBe("invalid_request");
    expect(state.rpcCalls).toEqual([]);
    expect(state.tablesRead).toEqual([]);
  });

  it("reports an event that is not found", async () => {
    state.rpcResult = { data: null, error: { message: "event_not_found" } };
    expect((await cancelEventAction(ORG, EVENT)).error).toBe("not_found");
  });
});

describe("reading events", () => {
  const row = {
    id: EVENT,
    org_id: ORG,
    title: "General meeting",
    starts_at: input.startsAt,
    ends_at: input.endsAt,
    location: null,
    status: "scheduled",
    created_at: "2030-01-01T00:00:00Z",
  };

  it("lists the org's events", async () => {
    state.eventRows = [row];
    const res = await getWorkspaceEvents(ORG);
    expect(res.success).toBe(true);
    expect(res.data).toEqual([
      {
        id: EVENT,
        orgId: ORG,
        title: "General meeting",
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        location: null,
        status: "scheduled",
        createdAt: "2030-01-01T00:00:00Z",
      },
    ]);
  });

  it("answers not_found for a malformed event ID without any database query", async () => {
    const res = await getWorkspaceEvent(ORG, "not-a-uuid");
    expect(res.error).toBe("not_found");
    expect(state.tablesRead).toEqual([]);
  });

  it("answers not_found for an event that is missing or belongs to another org", async () => {
    state.eventRow = null;
    const res = await getWorkspaceEvent(ORG, EVENT);
    expect(res.error).toBe("not_found");
  });

  it("refuses an officer of another org, and a signed-out visitor", async () => {
    state.callerRole = null;
    expect((await getWorkspaceEvent(ORG, EVENT)).error).toBe("access_revoked");
    expect((await getWorkspaceEvents(ORG)).error).toBe("access_revoked");
    state.user = null;
    expect((await getWorkspaceEvents(ORG)).error).toBe("not_authenticated");
  });

  it("returns the event for an officer of the org", async () => {
    state.eventRow = row;
    const res = await getWorkspaceEvent(ORG, EVENT);
    expect(res.success).toBe(true);
    expect(res.data?.title).toBe("General meeting");
  });
});
