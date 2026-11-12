import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// The proxy's routing rules: who goes where, signed in or out. The session and
// the org lookup are mocked, so this checks the rules and not Supabase.
const getUser = vi.fn();
const signOut = vi.fn();
const getLatestOrgId = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({ auth: { getUser, signOut } }),
}));
vi.mock("@/src/lib/supabase/env", () => ({
  getSupabaseUrl: () => "http://supabase.test",
  getSupabaseAnonKey: () => "anon",
}));
vi.mock("@/src/lib/orgs/memberships", () => ({ getLatestOrgId }));

const { proxy } = await import("@/src/proxy");

const ORG = "11111111-1111-4111-8111-111111111111";
const INVITE = "a".repeat(43);

const signedIn = (last_sign_in_at = new Date().toISOString()) =>
  getUser.mockResolvedValue({ data: { user: { id: "u1", last_sign_in_at } } });
const signedOut = () => getUser.mockResolvedValue({ data: { user: null } });

async function visit(path: string, cookie?: string) {
  const request = new NextRequest(`http://app.test${path}`, {
    headers: cookie ? { cookie } : undefined,
  });
  const response = await proxy(request);
  const location = response.headers.get("location");
  return location ? new URL(location).pathname + new URL(location).search : null;
}

beforeEach(() => {
  vi.clearAllMocks();
  getLatestOrgId.mockResolvedValue(null);
});

describe("proxy: signed out", () => {
  beforeEach(signedOut);

  it.each(["/", "/signin", "/register", "/privacy", "/terms", "/auth/callback", "/join/abc", "/checkin/abc", "/invite/abc", "/invite/abc/start"])(
    "lets a visitor open %s",
    async (path) => {
      expect(await visit(path)).toBeNull();
    }
  );

  it.each(["/consent", "/workspace/new", `/workspace/${ORG}`, `/workspace/${ORG}/members`, `/workspace/${ORG}/officers`, `/workspace/${ORG}/members/join`])(
    "sends a visitor away from %s to sign-in",
    async (path) => {
      expect(await visit(path)).toBe("/signin");
    }
  );
});

describe("proxy: signed in", () => {
  beforeEach(() => signedIn());

  it.each(["/", "/signin", "/register", "/workspace/new"])(
    "sends an officer with an org from %s to the workspace",
    async (path) => {
      getLatestOrgId.mockResolvedValue(ORG);
      expect(await visit(path)).toBe(`/workspace/${ORG}`);
    }
  );

  it.each(["/", "/signin", "/register"])(
    "sends an officer with no org from %s to the create screen",
    async (path) => {
      expect(await visit(path)).toBe("/workspace/new");
    }
  );

  it("lets an officer with no org stay on the create screen", async () => {
    expect(await visit("/workspace/new")).toBeNull();
  });

  it("sends an invitee with no org to their invite, ahead of the create screen", async () => {
    expect(await visit("/workspace/new", `orgkit_pending_invite=${INVITE}`)).toBe(`/invite/${INVITE}`);
  });

  it("doesn't look up the org on other pages", async () => {
    await visit(`/workspace/${ORG}/officers`);
    expect(getLatestOrgId).not.toHaveBeenCalled();
  });

  it("signs out an expired session", async () => {
    signedIn(new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString());
    expect(await visit(`/workspace/${ORG}`)).toBe("/signin?error=session_expired");
    expect(signOut).toHaveBeenCalled();
  });
});
