import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { User } from "@supabase/supabase-js";
import { getFullName, getGoogleSub } from "../../src/lib/auth/google-sub.ts";

/**
 * getGoogleSub is the heart of "match an officer by Google's permanent account ID,
 * never by email": the sign-in callback and the consent screen both rely on it. An
 * email can change or be reused; the sub cannot.
 */

/** A user shaped like Supabase's, with only the parts these functions read */
const user = (fields: Record<string, unknown>): User => fields as unknown as User;

const googleIdentity = (sub: unknown) => ({ provider: "google", identity_data: { sub } });

describe("getGoogleSub: where the ID comes from", () => {
  it("reads it from user_metadata.sub", () => {
    assert.equal(getGoogleSub(user({ user_metadata: { sub: "from-metadata" } })), "from-metadata");
  });

  it("reads it from the Google identity when metadata has none", () => {
    assert.equal(
      getGoogleSub(user({ user_metadata: {}, identities: [googleIdentity("from-identity")] })),
      "from-identity"
    );
  });

  it("reads it from user_metadata.provider_id as a last resort", () => {
    assert.equal(
      getGoogleSub(user({ user_metadata: { provider_id: "from-provider-id" }, identities: [] })),
      "from-provider-id"
    );
  });
});

describe("getGoogleSub: the order of the sources", () => {
  const all = {
    user_metadata: { sub: "metadata-sub", provider_id: "provider-id" },
    identities: [googleIdentity("identity-sub")],
  };

  it("prefers user_metadata.sub over the identity and the provider id", () => {
    assert.equal(getGoogleSub(user(all)), "metadata-sub");
  });

  it("prefers the identity over the provider id when metadata has no sub", () => {
    assert.equal(
      getGoogleSub(user({ ...all, user_metadata: { provider_id: "provider-id" } })),
      "identity-sub"
    );
  });

  it("falls through an empty value to the next source", () => {
    assert.equal(getGoogleSub(user({ ...all, user_metadata: { sub: "", provider_id: "provider-id" } })), "identity-sub");
    assert.equal(
      getGoogleSub(user({ user_metadata: { sub: "", provider_id: "provider-id" }, identities: [googleIdentity("")] })),
      "provider-id"
    );
  });
});

describe("getGoogleSub: only a Google identity counts", () => {
  it("ignores an identity from another provider", () => {
    assert.equal(
      getGoogleSub(
        user({
          user_metadata: {},
          identities: [{ provider: "github", identity_data: { sub: "github-user-1" } }],
        })
      ),
      null
    );
  });

  it("picks the Google identity out of several", () => {
    assert.equal(
      getGoogleSub(
        user({
          user_metadata: {},
          identities: [
            { provider: "github", identity_data: { sub: "github-user-1" } },
            { provider: "email", identity_data: { sub: "email-user-1" } },
            googleIdentity("the-google-one"),
          ],
        })
      ),
      "the-google-one"
    );
  });

  it("ignores a Google identity that has no sub", () => {
    assert.equal(getGoogleSub(user({ user_metadata: {}, identities: [{ provider: "google" }] })), null);
    assert.equal(getGoogleSub(user({ user_metadata: {}, identities: [{ provider: "google", identity_data: {} }] })), null);
  });
});

describe("getGoogleSub: never the email", () => {
  it("returns null for a user that has an email but no Google ID", () => {
    assert.equal(getGoogleSub(user({ email: "someone@school.edu", user_metadata: {}, identities: [] })), null);
  });

  it("does not use any email field as an ID, in any shape", () => {
    assert.equal(
      getGoogleSub(
        user({
          email: "a@school.edu",
          user_metadata: { email: "b@school.edu" },
          identities: [{ provider: "google", identity_data: { email: "c@school.edu" } }],
        })
      ),
      null
    );
  });
});

describe("getGoogleSub: values that are not a usable ID", () => {
  it("returns null when there is nothing at all", () => {
    assert.equal(getGoogleSub(user({})), null);
    assert.equal(getGoogleSub(user({ user_metadata: {}, identities: [] })), null);
    assert.equal(getGoogleSub(user({ user_metadata: undefined, identities: undefined })), null);
  });

  it("returns null for an empty string", () => {
    assert.equal(getGoogleSub(user({ user_metadata: { sub: "" } })), null);
  });

  it("never returns a non-string", () => {
    for (const bad of [123, {}, [], true]) {
      const result = getGoogleSub(user({ user_metadata: { sub: bad } }));
      assert.equal(typeof result === "string" || result === null, true);
      assert.equal(result, null);
    }
  });
});

describe("getFullName", () => {
  it("prefers full_name", () => {
    assert.equal(getFullName(user({ user_metadata: { full_name: "Ana Reyes", name: "Ana" } })), "Ana Reyes");
  });

  it("falls back to name", () => {
    assert.equal(getFullName(user({ user_metadata: { name: "Ana" } })), "Ana");
    assert.equal(getFullName(user({ user_metadata: { full_name: "", name: "Ana" } })), "Ana");
  });

  it("is an empty string when the account has no name, never undefined", () => {
    assert.equal(getFullName(user({ user_metadata: {} })), "");
    assert.equal(getFullName(user({})), "");
  });

  it("does not take a name from the email", () => {
    assert.equal(getFullName(user({ email: "ana.reyes@school.edu", user_metadata: {} })), "");
  });
});
