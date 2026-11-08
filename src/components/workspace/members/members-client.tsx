"use client";

import React, { useState, useEffect, useRef, useTransition, useCallback } from "react";
import type {
  WorkspaceMember,
  WorkspaceMembersData,
} from "@/src/app/(workspace)/members-actions";
import {
  getWorkspaceMembers,
  confirmMemberAction,
  updateMemberAction,
  setMemberStatusAction,
} from "@/src/app/(workspace)/members-actions";
import { MembersHeader } from "./members-header";
import {
  MembersSearchFilter,
  type StatusFilterOption,
} from "./members-search-filter";
import { MemberTable } from "./member-table";
import { MemberMobileCard } from "./member-mobile-card";
import { MemberSkeleton } from "./member-skeleton";
import { MemberEmptyState } from "./member-empty-state";
import { MembersStyles } from "./members-styles";
import { MembersFloatingDecor } from "./members-decor";
import { MemberEditDialog } from "./member-edit-dialog";
import { MemberDeactivateDialog } from "./member-deactivate-dialog";
import { ErrorToast } from "@/src/components/error-toast";

interface MembersClientProps {
  rawId: string;
  initialData: WorkspaceMembersData;
  initialError?: string | null;
}

export function MembersClient({ rawId, initialData, initialError = null }: MembersClientProps) {
  const [data, setData] = useState<WorkspaceMembersData>(initialData);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilterOption>("all");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(initialError);
  const [toastError, setToastError] = useState<string | null>(null);

  const [confirmingIds, setConfirmingIds] = useState<Set<string>>(new Set());
  const [reactivatingIds, setReactivatingIds] = useState<Set<string>>(new Set());
  const [editTarget, setEditTarget] = useState<WorkspaceMember | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<WorkspaceMember | null>(null);

  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [isPending, startTransition] = useTransition();
  // Skip the refetch on mount only when the server already gave us data
  const isFirstRender = useRef(!initialError);
  // Only the latest request may write results (guards out-of-order responses)
  const requestId = useRef(0);

  // Debounce search input by 250ms to keep page responsive past 500 members
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch updated list when debounced search or status filter changes
  const fetchMembers = useCallback(async () => {
    const myRequest = ++requestId.current;
    setIsLoading(true);
    setErrorMessage(null);

    const res = await getWorkspaceMembers(rawId, {
      search: debouncedSearch,
      status: statusFilter,
    });
    if (myRequest !== requestId.current) return;

    if (res.success && res.data) {
      setData(res.data);
    } else {
      setErrorMessage(res.errorMessage || "We couldn't load your members. Try again.");
    }
    setIsLoading(false);
    setIsLoadingMore(false);
  }, [rawId, debouncedSearch, statusFilter]);

  const handleLoadMore = async () => {
    if (isLoadingMore || isLoading || !data.hasMore) return;
    const myRequest = ++requestId.current;
    setIsLoadingMore(true);

    const res = await getWorkspaceMembers(rawId, {
      search: debouncedSearch,
      status: statusFilter,
      offset: data.members.length,
    });
    if (myRequest !== requestId.current) return;

    if (res.success && res.data) {
      const next = res.data;
      setData((prev) => {
        const seen = new Set(prev.members.map((m) => m.id));
        return {
          ...next,
          members: [...prev.members, ...next.members.filter((m) => !seen.has(m.id))],
        };
      });
    } else {
      setToastError(res.errorMessage || "We couldn't load more members. Try again.");
    }
    setIsLoadingMore(false);
  };

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    startTransition(() => {
      fetchMembers();
    });
  }, [debouncedSearch, statusFilter, fetchMembers]);

  // Optimistic inline confirmation without page reload
  const handleConfirm = async (targetMember: WorkspaceMember) => {
    if (confirmingIds.has(targetMember.id)) return;

    setConfirmingIds((prev) => new Set(prev).add(targetMember.id));

    // Optimistic update
    setData((prev) => ({
      ...prev,
      pendingCount: Math.max(0, prev.pendingCount - 1),
      members: prev.members.map((m) =>
        m.id === targetMember.id ? { ...m, status: "active" as const } : m
      ),
    }));

    const res = await confirmMemberAction(rawId, targetMember.id);

    if (!res.success) {
      // Roll back only this member so other in-flight confirms are untouched
      setData((prev) => ({
        ...prev,
        pendingCount: prev.pendingCount + 1,
        members: prev.members.map((m) =>
          m.id === targetMember.id ? { ...m, status: "pending" as const } : m
        ),
      }));
      setToastError(res.errorMessage || "Could not confirm member. Please try again.");
    }

    setConfirmingIds((prev) => {
      const next = new Set(prev);
      next.delete(targetMember.id);
      return next;
    });
  };

  // Optimistic edit without page reload
  const handleSaveEdit = async (
    memberId: string,
    updates: { fullName: string; email: string }
  ) => {
    const oldMember = data.members.find((m) => m.id === memberId);

    // Optimistically update
    setData((prev) => ({
      ...prev,
      members: prev.members.map((m) =>
        m.id === memberId ? { ...m, fullName: updates.fullName, email: updates.email } : m
      ),
    }));

    const res = await updateMemberAction(rawId, memberId, updates);

    if (!res.success) {
      // Rollback to original values
      if (oldMember) {
        setData((prev) => ({
          ...prev,
          members: prev.members.map((m) => (m.id === memberId ? oldMember : m)),
        }));
      }

      if (res.error === "not_found") {
        setToastError("This member was updated by another officer. Refreshing roster...");
        fetchMembers();
      }

      return { success: false, errorMessage: res.errorMessage };
    }

    return { success: true };
  };

  // Optimistic deactivation
  const handleConfirmDeactivate = async (memberId: string) => {
    const oldMember = data.members.find((m) => m.id === memberId);
    if (!oldMember) return { success: false, errorMessage: "Member not found." };

    const wasPending = oldMember.status === "pending";

    // Optimistic update
    setData((prev) => {
      const isViewingInactive = statusFilter === "inactive";
      return {
        ...prev,
        pendingCount: wasPending ? Math.max(0, prev.pendingCount - 1) : prev.pendingCount,
        totalCount: Math.max(0, prev.totalCount - 1),
        inactiveCount: (prev.inactiveCount ?? 0) + 1,
        matchingCount: isViewingInactive ? prev.matchingCount : Math.max(0, prev.matchingCount - 1),
        members: isViewingInactive
          ? prev.members.map((m) => (m.id === memberId ? { ...m, status: "inactive" as const } : m))
          : prev.members.filter((m) => m.id !== memberId),
      };
    });

    const res = await setMemberStatusAction(rawId, memberId, "inactive");

    if (!res.success) {
      // Rollback
      setData((prev) => ({
        ...prev,
        pendingCount: wasPending ? prev.pendingCount + 1 : prev.pendingCount,
        totalCount: prev.totalCount + 1,
        inactiveCount: Math.max(0, (prev.inactiveCount ?? 0) - 1),
        matchingCount: prev.matchingCount + 1,
        members: prev.members.some((m) => m.id === memberId)
          ? prev.members.map((m) => (m.id === memberId ? oldMember : m))
          : [...prev.members, oldMember],
      }));

      const isStale =
        res.error === "not_found" ||
        res.errorMessage?.includes("not found") ||
        res.errorMessage?.includes("transition");

      setToastError(
        isStale
          ? "This member was updated by another officer. Refreshing roster..."
          : res.errorMessage || "Could not deactivate member. Please try again."
      );

      if (isStale) {
        fetchMembers();
      }

      return { success: false, errorMessage: res.errorMessage };
    }

    return { success: true };
  };

  // Optimistic reactivation
  const handleReactivate = async (targetMember: WorkspaceMember) => {
    if (reactivatingIds.has(targetMember.id)) return;

    setReactivatingIds((prev) => new Set(prev).add(targetMember.id));

    // Optimistic update
    setData((prev) => {
      const isViewingInactive = statusFilter === "inactive";
      return {
        ...prev,
        totalCount: prev.totalCount + 1,
        inactiveCount: Math.max(0, (prev.inactiveCount ?? 0) - 1),
        matchingCount: isViewingInactive ? Math.max(0, prev.matchingCount - 1) : prev.matchingCount,
        members: isViewingInactive
          ? prev.members.filter((m) => m.id !== targetMember.id)
          : prev.members.map((m) =>
              m.id === targetMember.id ? { ...m, status: "active" as const } : m
            ),
      };
    });

    const res = await setMemberStatusAction(rawId, targetMember.id, "active");

    if (!res.success) {
      // Rollback
      setData((prev) => {
        const isViewingInactive = statusFilter === "inactive";
        return {
          ...prev,
          totalCount: Math.max(0, prev.totalCount - 1),
          inactiveCount: (prev.inactiveCount ?? 0) + 1,
          matchingCount: isViewingInactive ? prev.matchingCount + 1 : prev.matchingCount,
          members: isViewingInactive
            ? [...prev.members, targetMember]
            : prev.members.map((m) =>
                m.id === targetMember.id ? { ...m, status: "inactive" as const } : m
              ),
        };
      });

      const isStale =
        res.error === "not_found" ||
        res.errorMessage?.includes("not found") ||
        res.errorMessage?.includes("transition");

      setToastError(
        isStale
          ? "This member was updated by another officer. Refreshing roster..."
          : res.errorMessage || "Could not reactivate member. Please try again."
      );

      if (isStale) {
        fetchMembers();
      }
    }

    setReactivatingIds((prev) => {
      const next = new Set(prev);
      next.delete(targetMember.id);
      return next;
    });
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setDebouncedSearch("");
    setStatusFilter("all");
  };

  const isFiltered = debouncedSearch.trim().length > 0 || statusFilter !== "all";
  const hasZeroOrgMembers = data.totalCount === 0 && (data.inactiveCount ?? 0) === 0;
  const hasNoOrgMembers = hasZeroOrgMembers && !isFiltered && !errorMessage;
  const hasLoadError = Boolean(errorMessage) && data.members.length === 0;
  const hasNoActiveMembers =
    data.members.length === 0 &&
    data.totalCount === 0 &&
    (data.inactiveCount ?? 0) > 0 &&
    statusFilter === "all" &&
    debouncedSearch.trim().length === 0 &&
    !errorMessage;
  const hasNoMatches =
    data.members.length === 0 &&
    !hasNoActiveMembers &&
    (isFiltered || (data.inactiveCount ?? 0) > 0) &&
    !errorMessage;

  return (
    <div
      style={{
        height: "100%",
        overflowY: "auto",
        padding: "36px clamp(16px, 4vw, 36px) 60px clamp(16px, 4vw, 36px)",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 960,
          margin: "0 auto",
          position: "relative",
          animation: "cardPopout 0.45s cubic-bezier(0.16, 1.25, 0.38, 1) both",
        }}
      >
        {/* Responsive CSS & Theme Styles */}
        <MembersStyles />

        {/* Toast notification for inline mutation failures */}
        <ErrorToast message={toastError} onDismiss={() => setToastError(null)} />

        {/* Member Edit Dialog Modal */}
        <MemberEditDialog
          member={editTarget}
          isOpen={Boolean(editTarget)}
          onClose={() => setEditTarget(null)}
          onSave={handleSaveEdit}
        />

        {/* Member Deactivate Dialog Modal */}
        <MemberDeactivateDialog
          member={deactivateTarget}
          isOpen={Boolean(deactivateTarget)}
          onClose={() => setDeactivateTarget(null)}
          onConfirm={handleConfirmDeactivate}
        />

        {/* Header with Title, Dynamic Counters, and Retry Banner */}
        <MembersHeader
          totalCount={data.totalCount}
          matchingCount={data.matchingCount}
          pendingCount={data.pendingCount}
          isFiltered={isFiltered}
          errorMessage={errorMessage}
          onRetry={fetchMembers}
          isRetrying={isLoading || isPending}
        />

        {/* Filter Toolbar (completely clean, unblocked by any decor) */}
        {!hasNoOrgMembers && (
          <MembersSearchFilter
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            pendingCount={data.pendingCount}
            totalCount={data.totalCount}
            inactiveCount={data.inactiveCount}
          />
        )}

        {/* Main Content Area framed by Dynamic Floating Decor */}
        {isLoading || isPending ? (
          <MemberSkeleton rowCount={Math.min(data.members.length || 5, 8)} />
        ) : hasLoadError ? null : hasNoOrgMembers ? (
          <MemberEmptyState
            type="no-members"
            joinLinkToken={data.joinLinkToken}
          />
        ) : hasNoActiveMembers ? (
          <MemberEmptyState
            type="no-active-members"
            inactiveCount={data.inactiveCount}
            onViewInactive={() => setStatusFilter("inactive")}
          />
        ) : hasNoMatches ? (
          <MemberEmptyState
            type="no-matches"
            onClearFilters={handleClearFilters}
          />
        ) : (
          <div style={{ position: "relative", width: "100%", marginTop: 4 }}>
            {/* Dynamic Floating Icons adjusting to the card's dimensions */}
            <MembersFloatingDecor />

            <div style={{ position: "relative", zIndex: 2, width: "100%" }}>
              {/* Desktop Table: visible on screens > 640px */}
              <div className="orgkit-members-desktop">
                <MemberTable
                  members={data.members}
                  onConfirm={handleConfirm}
                  onEdit={(m) => setEditTarget(m)}
                  onDeactivate={(m) => setDeactivateTarget(m)}
                  onReactivate={handleReactivate}
                  confirmingIds={confirmingIds}
                  reactivatingIds={reactivatingIds}
                />
              </div>

              {/* Mobile Cards: visible only on mobile screens <= 640px */}
              <div className="orgkit-members-mobile">
                {data.members.map((member) => (
                  <MemberMobileCard
                    key={member.id}
                    member={member}
                    onConfirm={handleConfirm}
                    onEdit={(m) => setEditTarget(m)}
                    onDeactivate={(m) => setDeactivateTarget(m)}
                    onReactivate={handleReactivate}
                    isConfirming={confirmingIds.has(member.id)}
                    isReactivating={reactivatingIds.has(member.id)}
                  />
                ))}
              </div>

              {data.hasMore && (
                <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    style={{
                      padding: "10px 22px",
                      borderRadius: 999,
                      border: "1px solid var(--color-line)",
                      backgroundColor: "var(--color-surface)",
                      color: "var(--color-ink)",
                      fontWeight: 600,
                      fontSize: 14,
                      cursor: isLoadingMore ? "not-allowed" : "pointer",
                      opacity: isLoadingMore ? 0.7 : 1,
                    }}
                  >
                    {isLoadingMore
                      ? "Loading..."
                      : `Load more (${data.members.length} of ${data.matchingCount})`}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
