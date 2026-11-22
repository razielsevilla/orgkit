import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  areDatesOrdered,
  doDateRangesOverlap,
  findOverlappingTerm,
  officerTermInputSchema,
  TERMS_ERROR_MESSAGES,
} from "../../src/lib/terms/terms-validation.ts";

describe("terms-validation: areDatesOrdered", () => {
  it("returns true when end date is after start date", () => {
    assert.equal(areDatesOrdered("2025-06-01", "2026-05-31"), true);
  });

  it("returns true when start date equals end date", () => {
    assert.equal(areDatesOrdered("2025-06-01", "2025-06-01"), true);
  });

  it("returns false when end date is strictly before start date", () => {
    assert.equal(areDatesOrdered("2026-05-31", "2025-06-01"), false);
  });

  it("returns false for invalid date strings", () => {
    assert.equal(areDatesOrdered("invalid", "2026-05-31"), false);
    assert.equal(areDatesOrdered("2025-06-01", "not-a-date"), false);
  });
});

describe("terms-validation: doDateRangesOverlap", () => {
  it("detects overlapping date ranges", () => {
    const range1 = { startDate: "2025-06-01", endDate: "2026-05-31" };
    const range2 = { startDate: "2025-10-01", endDate: "2026-09-30" };
    assert.equal(doDateRangesOverlap(range1, range2), true);
  });

  it("detects completely enclosed date ranges", () => {
    const outer = { startDate: "2025-01-01", endDate: "2025-12-31" };
    const inner = { startDate: "2025-03-01", endDate: "2025-08-31" };
    assert.equal(doDateRangesOverlap(outer, inner), true);
    assert.equal(doDateRangesOverlap(inner, outer), true);
  });

  it("returns false for non-overlapping ranges", () => {
    const past = { startDate: "2024-06-01", endDate: "2025-05-31" };
    const future = { startDate: "2025-06-01", endDate: "2026-05-31" };
    // Notice 2025-05-31 < 2025-06-01
    assert.equal(doDateRangesOverlap(past, future), false);
  });
});

describe("terms-validation: findOverlappingTerm", () => {
  const existing = [
    {
      id: "term-1",
      roleTitle: "President",
      holderName: "Juan Dela Cruz",
      memberId: "11111111-1111-4111-8111-111111111111",
      startDate: "2025-06-01",
      endDate: "2026-05-31",
    },
    {
      id: "term-2",
      roleTitle: "Secretary",
      holderName: "Maria Santos",
      memberId: "22222222-2222-4222-8222-222222222222",
      startDate: "2025-06-01",
      endDate: "2026-05-31",
    },
  ];

  it("finds conflict when same person holds same role in overlapping period", () => {
    const candidate = {
      roleTitle: "President",
      holderName: "Juan Dela Cruz",
      memberId: "11111111-1111-4111-8111-111111111111",
      startDate: "2025-09-01",
      endDate: "2026-08-31",
    };
    const conflict = findOverlappingTerm(existing, candidate);
    assert.ok(conflict);
    assert.equal(conflict?.id, "term-1");
  });

  it("ignores self when updating existing term", () => {
    const candidate = {
      id: "term-1",
      roleTitle: "President",
      holderName: "Juan Dela Cruz",
      memberId: "11111111-1111-4111-8111-111111111111",
      startDate: "2025-06-01",
      endDate: "2026-06-30",
    };
    const conflict = findOverlappingTerm(existing, candidate);
    assert.equal(conflict, null);
  });

  it("matches person by case-insensitive name if memberId is not supplied", () => {
    const candidate = {
      roleTitle: "president",
      holderName: "  juan dela cruz  ",
      startDate: "2025-10-01",
      endDate: "2026-04-30",
    };
    const conflict = findOverlappingTerm(existing, candidate);
    assert.ok(conflict);
    assert.equal(conflict?.id, "term-1");
  });

  it("allows same person to hold a different role concurrently", () => {
    const candidate = {
      roleTitle: "Treasurer",
      holderName: "Juan Dela Cruz",
      memberId: "11111111-1111-4111-8111-111111111111",
      startDate: "2025-06-01",
      endDate: "2026-05-31",
    };
    const conflict = findOverlappingTerm(existing, candidate);
    assert.equal(conflict, null);
  });

  it("allows different person to hold same role concurrently or successively", () => {
    const candidate = {
      roleTitle: "President",
      holderName: "Elena Ramos",
      memberId: "33333333-3333-4333-8333-333333333333",
      startDate: "2025-06-01",
      endDate: "2026-05-31",
    };
    const conflict = findOverlappingTerm(existing, candidate);
    assert.equal(conflict, null);
  });
});

describe("terms-validation: officerTermInputSchema", () => {
  it("parses valid input successfully", () => {
    const valid = {
      termName: "A.Y. 2025-2026",
      roleTitle: "President",
      holderName: "Juan Dela Cruz",
      startDate: "2025-06-01",
      endDate: "2026-05-31",
      memberId: "11111111-1111-4111-8111-111111111111",
    };
    const parsed = officerTermInputSchema.safeParse(valid);
    assert.equal(parsed.success, true);
  });

  it("rejects when end date is before start date", () => {
    const invalid = {
      termName: "A.Y. 2025-2026",
      roleTitle: "President",
      holderName: "Juan Dela Cruz",
      startDate: "2026-06-01",
      endDate: "2025-05-31",
    };
    const parsed = officerTermInputSchema.safeParse(invalid);
    assert.equal(parsed.success, false);
    if (!parsed.success) {
      assert.ok(
        parsed.error.issues.some((issue) => issue.message === TERMS_ERROR_MESSAGES.invalid_dates)
      );
    }
  });

  it("rejects when role title is too short", () => {
    const invalid = {
      termName: "A.Y. 2025-2026",
      roleTitle: "A",
      holderName: "Juan Dela Cruz",
      startDate: "2025-06-01",
      endDate: "2026-05-31",
    };
    const parsed = officerTermInputSchema.safeParse(invalid);
    assert.equal(parsed.success, false);
  });
});
