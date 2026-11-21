import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * clearInviteCookie is the server action the invite page's "cancel" and "expired" cards
 * call. The page itself may not write cookies while it renders, so this is where an
 * unusable invite is forgotten. It must clear the right cookie, nothing else, and must
 * not need a signed-in user (the visitor may have none).
 */

const store = {
  jar: new Map<string, string>(),
  deletes: [] as string[],
};

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (store.jar.has(name) ? { name, value: store.jar.get(name)! } : undefined),
    set: (name: string, value: string) => {
      store.jar.set(name, value);
    },
    delete: (name: string) => {
      store.deletes.push(name);
      store.jar.delete(name);
    },
  }),
}));

const sessionLookups = { count: 0 };
vi.mock("@/src/lib/auth/session-user", () => ({
  getSessionUser: async () => {
    sessionLookups.count += 1;
    throw new Error("clearInviteCookie must not look up the session");
  },
}));

const adminClients = { count: 0 };
vi.mock("@/src/lib/supabase/service-role", () => ({
  createAdminClient: () => {
    adminClients.count += 1;
    throw new Error("clearInviteCookie must not touch the database");
  },
}));

const { clearInviteCookie } = await import("@/src/app/invite/actions");

const TOKEN = "c".repeat(43);

beforeEach(() => {
  store.jar.clear();
  store.deletes = [];
  sessionLookups.count = 0;
  adminClients.count = 0;
});

describe("clearInviteCookie", () => {
  it("clears the pending-invite cookie", async () => {
    store.jar.set("orgkit_pending_invite", TOKEN);

    await clearInviteCookie();

    expect(store.deletes).toEqual(["orgkit_pending_invite"]);
    expect(store.jar.has("orgkit_pending_invite")).toBe(false);
  });

  it("leaves every other cookie alone, including the sign-in session", async () => {
    store.jar.set("orgkit_pending_invite", TOKEN);
    store.jar.set("sb-access-token", "session");
    store.jar.set("theme", "dark");

    await clearInviteCookie();

    expect([...store.jar.keys()].sort()).toEqual(["sb-access-token", "theme"]);
  });

  it("is harmless when there is no cookie to clear", async () => {
    await expect(clearInviteCookie()).resolves.toBeUndefined();
    expect(store.deletes).toEqual(["orgkit_pending_invite"]);
  });

  it("works with no signed-in user: it never looks up the session or the database", async () => {
    store.jar.set("orgkit_pending_invite", TOKEN);

    await clearInviteCookie();

    expect(sessionLookups.count).toBe(0);
    expect(adminClients.count).toBe(0);
  });

  it("returns nothing to the browser", async () => {
    store.jar.set("orgkit_pending_invite", TOKEN);
    await expect(clearInviteCookie()).resolves.toBeUndefined();
  });
});
