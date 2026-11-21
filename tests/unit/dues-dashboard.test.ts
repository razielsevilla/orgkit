import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatPeso,
  calculateCollectionRate,
  mapDashboardRpcResponse,
} from "../../src/lib/dues/dues-dashboard.ts";

describe("Dues Dashboard Pure Calculations and Helpers", () => {
  describe("formatPeso", () => {
    it("formats standard amounts with two decimal places and commas", () => {
      assert.equal(formatPeso(250), "₱250.00");
      assert.equal(formatPeso(1234.5), "₱1,234.50");
      assert.equal(formatPeso(100000), "₱100,000.00");
      assert.equal(formatPeso("500.75"), "₱500.75");
    });

    it("supports formatting without decimals when requested", () => {
      assert.equal(formatPeso(250, { showDecimals: false }), "₱250");
      assert.equal(formatPeso(1500, { showDecimals: false }), "₱1,500");
    });

    it("handles zero, null, undefined, empty, and NaN gracefully", () => {
      assert.equal(formatPeso(0), "₱0.00");
      assert.equal(formatPeso(null), "₱0.00");
      assert.equal(formatPeso(undefined), "₱0.00");
      assert.equal(formatPeso(""), "₱0.00");
      assert.equal(formatPeso("invalid"), "₱0.00");
      assert.equal(formatPeso(null, { showDecimals: false }), "₱0");
    });
  });

  describe("calculateCollectionRate", () => {
    it("computes accurate percentage for normal collections", () => {
      assert.equal(calculateCollectionRate(500, 1000), 50);
      assert.equal(calculateCollectionRate(1000, 1000), 100);
      assert.equal(calculateCollectionRate(1, 3), 33);
      assert.equal(calculateCollectionRate(2, 3), 67);
    });

    it("handles zero expected or collected without division by zero or NaN", () => {
      assert.equal(calculateCollectionRate(0, 1000), 0);
      assert.equal(calculateCollectionRate(0, 0), 0);
      assert.equal(calculateCollectionRate(500, 0), 0);
      assert.equal(calculateCollectionRate(null, 500), 0);
      assert.equal(calculateCollectionRate(500, undefined), 0);
    });

    it("clamps at 100 by default but can return unclamped rate", () => {
      assert.equal(calculateCollectionRate(1500, 1000), 100);
      assert.equal(calculateCollectionRate(1500, 1000, false), 150);
    });
  });

  describe("mapDashboardRpcResponse", () => {
    it("maps raw RPC payload into typed DuesDashboardData", () => {
      const raw = {
        period: {
          id: "period-1",
          org_id: "org-1",
          name: "1st Sem Dues",
          amount: "250.00",
          due_on: "2026-12-15",
          status: "open",
          pay_token: "token-1",
          pay_link_active: true,
        },
        summary: {
          collected_amount: "500.00",
          expected_amount: "1000.00",
          outstanding_amount: "500.00",
          paid_count: 2,
          pending_count: 1,
          rejected_count: 0,
          unpaid_count: 1,
          active_member_count: 4,
          total_member_count: 4,
        },
        members: [
          {
            member_id: "m-1",
            full_name: "Alice",
            email: "alice@test.edu",
            member_status: "active",
            dues_status: "paid",
            payment_id: "pay-1",
            amount: "250.00",
            reference_no: "REF123",
            payment_status: "verified",
            reject_reason: null,
            submitted_at: "2026-11-01T00:00:00Z",
            reviewed_at: "2026-11-02T00:00:00Z",
          },
        ],
        pagination: {
          page: 1,
          page_size: 20,
          total_matching: 1,
          total_pages: 1,
        },
      };

      const result = mapDashboardRpcResponse(raw);
      assert.equal(result.period.id, "period-1");
      assert.equal(result.period.amount, 250);
      assert.equal(result.summary.collectedAmount, 500);
      assert.equal(result.summary.expectedAmount, 1000);
      assert.equal(result.members.length, 1);
      assert.equal(result.members[0].fullName, "Alice");
      assert.equal(result.members[0].amount, 250);
      assert.equal(result.pagination.totalMatching, 1);
    });

    it("handles empty or missing members array safely", () => {
      const raw = {
        period: { id: "p-empty", name: "Empty" },
        summary: {},
        members: null,
        pagination: {},
      };

      const result = mapDashboardRpcResponse(raw);
      assert.deepEqual(result.members, []);
      assert.equal(result.summary.collectedAmount, 0);
      assert.equal(result.pagination.page, 1);
      assert.equal(result.pagination.totalMatching, 0);
    });

    it("throws when passed invalid non-object payload", () => {
      assert.throws(() => mapDashboardRpcResponse(null), /Invalid dashboard RPC response/);
      assert.throws(() => mapDashboardRpcResponse("string"), /Invalid dashboard RPC response/);
    });
  });
});
