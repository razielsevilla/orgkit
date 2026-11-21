"use client";

import { useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import type { WorkspaceMember, WorkspaceMembersData } from "@/src/app/(workspace)/members-actions";
import { ErrorToast } from "@/src/components/error-toast";
import { rosterEmptyState } from "@/src/lib/members/roster-state";
import { ROUTES } from "@/src/lib/routes";
import { InvitedView } from "./invited-view";
import { MemberEmptyState } from "./member-empty-state";
import { MemberList } from "./member-list";
import { MemberSkeleton } from "./member-skeleton";
import { MembersHeader } from "./members-header";
import { MembersImportButton } from "./members-import-button";
import { MembersSearchFilter } from "./members-search-filter";
import { MembersStyles } from "./members-styles";
import { MembersViewTabs, type MembersView } from "./members-view-tabs";
import { useMemberInvites } from "./use-member-invites";
import { useMemberRoster } from "./use-member-roster";
import { useRowFocusRestore } from "./use-row-focus-restore";

// Off-screen modals lazy-loaded on demand to keep critical bundle minimal
const MemberEditDialog = dynamic(
  () => import("./member-edit-dialog").then((m) => m.MemberEditDialog),
  { ssr: false }
);
const MemberDeactivateDialog = dynamic(
  () => import("./member-deactivate-dialog").then((m) => m.MemberDeactivateDialog),
  { ssr: false }
);
const MemberAttendanceDialog = dynamic(
  () => import("./member-attendance-dialog").then((m) => m.MemberAttendanceDialog),
  { ssr: false }
);
const ExportDialog = dynamic(
  () => import("./export/export-dialog").then((m) => m.ExportDialog),
  { ssr: false }
);
const ImportDialog = dynamic(
  () => import("./import/import-dialog").then((m) => m.ImportDialog),
  { ssr: false }
);

interface MembersClientProps {
  rawId: string;
  initialData: WorkspaceMembersData;
  initialError?: string | null;
  /** Admins only: shows the Export button and dialog */
  canExport?: boolean;
}

export function MembersClient({
  rawId,
  initialData,
  initialError = null,
  canExport = false,
}: MembersClientProps) {
  const router = useRouter();
  const [toastError, setToastError] = useState<string | null>(null);

  const roster = useMemberRoster({
    orgId: rawId,
    initialData,
    initialError,
    notify: setToastError,
  });
  const invites = useMemberInvites(rawId, setToastError);
  const { data } = roster;

  const [view, setView] = useState<MembersView>("members");
  const [editTarget, setEditTarget] = useState<WorkspaceMember | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<WorkspaceMember | null>(null);
  const [historyTarget, setHistoryTarget] = useState<WorkspaceMember | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const queueFocus = useRowFocusRestore(
    data.members,
    Boolean(editTarget || deactivateTarget) || roster.isBusy
  );

  const closeEdit = () => {
    if (editTarget) queueFocus(editTarget.id);
    setEditTarget(null);
  };

  const closeDeactivate = () => {
    if (deactivateTarget) queueFocus(deactivateTarget.id);
    setDeactivateTarget(null);
  };

  const showView = (next: MembersView) => {
    setView(next);
    if (next === "invited" && !invites.invites) invites.load();
  };

  const handleImportFinished = () => {
    setImportOpen(false);
    setView("invited");
    invites.load();
  };

  const showingInvited = view === "invited" && data.canImport;
  const hasLoadError = Boolean(roster.errorMessage) && data.members.length === 0;
  const emptyState = rosterEmptyState({
    roster: data,
    statusFilter: roster.statusFilter,
    searchTerm: roster.searchTerm,
    hasError: Boolean(roster.errorMessage),
  });

  function renderRoster(): ReactNode {
    if (showingInvited) return null;
    // Moving between pages keeps the rows on screen; a new search or tab shows the skeleton
    if (roster.isBusy && !roster.isPaging) return <MemberSkeleton rowCount={Math.min(data.members.length || 5, 10)} />;
    if (hasLoadError) return null;

    switch (emptyState) {
      case "no-members":
        return <MemberEmptyState type="no-members" joinLinkToken={data.joinLinkToken} />;
      case "no-active-members":
        return (
          <MemberEmptyState
            type="no-active-members"
            inactiveCount={data.inactiveCount}
            onViewInactive={() => roster.setStatusFilter("inactive")}
          />
        );
      case "no-matches":
        return <MemberEmptyState type="no-matches" onClearFilters={roster.clearFilters} />;
      default:
        return (
          <MemberList
            members={data.members}
            matchingCount={data.matchingCount}
            page={roster.page}
            pageSize={roster.pageSize}
            onPageChange={roster.goToPage}
            isPaging={roster.isPaging}
            confirmingIds={roster.confirmingIds}
            reactivatingIds={roster.reactivatingIds}
            onConfirm={roster.confirm}
            onEdit={setEditTarget}
            onViewHistory={setHistoryTarget}
            onDeactivate={setDeactivateTarget}
            onReactivate={roster.reactivate}
          />
        );
    }
  }

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
        className="orgkit-members-shell"
        style={{
          width: "100%",
          maxWidth: 960,
          margin: "0 auto",
          position: "relative",
          animation: "cardPopout 0.45s cubic-bezier(0.16, 1.25, 0.38, 1) both",
        }}
      >
        <MembersStyles />

        <ErrorToast message={toastError} onDismiss={() => setToastError(null)} />

        <MemberEditDialog
          member={editTarget}
          isOpen={Boolean(editTarget)}
          onClose={closeEdit}
          onSave={roster.saveEdit}
        />
        <MemberDeactivateDialog
          member={deactivateTarget}
          isOpen={Boolean(deactivateTarget)}
          onClose={closeDeactivate}
          onConfirm={roster.deactivate}
        />

        {/* Read-only, so the roster never changes under it; the dialog returns focus to its own button */}
        {historyTarget && (
          <MemberAttendanceDialog
            key={historyTarget.id}
            orgId={rawId}
            member={historyTarget}
            onClose={() => setHistoryTarget(null)}
          />
        )}

        <MembersHeader
          totalCount={data.totalCount}
          matchingCount={data.matchingCount}
          pendingCount={data.pendingCount}
          isFiltered={roster.isFiltered}
          errorMessage={roster.errorMessage}
          onRetry={roster.reload}
          isRetrying={roster.isBusy}
          actions={data.canImport ? <MembersImportButton onClick={() => setImportOpen(true)} /> : null}
          onExport={canExport ? () => setExportOpen(true) : undefined}
        />

        {data.canImport && (
          <MembersViewTabs
            view={view}
            onSelect={showView}
            pendingInvites={invites.invites?.pendingCount}
          />
        )}

        {importOpen && (
          <ImportDialog
            orgId={rawId}
            onClose={() => setImportOpen(false)}
            onFinished={handleImportFinished}
            onSignedOut={() => router.push(ROUTES.signIn)}
          />
        )}

        {showingInvited && (
          <InvitedView
            data={invites.invites}
            isLoading={invites.isLoading}
            isLoadingMore={invites.isLoadingMore}
            error={invites.error}
            onRetry={invites.load}
            onLoadMore={invites.loadMore}
            onImport={() => setImportOpen(true)}
          />
        )}

        {canExport && exportOpen && <ExportDialog orgId={rawId} onClose={() => setExportOpen(false)} />}

        {view === "members" && emptyState !== "no-members" && (
          <MembersSearchFilter
            searchQuery={roster.searchQuery}
            onSearchChange={roster.setSearchQuery}
            statusFilter={roster.statusFilter}
            onStatusChange={roster.setStatusFilter}
            pendingCount={data.pendingCount}
            totalCount={data.totalCount}
            inactiveCount={data.inactiveCount}
          />
        )}

        {renderRoster()}
      </div>
    </div>
  );
}
