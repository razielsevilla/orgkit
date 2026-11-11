import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  appendNewById,
  confirmMember,
  deactivateMember,
  editMember,
  isRosterFiltered,
  reactivateMember,
  restoreMember,
  rosterEmptyState,
  undoConfirmMember,
  undoDeactivateMember,
  undoReactivateMember,
  type Roster,
} from "../../src/lib/members/roster-state.ts";

type Member = Roster["members"][number];

const member = (id: string, status: Member["status"]): Member => ({
  id,
  orgId: "org",
  fullName: `Member ${id}`,
  email: `${id}@school.edu`,
  status,
  createdAt: "2026-01-01T00:00:00Z",
});

/** Three on the roster (one pending), two inactive in the org */
function roster(overrides: Partial<Roster> = {}): Roster {
  return {
    members: [member("a", "pending"), member("b", "active"), member("c", "active")],
    totalCount: 3,
    matchingCount: 3,
    hasMore: false,
    pendingCount: 1,
    inactiveCount: 2,
    joinLinkToken: null,
    canImport: true,
    ...overrides,
  };
}

describe("confirming a member", () => {
  it("marks them active and lowers the pending counter", () => {
    const next = confirmMember(roster(), "a");
    assert.equal(next.members[0].status, "active");
    assert.equal(next.pendingCount, 0);
  });

  it("is undone exactly", () => {
    const start = roster();
    assert.deepEqual(undoConfirmMember(confirmMember(start, "a"), "a"), start);
  });

  it("never takes the pending counter below zero", () => {
    assert.equal(confirmMember(roster({ pendingCount: 0 }), "a").pendingCount, 0);
  });

  it("does not change the roster it was given", () => {
    const start = roster();
    confirmMember(start, "a");
    assert.equal(start.members[0].status, "pending");
  });
});

describe("editing a member", () => {
  it("changes the name and email of that member only", () => {
    const next = editMember(roster(), "b", { fullName: "Bea Cruz", email: "bea@school.edu" });
    assert.equal(next.members[1].fullName, "Bea Cruz");
    assert.equal(next.members[1].email, "bea@school.edu");
    assert.equal(next.members[2].fullName, "Member c");
  });

  it("is undone by restoring the original", () => {
    const start = roster();
    const edited = editMember(start, "b", { fullName: "Bea Cruz", email: "bea@school.edu" });
    assert.deepEqual(restoreMember(edited, start.members[1]), start);
  });
});

describe("deactivating a member", () => {
  it("takes an active member out of the list and moves the counters", () => {
    const start = roster();
    const next = deactivateMember(start, start.members[1], false);
    assert.deepEqual(next.members.map((m) => m.id), ["a", "c"]);
    assert.equal(next.totalCount, 2);
    assert.equal(next.matchingCount, 2);
    assert.equal(next.inactiveCount, 3);
    assert.equal(next.pendingCount, 1);
  });

  it("lowers the pending counter for a pending member", () => {
    const start = roster();
    assert.equal(deactivateMember(start, start.members[0], false).pendingCount, 0);
  });

  it("keeps the member, marked inactive, while the inactive tab is open", () => {
    const start = roster();
    const next = deactivateMember(start, start.members[1], true);
    assert.equal(next.members.length, 3);
    assert.equal(next.members[1].status, "inactive");
    assert.equal(next.matchingCount, 3);
  });

  for (const viewingInactive of [false, true]) {
    for (const index of [0, 1, 2]) {
      it(`is undone exactly (inactive tab ${viewingInactive}, row ${index})`, () => {
        const start = roster();
        const target = start.members[index];
        const after = deactivateMember(start, target, viewingInactive);
        assert.deepEqual(undoDeactivateMember(after, target, index, viewingInactive), start);
      });
    }
  }

  it("never takes a counter below zero", () => {
    const start = roster({ totalCount: 0, matchingCount: 0, pendingCount: 0, inactiveCount: 0 });
    const next = deactivateMember(start, start.members[0], false);
    assert.equal(next.totalCount, 0);
    assert.equal(next.matchingCount, 0);
    assert.equal(next.pendingCount, 0);
  });
});

describe("reactivating a member", () => {
  const inactiveRoster = () =>
    roster({
      members: [member("x", "inactive"), member("y", "inactive")],
      totalCount: 0,
      matchingCount: 2,
      pendingCount: 0,
      inactiveCount: 2,
    });

  it("removes them from the inactive tab and moves the counters", () => {
    const next = reactivateMember(inactiveRoster(), "x", true);
    assert.deepEqual(next.members.map((m) => m.id), ["y"]);
    assert.equal(next.totalCount, 1);
    assert.equal(next.inactiveCount, 1);
    assert.equal(next.matchingCount, 1);
  });

  it("turns them active in place on any other tab", () => {
    const start = roster({ members: [member("x", "inactive")], matchingCount: 1 });
    const next = reactivateMember(start, "x", false);
    assert.equal(next.members[0].status, "active");
    assert.equal(next.matchingCount, 1);
  });

  it("is undone on the inactive tab (the member returns to the end of the list)", () => {
    const start = inactiveRoster();
    const after = reactivateMember(start, "x", true);
    const undone = undoReactivateMember(after, start.members[0], true);
    assert.deepEqual(undone.members.map((m) => m.id).sort(), ["x", "y"]);
    assert.equal(undone.totalCount, start.totalCount);
    assert.equal(undone.inactiveCount, start.inactiveCount);
    assert.equal(undone.matchingCount, start.matchingCount);
  });

  it("is undone exactly on any other tab", () => {
    const start = roster({ members: [member("x", "inactive")], matchingCount: 1 });
    const after = reactivateMember(start, "x", false);
    assert.deepEqual(undoReactivateMember(after, start.members[0], false), start);
  });
});

describe("merging lists", () => {
  it("appends only items that are not already held", () => {
    const merged = appendNewById([member("a", "active")], [member("a", "active"), member("b", "active")]);
    assert.deepEqual(merged.map((m) => m.id), ["a", "b"]);
  });
});

describe("what an empty roster shows", () => {
  const view = (r: Roster, statusFilter = "all", searchTerm = "", hasError = false) => ({
    roster: r,
    statusFilter,
    searchTerm,
    hasError,
  });
  const noMembers = roster({ members: [], totalCount: 0, matchingCount: 0, pendingCount: 0, inactiveCount: 0 });
  const onlyInactive = roster({ members: [], totalCount: 0, matchingCount: 0, pendingCount: 0, inactiveCount: 2 });

  it("shows nothing special when there are rows", () => {
    assert.equal(rosterEmptyState(view(roster())), null);
  });

  it("says the org has no members at all", () => {
    assert.equal(rosterEmptyState(view(noMembers)), "no-members");
  });

  it("says everyone is inactive", () => {
    assert.equal(rosterEmptyState(view(onlyInactive)), "no-active-members");
  });

  it("says nobody matches when a search finds no one", () => {
    assert.equal(rosterEmptyState(view(roster({ members: [] }), "all", "zed")), "no-matches");
  });

  it("says nobody matches on a status tab with no rows", () => {
    assert.equal(rosterEmptyState(view(onlyInactive, "pending")), "no-matches");
  });

  it("treats a search of only spaces as no search", () => {
    assert.equal(rosterEmptyState(view(noMembers, "all", "   ")), "no-members");
  });

  it("shows nothing while a load error is on screen", () => {
    assert.equal(rosterEmptyState(view(noMembers, "all", "", true)), null);
  });
});

describe("isRosterFiltered", () => {
  it("is true for a search or a status tab", () => {
    assert.equal(isRosterFiltered("ana", "all"), true);
    assert.equal(isRosterFiltered("", "pending"), true);
  });

  it("is false for neither", () => {
    assert.equal(isRosterFiltered("  ", "all"), false);
  });
});
