"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  confirmMemberAction,
  getWorkspaceMembers,
  setMemberStatusAction,
  updateMemberAction,
  type WorkspaceMember,
  type WorkspaceMembersData,
} from "@/src/app/(workspace)/members-actions";
import { MEMBER_EDIT_MESSAGES } from "@/src/lib/members/member-edit";
import { MEMBERS_PAGE_SIZE } from "@/src/lib/members/member-search";
import { pageCount } from "@/src/lib/pagination";
import {
  confirmMember,
  deactivateMember,
  editMember,
  isRosterFiltered,
  reactivateMember,
  restoreMember,
  undoConfirmMember,
  undoDeactivateMember,
  undoReactivateMember,
} from "@/src/lib/members/roster-state";
import type { StatusFilterOption } from "./members-search-filter";
import { useBusyIds } from "./use-busy-ids";

const SEARCH_DEBOUNCE_MS = 250;

/** What a dialog needs to know after it asked for a change */
export interface MutationResult {
  success: boolean;
  errorMessage?: string;
  /** Another officer changed this member first; the roster has been refreshed */
  stale?: boolean;
}

/** The member is gone or changed under us: our change is out of date, not wrong */
const isOutOfDate = (error: string | undefined) => error === "stale" || error === "not_found";

interface Options {
  orgId: string;
  initialData: WorkspaceMembersData;
  /** Set when the server could not load the first page */
  initialError: string | null;
  /** Shows a message as a toast */
  notify: (message: string) => void;
}

/**
 * Everything the roster needs: the loaded members, the search and status
 * filter that narrow them, more pages on request, and the changes officers
 * make (confirm, edit, deactivate, reactivate).
 *
 * Changes show on screen at once and are undone if the server refuses them.
 */
export function useMemberRoster({ orgId, initialData, initialError, notify }: Options) {
  const [data, setData] = useState(initialData);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilterValue] = useState<StatusFilterOption>("all");

  // The page asked for, counted from 1. Each page replaces the list.
  const [requestedPage, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  // The load running now is a move to another page, so the list stays on screen
  const [isPaging, setIsPaging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(initialError);
  const [isPending, startTransition] = useTransition();

  // If that page no longer exists (the last member of the last page was
  // deactivated, or another officer removed some), the last one is shown instead
  const lastPage = pageCount(data.matchingCount, MEMBERS_PAGE_SIZE);
  const page = Math.min(requestedPage, lastPage);

  const confirming = useBusyIds();
  const reactivating = useBusyIds();

  // Skip the refetch on mount only when the server already gave us data
  const isFirstRender = useRef(!initialError);
  // Only the latest request may write results (guards out-of-order responses)
  const latestRequest = useRef(0);

  // Debounce the search so the list stays responsive past 500 members.
  // A new search starts again from the first page.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchMembers = useCallback(async () => {
    const request = ++latestRequest.current;
    setIsLoading(true);
    setErrorMessage(null);

    const res = await getWorkspaceMembers(orgId, {
      search: debouncedSearch,
      status: statusFilter,
      offset: (page - 1) * MEMBERS_PAGE_SIZE,
      limit: MEMBERS_PAGE_SIZE,
    });
    if (request !== latestRequest.current) return;

    if (res.success && res.data) {
      setData(res.data);
    } else {
      setErrorMessage(res.errorMessage || "We couldn't load your members. Try again.");
    }
    setIsLoading(false);
    setIsPaging(false);
  }, [orgId, debouncedSearch, statusFilter, page]);

  // Reload when the (debounced) search, the status filter or the page changes
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    startTransition(() => {
      fetchMembers();
    });
  }, [debouncedSearch, statusFilter, page, fetchMembers]);

  function goToPage(next: number) {
    if (isLoading || next === page || next < 1 || next > lastPage) return;
    setIsPaging(true);
    setPage(next);
  }

  function setStatusFilter(next: StatusFilterOption) {
    setStatusFilterValue(next);
    setPage(1);
  }

  function clearFilters() {
    setSearchQuery("");
    setDebouncedSearch("");
    setStatusFilterValue("all");
    setPage(1);
  }

  /** Another officer changed this member first: explain, then refresh */
  function handleOutOfDate(message?: string) {
    notify(message || MEMBER_EDIT_MESSAGES.stale);
    fetchMembers();
  }

  const viewingInactive = statusFilter === "inactive";

  const viewingPending = statusFilter === "pending";

  const confirm = (member: WorkspaceMember) =>
    confirming.track(member.id, async () => {
      const index = data.members.findIndex((m) => m.id === member.id);
      setData((current) => confirmMember(current, member.id, viewingPending));

      const res = await confirmMemberAction(orgId, member.id);
      if (res.success) return;

      // Undo only this member so other in-flight confirms are untouched
      setData((current) => undoConfirmMember(current, member, Math.max(index, 0), viewingPending));
      if (isOutOfDate(res.error)) {
        handleOutOfDate(res.errorMessage);
      } else {
        notify(res.errorMessage || "Could not confirm member. Please try again.");
      }
    });

  const reactivate = (member: WorkspaceMember) =>
    reactivating.track(member.id, async () => {
      setData((current) => reactivateMember(current, member.id, viewingInactive));

      const res = await setMemberStatusAction(orgId, member.id, "active", member.status);
      if (res.success) return;

      setData((current) => undoReactivateMember(current, member, viewingInactive));
      if (isOutOfDate(res.error)) {
        handleOutOfDate(res.errorMessage);
      } else {
        notify(res.errorMessage || "Could not reactivate member. Please try again.");
      }
    });

  async function saveEdit(
    memberId: string,
    updates: { fullName: string; email: string }
  ): Promise<MutationResult> {
    const original = data.members.find((m) => m.id === memberId);

    setData((current) => editMember(current, memberId, updates));

    const res = await updateMemberAction(orgId, memberId, updates, original?.status);
    if (res.success) return { success: true };

    if (original) setData((current) => restoreMember(current, original));

    if (isOutOfDate(res.error)) {
      handleOutOfDate(res.errorMessage);
      return { success: false, errorMessage: res.errorMessage, stale: true };
    }
    return { success: false, errorMessage: res.errorMessage };
  }

  async function deactivate(memberId: string): Promise<MutationResult> {
    const index = data.members.findIndex((m) => m.id === memberId);
    const original = data.members[index];
    if (!original) return { success: false, errorMessage: "Member not found." };

    setData((current) => deactivateMember(current, original, viewingInactive));

    const res = await setMemberStatusAction(orgId, memberId, "inactive", original.status);
    if (res.success) return { success: true };

    setData((current) => undoDeactivateMember(current, original, index, viewingInactive));

    if (isOutOfDate(res.error)) {
      handleOutOfDate(res.errorMessage);
      return { success: false, errorMessage: res.errorMessage, stale: true };
    }
    notify(res.errorMessage || "Could not deactivate member. Please try again.");
    return { success: false, errorMessage: res.errorMessage };
  }

  return {
    data,
    searchQuery,
    setSearchQuery,
    searchTerm: debouncedSearch,
    statusFilter,
    setStatusFilter,
    clearFilters,
    isFiltered: isRosterFiltered(debouncedSearch, statusFilter),
    /** A reload is running, for the skeleton and the retry button */
    isBusy: isLoading || isPending,
    errorMessage,
    page,
    pageSize: MEMBERS_PAGE_SIZE,
    goToPage,
    isPaging,
    reload: fetchMembers,
    confirmingIds: confirming.ids,
    reactivatingIds: reactivating.ids,
    confirm,
    reactivate,
    saveEdit,
    deactivate,
  };
}
