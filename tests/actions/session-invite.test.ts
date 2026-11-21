import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The cookie that remembers an invite across Google sign-in. It carries the raw invite
 * token, so how it is set matters: not readable by scripts, not sent cross-site, only
 * over HTTPS in production, short-lived. And a value that doesn't look like a token must
 * never be trusted, whether it is being stored or read back.
 */

interface SetCall {
  name: string;
  value: string;
  options: Record<string, unknown>;
}

const store = {
  jar: new Map<string, string>(),
  sets: [] as SetCall[],
  deletes: [] as string[],
};

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (store.jar.has(name) ? { name, value: store.jar.get(name)! } : undefined),
    set: (name: string, value: string, options: Record<string, unknown>) => {
      store.sets.push({ name, value, options });
      store.jar.set(name, value);
    },
    delete: (name: string) => {
      store.deletes.push(name);
      store.jar.delete(name);
    },
  }),
}));

const { INVITE_COOKIE_NAME, setPendingInviteCookie, getPendingInviteCookie, clearPendingInviteCookie } =
  await import("@/src/lib/auth/session-invite");

const TOKEN = "Ab3_-".repeat(8) + "xyz"; // 43 base64url characters, like generateInviteToken()

/** Strings that must never be accepted as an invite token */
const NOT_TOKENS: [string, string][] = [
  ["empty", ""],
  ["only spaces", "   "],
  ["too short", "short"],
  ["42 characters", "a".repeat(42)],
  ["44 characters", "a".repeat(44)],
  ["a '+' inside", "a".repeat(42) + "+"],
  ["a '/' inside", "a".repeat(42) + "/"],
  ["a '=' padding", "a".repeat(42) + "="],
  ["a space inside", "a".repeat(21) + " " + "a".repeat(21)],
  ["a script tag", "<script>alert(1)</script>".padEnd(43, "a")],
  ["non-ASCII", "é".repeat(43)],
];

beforeEach(() => {
  store.jar.clear();
  store.sets = [];
  store.deletes = [];
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("the cookie name", () => {
  it("is orgkit_pending_invite (the proxy and the callback look for this exact name)", () => {
    expect(INVITE_COOKIE_NAME).toBe("orgkit_pending_invite");
  });
});

describe("setPendingInviteCookie", () => {
  it("stores the token with exactly these attributes: HttpOnly, SameSite=Lax, path /, 30 minutes", async () => {
    vi.stubEnv("NODE_ENV", "development");

    await setPendingInviteCookie(TOKEN);

    expect(store.sets).toEqual([
      {
        name: "orgkit_pending_invite",
        value: TOKEN,
        // toEqual on the whole object also proves nothing else is added (no domain, no expires)
        options: { httpOnly: true, secure: false, sameSite: "lax", path: "/", maxAge: 1800 },
      },
    ]);
  });

  it("lives for 30 minutes (1800 seconds)", async () => {
    await setPendingInviteCookie(TOKEN);
    expect(store.sets[0].options.maxAge).toBe(30 * 60);
  });

  it("is HttpOnly and SameSite=Lax in every environment", async () => {
    for (const env of ["production", "development", "test"]) {
      store.sets = [];
      vi.stubEnv("NODE_ENV", env);
      await setPendingInviteCookie(TOKEN);
      expect(store.sets[0].options.httpOnly, env).toBe(true);
      expect(store.sets[0].options.sameSite, env).toBe("lax");
      expect(store.sets[0].options.path, env).toBe("/");
    }
  });

  it("is Secure in production only", async () => {
    for (const [env, secure] of [
      ["production", true],
      ["development", false],
      ["test", false],
    ] as const) {
      store.sets = [];
      vi.stubEnv("NODE_ENV", env);
      await setPendingInviteCookie(TOKEN);
      expect(store.sets[0].options.secure, env).toBe(secure);
    }
  });

  it("trims whitespace around a valid token before storing it", async () => {
    await setPendingInviteCookie(`  ${TOKEN}\n`);

    expect(store.sets).toHaveLength(1);
    expect(store.sets[0].value).toBe(TOKEN);
  });

  it.each(NOT_TOKENS)("ignores a value that is not a token (%s): nothing is stored", async (_label, value) => {
    await setPendingInviteCookie(value);

    expect(store.sets).toEqual([]);
    expect(store.jar.size).toBe(0);
  });
});

describe("getPendingInviteCookie", () => {
  it("returns a valid token from the cookie", async () => {
    store.jar.set(INVITE_COOKIE_NAME, TOKEN);
    expect(await getPendingInviteCookie()).toBe(TOKEN);
  });

  it("returns null when there is no cookie", async () => {
    expect(await getPendingInviteCookie()).toBeNull();
  });

  it.each(NOT_TOKENS.filter(([, value]) => value !== ""))(
    "ignores a tampered or malformed value (%s)",
    async (_label, value) => {
      store.jar.set(INVITE_COOKIE_NAME, value);
      expect(await getPendingInviteCookie()).toBeNull();
    }
  );

  it("does not trim: a value with spaces around a token is not accepted", async () => {
    store.jar.set(INVITE_COOKIE_NAME, ` ${TOKEN} `);
    expect(await getPendingInviteCookie()).toBeNull();
  });

  it("ignores other cookies", async () => {
    store.jar.set("some_other_cookie", TOKEN);
    expect(await getPendingInviteCookie()).toBeNull();
  });
});

describe("clearPendingInviteCookie", () => {
  it("deletes the invite cookie, and only that one", async () => {
    store.jar.set(INVITE_COOKIE_NAME, TOKEN);
    store.jar.set("sb-session", "keep-me");

    await clearPendingInviteCookie();

    expect(store.deletes).toEqual(["orgkit_pending_invite"]);
    expect(store.jar.has(INVITE_COOKIE_NAME)).toBe(false);
    expect(store.jar.get("sb-session")).toBe("keep-me");
  });

  it("does nothing harmful when there is no cookie", async () => {
    await expect(clearPendingInviteCookie()).resolves.toBeUndefined();
  });
});

describe("set, read and clear together", () => {
  it("round-trips a token and then forgets it", async () => {
    await setPendingInviteCookie(TOKEN);
    expect(await getPendingInviteCookie()).toBe(TOKEN);

    await clearPendingInviteCookie();
    expect(await getPendingInviteCookie()).toBeNull();
  });
});
