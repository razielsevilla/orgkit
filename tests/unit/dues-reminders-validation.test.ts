import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  validateReminderPreviewQuery,
  validateSendReminders,
  validateRetryReminders,
} from "../../src/lib/dues/dues-reminders-validation.ts";

describe("Dues Reminders Validation", () => {
  const validOrgId = "11111111-1111-4111-8111-111111111111";
  const validPeriodId = "22222222-2222-4222-8222-222222222222";
  const validMemberId = "33333333-3333-4333-8333-333333333333";

  describe("validateReminderPreviewQuery", () => {
    it("accepts valid UUIDs for orgId and periodId", () => {
      const res = validateReminderPreviewQuery({
        orgId: validOrgId,
        periodId: validPeriodId,
      });
      assert.equal(res.isValid, true);
      assert.equal(res.data?.orgId, validOrgId);
      assert.equal(res.data?.periodId, validPeriodId);
    });

    it("rejects non-UUID inputs", () => {
      const res = validateReminderPreviewQuery({
        orgId: "not-a-uuid",
        periodId: validPeriodId,
      });
      assert.equal(res.isValid, false);
      assert.ok(res.error?.includes("Invalid organization ID"));
    });
  });

  describe("validateSendReminders", () => {
    it("accepts valid parameters", () => {
      const res = validateSendReminders({
        orgId: validOrgId,
        periodId: validPeriodId,
      });
      assert.equal(res.isValid, true);
      assert.equal(res.data?.orgId, validOrgId);
      assert.equal(res.data?.periodId, validPeriodId);
    });

    it("rejects missing parameters", () => {
      const res = validateSendReminders({});
      assert.equal(res.isValid, false);
    });
  });

  describe("validateRetryReminders", () => {
    it("accepts valid member ID array", () => {
      const res = validateRetryReminders({
        orgId: validOrgId,
        periodId: validPeriodId,
        memberIds: [validMemberId],
      });
      assert.equal(res.isValid, true);
      assert.equal(res.data?.memberIds.length, 1);
    });

    it("rejects empty memberIds array", () => {
      const res = validateRetryReminders({
        orgId: validOrgId,
        periodId: validPeriodId,
        memberIds: [],
      });
      assert.equal(res.isValid, false);
      assert.ok(res.error?.includes("At least one member ID"));
    });

    it("rejects invalid member ID format inside array", () => {
      const res = validateRetryReminders({
        orgId: validOrgId,
        periodId: validPeriodId,
        memberIds: ["invalid-id"],
      });
      assert.equal(res.isValid, false);
      assert.ok(res.error?.includes("Invalid member ID"));
    });
  });
});
