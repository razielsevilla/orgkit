"use client";

import React, { useState, useEffect, useRef, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
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
import { MembersStyles } from "./members-styles";
import { MembersFloatingDecor } from "./members-decor";
import { ErrorToast } from "@/src/components/error-toast";
import { getMemberInvites, type MemberInvitesData } from "@/src/app/(workspace)/member-invites-actions";
import { ROUTES } from "@/src/lib/routes";
import { ImportDialog } from "./import/import-dialog";
import { InvitedView } from "./invited-view";
import { ExportDialog } from "./export/export-dialog";

interface MembersClientProps {
  rawId: string;
  initialData: WorkspaceMembersData;
  initialError?: string | null;
  /** Admins only: shows the Export button and dialog */
  canExport?: boolean;
}

export function MembersClient({ rawId, initialData, initialError = null, canExport = false }: MembersClientProps) {
  const [data, setData] = useState<WorkspaceMembersData>(initialData);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilterOption>("all");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(initialError);
  const [toastError, setToastError] = useState<string | null>(null);
  const [confirmingIds, setConfirmingIds] = useState<Set<string>>(new Set());

  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  // R3: admins can import a member list as invitations and see them in the Invited view
  const router = useRouter();
  const [view, setView] = useState<"members" | "invited">("members");
  const [importOpen, setImportOpen] = useState(false);
  const [invites, setInvites] = useState<MemberInvitesData | null>(null);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [invitesLoadingMore, setInvitesLoadingMore] = useState(false);
  const [invitesError, setInvitesError] = useState<string | null>(null);
  const invitesRequest = useRef(0);

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

  const loadInvites = useCallback(async () => {
    const myRequest = ++invitesRequest.current;
    setInvitesLoading(true);
    setInvitesError(null);
    const res = await getMemberInvites(rawId);
    if (myRequest !== invitesRequest.current) return;
    if (res.success && res.data) {
      setInvites(res.data);
    } else if (res.error === "not_authenticated") {
      router.push(ROUTES.signIn);
      return;
    } else {
      setInvitesError(res.errorMessage || "We couldn't load the invitations. Try again.");
    }
    setInvitesLoading(false);
  }, [rawId, router]);

  const handleLoadMoreInvites = async () => {
    if (!invites || invitesLoadingMore || !invites.hasMore) return;
    const myRequest = ++invitesRequest.current;
    setInvitesLoadingMore(true);
    const res = await getMemberInvites(rawId, { offset: invites.invites.length });
    if (myRequest !== invitesRequest.current) return;
    if (res.success && res.data) {
      const next = res.data;
      setInvites((prev) => {
        const seen = new Set((prev?.invites ?? []).map((i) => i.id));
        return { ...next, invites: [...(prev?.invites ?? []), ...next.invites.filter((i) => !seen.has(i.id))] };
      });
    } else {
      setToastError(res.errorMessage || "We couldn't load more invitations. Try again.");
    }
    setInvitesLoadingMore(false);
  };

  const showInvited = () => {
    setView("invited");
    if (!invites) loadInvites();
  };

  const handleImportFinished = () => {
    setImportOpen(false);
    setView("invited");
    loadInvites();
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setDebouncedSearch("");
    setStatusFilter("all");
  };

  const isFiltered = debouncedSearch.trim().length > 0 || statusFilter !== "all";
  const hasNoOrgMembers = data.totalCount === 0 && !isFiltered && !errorMessage;
  const hasLoadError = Boolean(errorMessage) && data.members.length === 0;
  const hasNoMatches = data.members.length === 0 && isFiltered && !errorMessage;

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

        {/* Header with Title, Dynamic Counters, and Retry Banner */}
        <MembersHeader
          totalCount={data.totalCount}
          matchingCount={data.matchingCount}
          pendingCount={data.pendingCount}
          isFiltered={isFiltered}
          errorMessage={errorMessage}
          onRetry={fetchMembers}
          isRetrying={isLoading || isPending}
          actions={
            data.canImport ? (
              <button
                type="button"
                onClick={() => setImportOpen(true)}
                className="orgkit-btn-accent"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  minHeight: 42,
                  padding: "10px 20px",
                  borderRadius: 9999,
                  backgroundColor: "var(--color-accent)",
                  color: "#FFFFFF",
                  fontSize: 13.5,
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <Upload size={15} aria-hidden="true" />
                <span>Import</span>
              </button>
            ) : null
          }
        />

        {/* Members | Invited switch: admins only, because invitations hold email addresses */}
        {data.canImport && (
          <div
            role="tablist"
            aria-label="Members or invited people"
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: 3,
              margin: "4px 0 12px 0",
              backgroundColor: "color-mix(in srgb, var(--color-line) 50%, transparent)",
              borderRadius: 9999,
              gap: 2,
            }}
          >
            {(
              [
                { id: "members", label: "Members", badge: undefined },
                { id: "invited", label: "Invited", badge: invites?.pendingCount },
              ] as const
            ).map((tab) => {
              const isActive = view === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  type="button"
                  aria-selected={isActive}
                  onClick={() => (tab.id === "invited" ? showInvited() : setView("members"))}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 16px",
                    borderRadius: 9999,
                    border: "none",
                    backgroundColor: isActive ? "var(--color-surface)" : "transparent",
                    color: isActive ? "var(--color-ink)" : "var(--color-muted)",
                    fontWeight: isActive ? 600 : 500,
                    fontSize: 13,
                    cursor: "pointer",
                    boxShadow: isActive ? "0 2px 8px color-mix(in srgb, var(--color-ink) 8%, transparent)" : "none",
                  }}
                >
                  <span>{tab.label}</span>
                  {typeof tab.badge === "number" && tab.badge > 0 && (
                    <span
                      style={{
                        padding: "1px 6px",
                        borderRadius: 9999,
                        fontSize: 11,
                        fontWeight: 700,
                        backgroundColor: "color-mix(in srgb, var(--color-line) 80%, transparent)",
                        color: "var(--color-ink)",
                      }}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {importOpen && (
          <ImportDialog
            orgId={rawId}
            onClose={() => setImportOpen(false)}
            onFinished={handleImportFinished}
            onSignedOut={() => router.push(ROUTES.signIn)}
          />
        )}

        {view === "invited" && data.canImport && (
          <InvitedView
            data={invites}
            isLoading={invitesLoading}
            isLoadingMore={invitesLoadingMore}
            error={invitesError}
            onRetry={loadInvites}
            onLoadMore={handleLoadMoreInvites}
            onImport={() => setImportOpen(true)}
          />
          onExport={canExport ? () => setExportOpen(true) : undefined}
        />

        {canExport && exportOpen && (
          <ExportDialog orgId={rawId} onClose={() => setExportOpen(false)} />
        )}

        {/* Filter Toolbar (completely clean, unblocked by any decor) */}
        {view === "members" && !hasNoOrgMembers && (
          <MembersSearchFilter
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            pendingCount={data.pendingCount}
            totalCount={data.totalCount}
          />
        )}

        {/* Main Content Area framed by Dynamic Floating Decor */}
        {view === "invited" && data.canImport ? null : isLoading || isPending ? (
          <MemberSkeleton rowCount={Math.min(data.members.length || 5, 8)} />
        ) : hasLoadError ? null : hasNoOrgMembers ? (
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
          <div style={{ position: "relative", width: "100%", marginTop: 4 }}>
            {/* Dynamic Floating Icons adjusting to the card's dimensions */}
            <MembersFloatingDecor />

            <div style={{ position: "relative", zIndex: 2, width: "100%" }}>
              {/* Desktop Table: visible on screens > 640px */}
              <div className="orgkit-members-desktop">
                <MemberTable
                  members={data.members}
                  onConfirm={handleConfirm}
                  confirmingIds={confirmingIds}
                />
              </div>

              {/* Mobile Cards: visible only on mobile screens <= 640px */}
              <div className="orgkit-members-mobile">
                {data.members.map((member) => (
                  <MemberMobileCard
                    key={member.id}
                    member={member}
                    onConfirm={handleConfirm}
                    isConfirming={confirmingIds.has(member.id)}
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

