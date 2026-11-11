/**
 * Pure logic for the members roster screen: how the list and its counters
 * change while a save is still in flight (and how to undo that when the save
 * fails), what to show when the list is empty, and how pages are merged. No
 * React and no runtime imports, so the node:test checks can load it directly.
 *
 * Every function returns a new roster and leaves its input alone.
 */
import type { WorkspaceMember, WorkspaceMembersData } from "@/src/app/(workspace)/members-actions";

export type Roster = WorkspaceMembersData;

const atLeastZero = (n: number) => Math.max(0, n);

function mapMember(
  roster: Roster,
  memberId: string,
  change: (member: WorkspaceMember) => WorkspaceMember
): Roster {
  return { ...roster, members: roster.members.map((m) => (m.id === memberId ? change(m) : m)) };
}

function withoutMember(roster: Roster, memberId: string): Roster {
  return { ...roster, members: roster.members.filter((m) => m.id !== memberId) };
}

// ── Confirming a pending member ────────────────────────────────────────────

export function confirmMember(roster: Roster, memberId: string): Roster {
  return {
    ...mapMember(roster, memberId, (m) => ({ ...m, status: "active" })),
    pendingCount: atLeastZero(roster.pendingCount - 1),
  };
}

export function undoConfirmMember(roster: Roster, memberId: string): Roster {
  return {
    ...mapMember(roster, memberId, (m) => ({ ...m, status: "pending" })),
    pendingCount: roster.pendingCount + 1,
  };
}

// ── Editing a member ───────────────────────────────────────────────────────

export function editMember(
  roster: Roster,
  memberId: string,
  updates: { fullName: string; email: string }
): Roster {
  return mapMember(roster, memberId, (m) => ({ ...m, ...updates }));
}

/** Puts a member back exactly as they were */
export function restoreMember(roster: Roster, original: WorkspaceMember): Roster {
  return mapMember(roster, original.id, () => original);
}

// ── Deactivating an active or pending member ───────────────────────────────

/**
 * While the inactive tab is open the member stays in the list, now marked
 * inactive; on any other tab they leave it.
 */
export function deactivateMember(
  roster: Roster,
  member: WorkspaceMember,
  viewingInactive: boolean
): Roster {
  const leaving = member.status === "pending";
  const counted: Roster = {
    ...roster,
    pendingCount: leaving ? atLeastZero(roster.pendingCount - 1) : roster.pendingCount,
    totalCount: atLeastZero(roster.totalCount - 1),
    inactiveCount: roster.inactiveCount + 1,
    matchingCount: viewingInactive ? roster.matchingCount : atLeastZero(roster.matchingCount - 1),
  };

  return viewingInactive
    ? mapMember(counted, member.id, (m) => ({ ...m, status: "inactive" }))
    : withoutMember(counted, member.id);
}

/**
 * Undoes `deactivateMember`. A member who left the list goes back to the
 * position they had (`index`), so the row does not jump.
 */
export function undoDeactivateMember(
  roster: Roster,
  member: WorkspaceMember,
  index: number,
  viewingInactive: boolean
): Roster {
  const counted: Roster = {
    ...roster,
    pendingCount: member.status === "pending" ? roster.pendingCount + 1 : roster.pendingCount,
    totalCount: roster.totalCount + 1,
    inactiveCount: atLeastZero(roster.inactiveCount - 1),
    matchingCount: viewingInactive ? roster.matchingCount : roster.matchingCount + 1,
  };

  const stillListed = roster.members.some((m) => m.id === member.id);
  if (stillListed) return restoreMember(counted, member);

  return {
    ...counted,
    members: [...roster.members.slice(0, index), member, ...roster.members.slice(index)],
  };
}

// ── Reactivating an inactive member ────────────────────────────────────────

/** On the inactive tab the member leaves the list; elsewhere they turn active. */
export function reactivateMember(roster: Roster, memberId: string, viewingInactive: boolean): Roster {
  const counted: Roster = {
    ...roster,
    totalCount: roster.totalCount + 1,
    inactiveCount: atLeastZero(roster.inactiveCount - 1),
    matchingCount: viewingInactive ? atLeastZero(roster.matchingCount - 1) : roster.matchingCount,
  };

  return viewingInactive
    ? withoutMember(counted, memberId)
    : mapMember(counted, memberId, (m) => ({ ...m, status: "active" }));
}

export function undoReactivateMember(
  roster: Roster,
  member: WorkspaceMember,
  viewingInactive: boolean
): Roster {
  const counted: Roster = {
    ...roster,
    totalCount: atLeastZero(roster.totalCount - 1),
    inactiveCount: roster.inactiveCount + 1,
    matchingCount: viewingInactive ? roster.matchingCount + 1 : roster.matchingCount,
  };

  return viewingInactive
    ? { ...counted, members: [...counted.members, member] }
    : mapMember(counted, member.id, (m) => ({ ...m, status: "inactive" }));
}

// ── Merging lists ──────────────────────────────────────────────────────────

/** `previous` followed by the items of `next` it does not already hold. */
export function appendNewById<T extends { id: string }>(previous: readonly T[], next: readonly T[]): T[] {
  const seen = new Set(previous.map((item) => item.id));
  return [...previous, ...next.filter((item) => !seen.has(item.id))];
}

// ── What to show ───────────────────────────────────────────────────────────

export type RosterEmptyState = "no-members" | "no-active-members" | "no-matches";

export interface RosterView {
  roster: Roster;
  statusFilter: string;
  /** The search text, however it is spaced */
  searchTerm: string;
  /** A load failed and its message is on screen */
  hasError: boolean;
}

/** Whether a search or a status tab is narrowing the list */
export function isRosterFiltered(searchTerm: string, statusFilter: string): boolean {
  return searchTerm.trim().length > 0 || statusFilter !== "all";
}

/**
 * Why the list has nothing to show, or null when it has rows (or an error is
 * showing instead): the org has no members at all, only inactive ones, or the
 * search and tab match nobody.
 */
export function rosterEmptyState({
  roster,
  statusFilter,
  searchTerm,
  hasError,
}: RosterView): RosterEmptyState | null {
  if (hasError) return null;

  const filtered = isRosterFiltered(searchTerm, statusFilter);
  const orgHasNoMembers = roster.totalCount === 0 && roster.inactiveCount === 0;
  if (orgHasNoMembers && !filtered) return "no-members";

  if (roster.members.length > 0) return null;

  if (roster.totalCount === 0 && roster.inactiveCount > 0 && !filtered) return "no-active-members";
  if (filtered || roster.inactiveCount > 0) return "no-matches";
  return null;
}
