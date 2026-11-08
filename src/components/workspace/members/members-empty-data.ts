import type { WorkspaceMembersData } from "@/src/app/(workspace)/members-actions";

/** Placeholder data for a failed first load; the client shows a retry banner. */
export const EMPTY_MEMBERS_DATA: WorkspaceMembersData = {
  members: [],
  totalCount: 0,
  matchingCount: 0,
  hasMore: false,
  pendingCount: 0,
  joinLinkToken: null,
  canImport: false,
};
