import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { can, isOfficerRole, ROLE_DETAILS } from "../../src/lib/permissions.ts";
import {
  generateInviteToken,
  hashInviteToken,
  normalizeEmail,
  isValidEmail,
} from "../../src/lib/tokens.ts";

describe("Permissions Matrix (can)", () => {
  it("allows admin to perform all privileged actions", () => {
    assert.equal(can("admin", "invite:create"), true);
    assert.equal(can("admin", "invite:revoke"), true);
    assert.equal(can("admin", "invite:recreate"), true);
    assert.equal(can("admin", "officer:change_role"), true);
    assert.equal(can("admin", "officer:remove"), true);
    assert.equal(can("admin", "officer:view_emails"), true);
    assert.equal(can("admin", "officer:view_list"), true);
    assert.equal(can("admin", "workspace:manage"), true);
  });

  it("restricts finance officers to viewing the roster only", () => {
    assert.equal(can("finance", "officer:view_list"), true);
    assert.equal(can("finance", "invite:create"), false);
    assert.equal(can("finance", "invite:revoke"), false);
    assert.equal(can("finance", "officer:change_role"), false);
    assert.equal(can("finance", "officer:remove"), false);
    assert.equal(can("finance", "officer:view_emails"), false);
  });

  it("restricts regular officers to viewing the roster only", () => {
    assert.equal(can("officer", "officer:view_list"), true);
    assert.equal(can("officer", "invite:create"), false);
    assert.equal(can("officer", "invite:revoke"), false);
    assert.equal(can("officer", "officer:change_role"), false);
    assert.equal(can("officer", "officer:remove"), false);
    assert.equal(can("officer", "officer:view_emails"), false);
  });

  it("denies all actions if role is null or invalid", () => {
    assert.equal(can(null, "invite:create"), false);
    assert.equal(can(undefined, "officer:view_list"), false);
    assert.equal(can("guest", "officer:view_list"), false);
  });

  it("correctly identifies valid and invalid roles", () => {
    assert.equal(isOfficerRole("admin"), true);
    assert.equal(isOfficerRole("finance"), true);
    assert.equal(isOfficerRole("officer"), true);
    assert.equal(isOfficerRole("owner"), false);
    assert.equal(isOfficerRole(""), false);
  });

  it("has descriptions for each role", () => {
    assert.ok(ROLE_DETAILS.admin.label);
    assert.ok(ROLE_DETAILS.finance.label);
    assert.ok(ROLE_DETAILS.officer.label);
  });
});

describe("Token & Email Utilities", () => {
  it("generates 32-byte base64url tokens", () => {
    const token = generateInviteToken();
    assert.ok(token);
    assert.match(token, /^[A-Za-z0-9_-]+$/);
    // 32 bytes in base64url is 43 characters
    assert.equal(token.length, 43);
  });

  it("hashes tokens with SHA-256 to 64 hex characters", () => {
    const token = "my-test-token-value";
    const hash1 = hashInviteToken(token);
    const hash2 = hashInviteToken(token);
    assert.equal(hash1, hash2);
    assert.equal(hash1.length, 64);
    assert.match(hash1, /^[0-9a-f]{64}$/);
  });

  it("normalizes email addresses: trim and lowercase, preserving dots and plus signs", () => {
    assert.equal(normalizeEmail("  User.Name+Tag@Domain.COM  "), "user.name+tag@domain.com");
    assert.equal(normalizeEmail("Officer@School.EDU"), "officer@school.edu");
    // Decision explicitly says: do not strip dots or plus parts
    assert.ok(normalizeEmail("test.dots+plus@org.com").includes("."));
    assert.ok(normalizeEmail("test.dots+plus@org.com").includes("+"));
  });

  it("validates email formats", () => {
    assert.equal(isValidEmail("officer@school.edu"), true);
    assert.equal(isValidEmail("officer+tag@school.edu"), true);
    assert.equal(isValidEmail("not-an-email"), false);
    assert.equal(isValidEmail(""), false);
  });
});

