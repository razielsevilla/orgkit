import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { normalizeEmail } from "../../src/lib/tokens.ts";
import { can } from "../../src/lib/permissions.ts";

const createInviteSchema = z.object({
  orgId: z.string().uuid("Invalid organization ID."),
  email: z
    .string()
    .trim()
    .min(1, "Email is required.")
    .email("Enter a valid email address.")
    .transform(normalizeEmail),
  role: z.enum(["admin", "finance", "officer"], {
    message: "Select a valid role.",
  }),
});

describe("Phase 4: Invite Validation Schema", () => {
  const validOrgId = "12345678-1234-4234-8234-1234567890ab";

  it("accepts valid inputs and normalizes email", () => {
    const result = createInviteSchema.safeParse({
      orgId: validOrgId,
      email: "  Officer.Finance+Tag@School.EDU  ",
      role: "finance",
    });

    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.email, "officer.finance+tag@school.edu");
      assert.equal(result.data.role, "finance");
      assert.equal(result.data.orgId, validOrgId);
    }
  });

  it("rejects malformed email addresses", () => {
    const result = createInviteSchema.safeParse({
      orgId: validOrgId,
      email: "not-an-email",
      role: "admin",
    });

    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.error.issues[0]?.message, "Enter a valid email address.");
    }
  });

  it("rejects empty email addresses", () => {
    const result = createInviteSchema.safeParse({
      orgId: validOrgId,
      email: "   ",
      role: "officer",
    });

    assert.equal(result.success, false);
    if (!result.success) {
      assert.ok(result.error.issues.length > 0);
    }
  });

  it("rejects invalid roles", () => {
    const result = createInviteSchema.safeParse({
      orgId: validOrgId,
      email: "test@school.edu",
      role: "owner",
    });

    assert.equal(result.success, false);
  });

  it("rejects invalid UUIDs for orgId", () => {
    const result = createInviteSchema.safeParse({
      orgId: "not-a-uuid",
      email: "test@school.edu",
      role: "officer",
    });

    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.error.issues[0]?.message, "Invalid organization ID.");
    }
  });
});

describe("Phase 4: Permission Guards in Server Actions", () => {
  it("only allows admins to perform create, revoke, change_role, and remove", () => {
    const roles = ["admin", "finance", "officer"] as const;

    for (const role of roles) {
      const isAdmin = role === "admin";
      assert.equal(can(role, "invite:create"), isAdmin);
      assert.equal(can(role, "invite:revoke"), isAdmin);
      assert.equal(can(role, "officer:change_role"), isAdmin);
      assert.equal(can(role, "officer:remove"), isAdmin);
      assert.equal(can(role, "officer:view_emails"), isAdmin);
    }
  });
});

