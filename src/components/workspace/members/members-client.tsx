"use client";

import React, { useState, useEffect, useRef, useTransition, useCallback } from "react";
import type {
  WorkspaceMember,
  WorkspaceMembersData,
} from "@/src/app/(workspace)/members-actions";
import {
  getWorkspaceMembers,
  confirmMemberAction,
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
import { ErrorToast } from "@/src/components/error-toast";

interface MembersClientProps {
  rawId: string;
  initialData: WorkspaceMembersData;
}

export function MembersClient({ rawId, initialData }: MembersClientProps) {
  const [data, setData] = useState<WorkspaceMembersData>(initialData);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilterOption>("all");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastError, setToastError] = useState<string | null>(null);
  const [confirmingIds, setConfirmingIds] = useState<Set<string>>(new Set());

  const [isPending, startTransition] = useTransition();
  const isFirstRender = useRef(true);

  // Debounce search input by 250ms to keep page responsive past 500 members
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch updated list when debounced search or status filter changes
  const fetchMembers = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const res = await getWorkspaceMembers(rawId, {
      search: debouncedSearch,
      status: statusFilter,
    });

    if (res.success && res.data) {
      setData(res.data);
    } else {
      setErrorMessage(res.errorMessage || "We couldn't load your members. Try again.");
    }
    setIsLoading(false);
  }, [rawId, debouncedSearch, statusFilter]);

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
    const previousMembers = data.members;
    const previousPendingCount = data.pendingCount;

    setData((prev) => ({
      ...prev,
      pendingCount: Math.max(0, prev.pendingCount - 1),
      members: prev.members.map((m) =>
        m.id === targetMember.id ? { ...m, status: "active" as const } : m
      ),
    }));

    const res = await confirmMemberAction(rawId, targetMember.id);

    if (!res.success) {
      // Rollback on failure
      setData((prev) => ({
        ...prev,
        pendingCount: previousPendingCount,
        members: previousMembers,
      }));
      setToastError(res.errorMessage || "Could not confirm member. Please try again.");
    }

    setConfirmingIds((prev) => {
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
  const hasNoOrgMembers = data.totalCount === 0 && !isFiltered;
  const hasNoMatches = data.members.length === 0 && isFiltered;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 20,
        width: "100%",
        maxWidth: 1100,
        margin: "0 auto",
        padding: "clamp(24px, 3vw, 40px) clamp(16px, 2.5vw, 32px)",
        boxSizing: "border-box",
      }}
    >
      {/* Toast notification for inline mutation failures */}
      <ErrorToast message={toastError} onDismiss={() => setToastError(null)} />

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

      {/* Filter Toolbar (hidden only when the org has 0 members and no filters active) */}
      {!hasNoOrgMembers && (
        <MembersSearchFilter
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          pendingCount={data.pendingCount}
          totalCount={data.totalCount}
        />
      )}

      {/* Main Content Area */}
      {isLoading || isPending ? (
        <MemberSkeleton rowCount={Math.min(data.members.length || 5, 8)} />
      ) : hasNoOrgMembers ? (
        <MemberEmptyState
          type="no-members"
          joinLinkToken={data.joinLinkToken}
        />
      ) : hasNoMatches ? (
        <MemberEmptyState
          type="no-matches"
          onClearFilters={handleClearFilters}
        />
      ) : (
        <>
          {/* Desktop Table: visible on md (768px) and wider */}
          <div className="hidden md:block">
            <MemberTable
              members={data.members}
              onConfirm={handleConfirm}
              confirmingIds={confirmingIds}
            />
          </div>

          {/* Mobile Cards: visible on mobile < 768px, optimized for 360px phones */}
          <div className="flex flex-col gap-3 md:hidden">
            {data.members.map((member) => (
              <MemberMobileCard
                key={member.id}
                member={member}
                onConfirm={handleConfirm}
                isConfirming={confirmingIds.has(member.id)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

