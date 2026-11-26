import type { WorkspaceMember, WorkspaceMembersData } from "@/src/app/(workspace)/members-actions";

/**
 * Example roster for the officer tour. Made-up people, `example.edu` addresses,
 * nothing real. Counts follow the real ones: `totalCount` is active plus pending
 * (inactive members are hidden from the default list), and the list is what the
 * default "all" view would show.
 */

const day = 24 * 60 * 60 * 1000;

function person(n: number, fullName: string, status: WorkspaceMember["status"], daysAgo: number): WorkspaceMember {
  const slug = fullName.toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "");
  const joined = new Date(Date.now() - daysAgo * day).toISOString();
  return {
    id: `00000000-0000-4000-8000-0000000000${String(n).padStart(2, "0")}`,
    orgId: "demo",
    fullName,
    email: `${slug}@example.edu`,
    status,
    createdAt: joined,
    updatedAt: joined,
  };
}

/** Two students waiting to be confirmed, so Confirm is on screen, then active members */
export const DEMO_MEMBER_LIST: WorkspaceMember[] = [
  person(1, "Maria Clara Reyes", "pending", 1),
  person(2, "Joaquin Dela Cruz", "pending", 3),
  person(3, "Angelica Santos", "active", 12),
  person(4, "Miguel Villanueva", "active", 14),
  person(5, "Bianca Lim", "active", 20),
  person(6, "Rafael Mendoza", "active", 21),
  person(7, "Katrina Bautista", "active", 28),
  person(8, "Paolo Garcia", "active", 35),
  person(9, "Isabel Navarro", "active", 41),
  person(10, "Gabriel Ramos", "active", 55),
];

/** The example roster, keeping the real org's own permissions (what an officer may do stays true to them) */
export function demoMembersData(real: Pick<WorkspaceMembersData, "canImport" | "joinLinkToken">): WorkspaceMembersData {
  return {
    members: DEMO_MEMBER_LIST,
    totalCount: DEMO_MEMBER_LIST.length,
    matchingCount: DEMO_MEMBER_LIST.length,
    hasMore: false,
    pendingCount: DEMO_MEMBER_LIST.filter((m) => m.status === "pending").length,
    inactiveCount: 2,
    joinLinkToken: real.joinLinkToken,
    canImport: real.canImport,
  };
}
