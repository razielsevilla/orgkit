import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeLimit, normalizeOffset, pageCount, pageNumbers } from "../../src/lib/pagination.ts";

describe("pageCount", () => {
  it("rounds up", () => {
    assert.equal(pageCount(120, 20), 6);
    assert.equal(pageCount(121, 20), 7);
    assert.equal(pageCount(1, 20), 1);
  });

  it("counts an empty list as one page", () => {
    assert.equal(pageCount(0, 20), 1);
  });
});

describe("pageNumbers", () => {
  it("lists every page when there are few", () => {
    assert.deepEqual(pageNumbers(1, 1), [1]);
    assert.deepEqual(pageNumbers(2, 3), [1, 2, 3]);
  });

  it("skips pages with a gap, keeping the first, last and neighbours of the current page", () => {
    assert.deepEqual(pageNumbers(6, 12), [1, "gap", 5, 6, 7, "gap", 12]);
  });

  it("shows a lone skipped page instead of a gap", () => {
    assert.deepEqual(pageNumbers(4, 8), [1, 2, 3, 4, 5, "gap", 8]);
  });

  it("has no gap at the start or the end", () => {
    assert.deepEqual(pageNumbers(1, 10), [1, 2, "gap", 10]);
    assert.deepEqual(pageNumbers(10, 10), [1, "gap", 9, 10]);
  });
});

describe("normalizeOffset and normalizeLimit", () => {
  it("replace anything unusable", () => {
    assert.equal(normalizeOffset(undefined), 0);
    assert.equal(normalizeOffset(-5), 0);
    assert.equal(normalizeOffset(Number.NaN), 0);
    assert.equal(normalizeOffset(40.9), 40);
    assert.equal(normalizeLimit(undefined, 20, 100), 20);
    assert.equal(normalizeLimit(0, 20, 100), 1);
    assert.equal(normalizeLimit(500, 20, 100), 100);
  });
});
