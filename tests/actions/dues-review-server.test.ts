import { afterEach, describe, expect, it, vi } from "vitest";

const state: { adminThrows: boolean } = { adminThrows: true };

vi.mock("@/src/lib/supabase/service-role", () => ({
  createAdminClient: () => {
    if (state.adminThrows) throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing. Check your .env.local.");
    return {
      storage: {
        from: () => ({
          createSignedUrl: async () => ({ data: { signedUrl: "https://signed.example/x" }, error: null }),
        }),
      },
    };
  },
}));

const { createScreenshotSignedUrl } = await import("@/src/lib/dues/dues-review-server");

/** A caller client whose storage read is refused, so the admin fallback is tried */
const refusedCaller = {
  storage: {
    from: () => ({
      createSignedUrl: async () => ({ data: null, error: { message: "not allowed by policy" } }),
    }),
  },
} as never;

afterEach(() => {
  vi.restoreAllMocks();
  state.adminThrows = true;
});

describe("createScreenshotSignedUrl fallback", () => {
  it("logs why the admin fallback failed and still returns the original failure, without throwing", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await createScreenshotSignedUrl(refusedCaller, "dues-screenshots/org/file.png");

    expect(res.signedUrl).toBeNull();
    expect(res.error?.message).toBe("not allowed by policy");
    expect(spy).toHaveBeenCalledTimes(1);
    const entry = JSON.parse(String(spy.mock.calls[0][0]));
    expect(entry).toMatchObject({
      level: "error",
      event: "dues_review.signed_url_fallback_failed",
      context: { error: { name: "Error" } },
    });
  });

  it("uses the admin client when the caller's client is refused and the admin client works", async () => {
    state.adminThrows = false;
    const res = await createScreenshotSignedUrl(refusedCaller, "file.png");
    expect(res).toEqual({ signedUrl: "https://signed.example/x", error: null });
  });
});
