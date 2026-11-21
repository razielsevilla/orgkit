import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { acceptInvite } from "../../src/lib/invites/invite-accept.ts";

// A fake client that answers accept_invite with whatever the test supplies
function clientAnswering(result: { data: unknown; error: unknown }) {
  const calls: { fn: string; args: unknown }[] = [];
  const client = {
    rpc: async (fn: string, args: unknown) => {
      calls.push({ fn, args });
      return result;
    },
  };
  return { client: client as never, calls };
}

describe("acceptInvite", () => {
  it("sends only the token hash to accept_invite", async () => {
    const { client, calls } = clientAnswering({ data: { status: "success", org_id: "org-1" }, error: null });
    await acceptInvite(client, "hash-1");
    assert.deepEqual(calls, [{ fn: "accept_invite", args: { p_token_hash: "hash-1" } }]);
  });

  it("treats success and already_member as joined", async () => {
    for (const status of ["success", "already_member"]) {
      const { client } = clientAnswering({ data: { status, org_id: "org-1" }, error: null });
      assert.deepEqual(await acceptInvite(client, "h"), { kind: "joined", orgId: "org-1" });
    }
  });

  it("does not treat a join with no org ID as joined", async () => {
    const { client } = clientAnswering({ data: { status: "success" }, error: null });
    assert.deepEqual(await acceptInvite(client, "h"), { kind: "invalid" });
  });

  it("reports an email mismatch and an officer already in another org", async () => {
    const mismatch = clientAnswering({ data: { status: "email_mismatch" }, error: null });
    assert.deepEqual(await acceptInvite(mismatch.client, "h"), { kind: "email_mismatch" });

    const other = clientAnswering({ data: { status: "in_other_org" }, error: null });
    assert.deepEqual(await acceptInvite(other.client, "h"), { kind: "in_other_org" });
  });

  it("gives one invalid answer for every other status, an empty answer or an error", async () => {
    const answers = [
      { data: { status: "invalid" }, error: null },
      { data: { status: "expired" }, error: null },
      { data: null, error: null },
      { data: null, error: { message: "boom" } },
    ];
    const log = console.error;
    console.error = () => {};
    try {
      for (const answer of answers) {
        const { client } = clientAnswering(answer);
        assert.deepEqual(await acceptInvite(client, "h"), { kind: "invalid" });
      }
    } finally {
      console.error = log;
    }
  });
});
