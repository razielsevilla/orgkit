import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * /invite/[token]/start: the route that remembers an invite across Google sign-in.
 * POST is called by the "Continue with Google" button; GET is for a signed-in visitor
 * who still has to agree to the privacy notice. Both write the invite cookie, so a
 * token that doesn't look like a real one must never be stored, and the redirect target
 * must never depend on the token.
 */

interface SetCall {
  name: string;
  value: string;
  options: Record<string, unknown>;
}

const store = { jar: new Map<string, string>(), sets: [] as SetCall[] };

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (store.jar.has(name) ? { name, value: store.jar.get(name)! } : undefined),
    set: (name: string, value: string, options: Record<string, unknown>) => {
      store.sets.push({ name, value, options });
      store.jar.set(name, value);
    },
    delete: (name: string) => {
      store.jar.delete(name);
    },
  }),
}));

const { POST, GET } = await import("@/src/app/invite/[token]/start/route");

const TOKEN = "d".repeat(43);
const ORIGIN = "https://orgkit.test";

const context = (token: string) => ({ params: Promise.resolve({ token }) });
const post = (token: string) =>
  POST(new Request(`${ORIGIN}/invite/${encodeURIComponent(token)}/start`, { method: "POST" }), context(token));
const get = (token: string, origin = ORIGIN) =>
  GET(new Request(`${origin}/invite/${encodeURIComponent(token)}/start`), context(token));

/** What a visitor must never be able to get stored, or be redirected through */
const BAD_TOKENS: [string, string][] = [
  ["empty", ""],
  ["too short", "short"],
  ["42 characters", "d".repeat(42)],
  ["44 characters", "d".repeat(44)],
  ["a space around a valid token", ` ${TOKEN}`],
  ["a path traversal", "../../signin"],
  ["a full URL", "https://evil.example/".padEnd(43, "x")],
  ["a '+' inside", "d".repeat(42) + "+"],
];

beforeEach(() => {
  store.jar.clear();
  store.sets = [];
});

describe("POST /invite/[token]/start (before sign-in)", () => {
  it("remembers a valid invite: 204 with an empty body and the cookie set", async () => {
    const res = await post(TOKEN);

    expect(res.status).toBe(204);
    expect(await res.text()).toBe("");
    expect(store.sets).toHaveLength(1);
    expect(store.sets[0]).toMatchObject({
      name: "orgkit_pending_invite",
      value: TOKEN,
      options: { httpOnly: true, sameSite: "lax", path: "/" },
    });
  });

  it.each(BAD_TOKENS)("refuses a bad token (%s): 400, empty body, nothing stored", async (_label, token) => {
    const res = await post(token);

    expect(res.status).toBe(400);
    expect(await res.text()).toBe("");
    expect(store.sets).toEqual([]);
    expect(store.jar.size).toBe(0);
  });

  it("needs no sign-in: a visitor with no session can call it", async () => {
    // nothing here mocks a session; the route does not ask for one
    const res = await post(TOKEN);
    expect(res.status).toBe(204);
  });
});

describe("GET /invite/[token]/start (signed in, consent still to give)", () => {
  it("remembers a valid invite and sends the visitor to the consent screen, on the request's own origin", async () => {
    const res = await get(TOKEN);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(`${ORIGIN}/consent`);
    expect(store.sets).toHaveLength(1);
    expect(store.sets[0]).toMatchObject({ name: "orgkit_pending_invite", value: TOKEN });
  });

  it("builds the redirect from the request's origin, whatever that is", async () => {
    const res = await get(TOKEN, "http://localhost:3000");
    expect(res.headers.get("location")).toBe("http://localhost:3000/consent");
  });

  it.each(BAD_TOKENS)(
    "sends a bad token (%s) to sign-in and stores nothing",
    async (_label, token) => {
      const res = await get(token);

      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe(`${ORIGIN}/signin`);
      expect(store.sets).toEqual([]);
    }
  );

  it("never puts the token into the redirect target, so it cannot be used to redirect elsewhere", async () => {
    for (const token of [TOKEN, ...BAD_TOKENS.map(([, t]) => t)]) {
      const location = (await get(token)).headers.get("location")!;
      expect([`${ORIGIN}/consent`, `${ORIGIN}/signin`]).toContain(location);
    }
  });
});
