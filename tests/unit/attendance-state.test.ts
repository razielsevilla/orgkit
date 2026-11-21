import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  addRecord,
  isPresent,
  mergePolled,
  presentLabel,
  removeRecord,
  sortRecords,
  undoAdd,
  undoRemove,
  type AttendanceData,
  type AttendanceRecord,
} from "../../src/lib/events/attendance-state.ts";

const rec = (id: string, minute: number, method: "qr" | "manual" = "qr"): AttendanceRecord => ({
  memberId: id,
  fullName: `Member ${id}`,
  method,
  checkedInAt: new Date(Date.UTC(2030, 4, 1, 10, minute)).toISOString(),
});

const data = (records: AttendanceRecord[], activeCount = 10): AttendanceData => ({ records, activeCount });
const ids = (d: AttendanceData) => d.records.map((r) => r.memberId);

describe("presentLabel", () => {
  it("reads 'N of M present'", () => {
    assert.equal(presentLabel(23, 85), "23 of 85 present");
    assert.equal(presentLabel(0, 0), "0 of 0 present");
  });
});

describe("sortRecords", () => {
  it("puts the newest check-in first and breaks ties by member", () => {
    const sorted = sortRecords([rec("b", 5), rec("a", 5), rec("c", 9), rec("d", 1)]);
    assert.deepEqual(sorted.map((r) => r.memberId), ["c", "a", "b", "d"]);
  });
});

describe("addRecord and undoAdd", () => {
  it("adds a member at the top, and undo restores the list", () => {
    const start = data([rec("b", 2), rec("a", 1)]);
    const added = addRecord(start, rec("c", 3, "manual"));
    assert.deepEqual(ids(added), ["c", "b", "a"]);
    assert.deepEqual(undoAdd(added, "c"), start);
  });

  it("never adds a member twice", () => {
    const start = data([rec("a", 1)]);
    assert.equal(addRecord(start, rec("a", 9, "manual")), start);
  });
});

describe("removeRecord and undoRemove", () => {
  it("removes a member and the undo puts the row back where it was", () => {
    const start = data([rec("c", 3), rec("b", 2), rec("a", 1)]);
    const index = start.records.findIndex((r) => r.memberId === "b");
    const removed = removeRecord(start, "b");
    assert.deepEqual(ids(removed), ["c", "a"]);
    assert.deepEqual(undoRemove(removed, start.records[index], index), start);
  });

  it("removing someone who isn't there changes nothing", () => {
    const start = data([rec("a", 1)]);
    assert.equal(removeRecord(start, "zzz"), start);
  });

  it("an undo does not duplicate a row a poll already brought back", () => {
    const start = data([rec("a", 1)]);
    assert.equal(undoRemove(start, rec("a", 1), 0), start);
  });

  it("clamps an index that is now out of range", () => {
    const out = undoRemove(data([rec("a", 1)]), rec("z", 0), 99);
    assert.deepEqual(ids(out), ["a", "z"]);
  });
});

describe("mergePolled", () => {
  it("takes the server's list and count when nothing is in flight", () => {
    const current = data([rec("a", 1)], 5);
    const polled = data([rec("b", 2), rec("a", 1)], 6);
    const merged = mergePolled(current, polled, new Set());
    assert.deepEqual(ids(merged), ["b", "a"]);
    assert.equal(merged.activeCount, 6);
  });

  it("drops a member who was removed elsewhere", () => {
    const merged = mergePolled(data([rec("a", 1), rec("b", 2)]), data([rec("a", 1)]), new Set());
    assert.deepEqual(ids(merged), ["a"]);
  });

  it("keeps the screen's version of a member whose change is still in flight", () => {
    // Optimistic add of "n" that the poll doesn't know about yet; optimistic removal of "a" the poll still has
    const current = data([rec("n", 5, "manual"), rec("b", 2)]);
    const polled = data([rec("b", 2), rec("a", 1)]);
    const merged = mergePolled(current, polled, new Set(["n", "a"]));
    assert.deepEqual(ids(merged), ["n", "b"]);
  });

  it("does not mutate its inputs", () => {
    const current = data([rec("a", 1)]);
    const polled = data([rec("b", 2)]);
    mergePolled(current, polled, new Set(["a"]));
    assert.deepEqual(ids(current), ["a"]);
    assert.deepEqual(ids(polled), ["b"]);
  });
});

describe("isPresent", () => {
  it("finds a member by id", () => {
    const d = data([rec("a", 1)]);
    assert.equal(isPresent(d, "a"), true);
    assert.equal(isPresent(d, "b"), false);
  });
});
