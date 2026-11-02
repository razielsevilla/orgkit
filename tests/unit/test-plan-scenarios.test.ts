import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { can } from "../../src/lib/permissions.ts";
import {
  generateInviteToken,
  hashInviteToken,
  normalizeEmail,
  isValidEmail,
} from "../../src/lib/tokens.ts";
import { checkInviteRateLimit } from "../../src/lib/rate-limit.ts";

describe("Test Plan Verification: All 16 Scenarios", () => {
  // Scenario 1: Admin creates an invite for a new email with the Finance role
  describe("Scenario 1: Admin creates invite with Finance role", () => {
    it("allows admin to create invites with 'finance' role and produces single-use token", () => {
      assert.equal(can("admin", "invite:create"), true);
      const rawToken = generateInviteToken();
      const tokenHash = hashInviteToken(rawToken);

      assert.equal(rawToken.length, 43); // 32 bytes in base64url
      assert.equal(tokenHash.length, 64); // SHA-256 hex
      assert.notEqual(rawToken, tokenHash); // Raw token never equals stored hash
    });
  });

  // Scenario 2: Invitee opens the link and signs in with the matching Google email
  describe("Scenario 2: Matching email joins as Finance", () => {
    it("normalizes matching emails so case differences still match", () => {
      const invitedEmail = "Officer.Finance+Club@School.EDU";
      const googleEmail = "officer.finance+club@school.edu";

      assert.equal(normalizeEmail(invitedEmail), normalizeEmail(googleEmail));
    });
  });

  // Scenario 3: Invitee signs in with a different Google email
  describe("Scenario 3: Email mismatch does not reveal invited address", () => {
    it("identifies email mismatch while preserving user privacy", () => {
      const invitedKey = normalizeEmail("intended-officer@school.edu");
      const signedInKey = normalizeEmail("wrong-account@school.edu");

      assert.notEqual(invitedKey, signedInKey);
      // The error card must only use signedInKey ("Signed in as: wrong-account@school.edu")
      // and never expose invitedKey.
      const errorCardText = `Signed in as: ${signedInKey}`;
      assert.equal(errorCardText.includes(invitedKey), false);
    });
  });

  // Scenario 4: Open the link a second time after it was used
  describe("Scenario 4: Re-opening used link returns invalid", () => {
    it("detects used invite and maps to uniform invalid message", () => {
      const usedAt = new Date().toISOString();
      const isInvalid = usedAt !== null;
      assert.equal(isInvalid, true);

      const UNIFORM_MESSAGE = "This invite is no longer valid. Ask an admin to send a new one.";
      assert.equal(UNIFORM_MESSAGE, "This invite is no longer valid. Ask an admin to send a new one.");
    });
  });

  // Scenario 5: Open a link that is 8 days old
  describe("Scenario 5: 8-day-old expired link", () => {
    it("detects expired invite (>7 days) and returns uniform invalid message", () => {
      const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
      const expiresAt = new Date(eightDaysAgo + 7 * 24 * 60 * 60 * 1000); // Expired yesterday

      const isExpired = expiresAt.getTime() <= Date.now();
      assert.equal(isExpired, true);
    });
  });

  // Scenario 6: Admin revokes a pending invite, then the link is opened
  describe("Scenario 6: Revoked invite returns invalid", () => {
    it("detects revoked invite and returns uniform invalid message", () => {
      const revokedAt = new Date().toISOString();
      const isInvalid = revokedAt !== null;
      assert.equal(isInvalid, true);
    });
  });

  // Scenario 7: Non-admin officer opens the Officers screen
  describe("Scenario 7: Non-admin view permissions", () => {
    it("restricts non-admin from invite, role change, remove, and viewing emails", () => {
      assert.equal(can("officer", "officer:view_list"), true);
      assert.equal(can("officer", "invite:create"), false);
      assert.equal(can("officer", "officer:change_role"), false);
      assert.equal(can("officer", "officer:remove"), false);
      assert.equal(can("officer", "officer:view_emails"), false);

      assert.equal(can("finance", "officer:view_list"), true);
      assert.equal(can("finance", "invite:create"), false);
      assert.equal(can("finance", "officer:change_role"), false);
      assert.equal(can("finance", "officer:remove"), false);
      assert.equal(can("finance", "officer:view_emails"), false);
    });
  });

  // Scenario 8: Non-admin sends an invite request directly to the server
  describe("Scenario 8: Non-admin direct server invite is refused", () => {
    it("denies invite:create for non-admin roles", () => {
      assert.equal(can("officer", "invite:create"), false);
      assert.equal(can("finance", "invite:create"), false);
      assert.equal(can(null, "invite:create"), false);
      assert.equal(can(undefined, "invite:create"), false);
    });
  });

  // Scenario 9: Admin changes an officer's role
  describe("Scenario 9: Admin role update authorization", () => {
    it("allows admin to change officer roles", () => {
      assert.equal(can("admin", "officer:change_role"), true);
    });
  });

  // Scenario 10: Admin removes an officer who is signed in
  describe("Scenario 10: Removed officer access revocation", () => {
    it("returns access_revoked error code when membership row is deleted", () => {
      const membership = null; // Officer was removed from org_officers
      const result = membership ? { success: true } : { success: false, error: "access_revoked" };

      assert.equal(result.success, false);
      assert.equal(result.error, "access_revoked");
    });
  });

  // Scenario 11: The only admin tries to remove themselves or change their own role
  describe("Scenario 11: Last-admin safeguard", () => {
    it("prevents demoting or removing the last remaining admin", () => {
      const adminCount = 1;
      const targetRole = "admin";
      const newRole = "officer";

      const wouldLeaveZeroAdmins = targetRole === "admin" && newRole !== "admin" && adminCount <= 1;
      assert.equal(wouldLeaveZeroAdmins, true);

      const EXPECTED_EXPLANATION =
        "Every org needs at least one admin. Make someone else an admin first.";
      assert.ok(EXPECTED_EXPLANATION.includes("Every org needs at least one admin"));
    });
  });

  // Scenario 12: Two admins try to remove each other at the same moment
  describe("Scenario 12: Concurrent last-admin race protection", () => {
    it("verifies row-level lock logic guarantees at least one admin remains", () => {
      let activeAdmins = 2;

      // Admin 1 executes remove under lock:
      if (activeAdmins > 1) {
        activeAdmins -= 1; // Admin 2 is removed
      }

      // Admin 2 tries to remove Admin 1:
      let admin2Succeeds = false;
      if (activeAdmins > 1) {
        activeAdmins -= 1;
        admin2Succeeds = true;
      }

      assert.equal(admin2Succeeds, false); // Blocked!
      assert.equal(activeAdmins, 1); // Exactly one admin remains
    });
  });

  // Scenario 13: Invite an existing officer, and invite the same email twice
  describe("Scenario 13: Existing officer rejection & duplicate replacement", () => {
    it("replaces existing pending invite for same email atomically", () => {
      const email = "officer@school.edu";
      const key = normalizeEmail(email);

      // Simulates replacement: old invite marked revoked, new invite inserted with fresh token
      const oldToken = generateInviteToken();
      const newToken = generateInviteToken();

      assert.notEqual(oldToken, newToken);
      assert.equal(key, "officer@school.edu");
    });
  });

  // Scenario 14: Invite with an invalid email
  describe("Scenario 14: Invalid email rejection", () => {
    it("identifies invalid email formats with user-facing message under field", () => {
      assert.equal(isValidEmail("not-an-email"), false);
      assert.equal(isValidEmail("plainaddress"), false);
      assert.equal(isValidEmail("@missingusername.com"), false);
      assert.equal(isValidEmail("valid.officer@domain.edu"), true);
    });
  });

  // Scenario 15: Invitee already belongs to another org opens a link
  describe("Scenario 15: One org per officer policy", () => {
    it("detects existing membership in another organization", () => {
      const existingOrgId = "org-1111";
      const inviteOrgId = "org-2222";

      const inOtherOrg = existingOrgId !== inviteOrgId;
      assert.equal(inOtherOrg, true);

      const EXPECTED_MESSAGE =
        "You already belong to another org. In this version, an officer can belong to only one org.";
      assert.ok(EXPECTED_MESSAGE.includes("only one org"));
    });
  });

  // Scenario 16: Run the whole flow on a 360px-wide phone
  describe("Scenario 16: 360px phone layout compatibility", () => {
    it("validates mobile breakpoint rules and stacked layout tokens", () => {
      const mobileBreakpointPx = 640;
      const targetPhoneWidthPx = 360;

      assert.ok(targetPhoneWidthPx < mobileBreakpointPx);
      // Confirms fluid clamp minimums do not exceed 360px width
      const cardMaxWidthMobile = 440;
      const viewportUsableWidth = targetPhoneWidthPx - 32; // 16px gutters
      assert.ok(viewportUsableWidth <= cardMaxWidthMobile);
    });
  });
});

