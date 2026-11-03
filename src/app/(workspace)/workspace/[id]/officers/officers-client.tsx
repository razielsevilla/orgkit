"use client";

import React from "react";
import { WorkspaceOfficersData } from "@/src/app/(workspace)/officers-actions";
import { InviteDialog, SuccessPanel } from "./invite-dialog";
import { RemoveDialog } from "./remove-dialog";
import { useOfficers } from "./use-officers";
import { OfficersStyles } from "./officers-styles";
import { AccessRevokedDialog } from "./access-revoked-dialog";
import { OfficersHeader } from "./officers-header";
import { ActiveOfficersSection } from "./active-officers-section";
import { PendingInvitesSection } from "./pending-invites-section";

interface OfficersClientProps {
  initialData: WorkspaceOfficersData;
  orgId: string;
}

export function OfficersClient({ initialData, orgId }: OfficersClientProps) {
  const {
    data,
    loading,
    pageError,
    setPageError,
    accessRevoked,
    inviteModalOpen,
    setInviteModalOpen,
    inviteDialogSession,
    invitePrefill,
    openInvite,
    successData,
    setSuccessData,
    removeTarget,
    setRemoveTarget,
    refreshData,
    handleRoleChange,
    handleRevoke,
    handleRecreate,
  } = useOfficers(initialData, orgId);

  return (
    <div style={{ width: "100%", maxWidth: 1024, margin: "0 auto", paddingBottom: 60 }}>
      {/* ── Keyframe Animations & Responsive Styles ── */}
      <OfficersStyles />

      {/* ── Removed Officer Alert Modal (Ticket Decision 7) ── */}
      {accessRevoked && <AccessRevokedDialog />}

      <OfficersHeader data={data} pageError={pageError} onInvite={openInvite} />

      <ActiveOfficersSection
        data={data}
        loading={loading}
        handleRoleChange={handleRoleChange}
        setPageError={setPageError}
        setRemoveTarget={setRemoveTarget}
      />

      <PendingInvitesSection
        data={data}
        loading={loading}
        handleRecreate={handleRecreate}
        handleRevoke={handleRevoke}
      />

      {/* ── Dialog Modals ── */}
      <InviteDialog
        // Remount on every open so the form starts from the prefill, not old input
        key={`${inviteDialogSession}`}
        orgId={orgId}
        isOpen={inviteModalOpen}
        initialEmail={invitePrefill.email}
        initialRole={invitePrefill.role}
        onClose={() => setInviteModalOpen(false)}
        onSuccess={(created) => {
          setInviteModalOpen(false);
          setSuccessData(created);
          refreshData();
        }}
      />

      {successData && (
        <SuccessPanel
          inviteUrl={successData.inviteUrl}
          email={successData.email}
          role={successData.role}
          onClose={() => setSuccessData(null)}
        />
      )}

      <RemoveDialog
        orgId={orgId}
        officerId={removeTarget?.id || null}
        officerName={removeTarget?.fullName || "this officer"}
        isOpen={removeTarget !== null}
        onClose={() => setRemoveTarget(null)}
        onRemoved={refreshData}
      />
    </div>
  );
}

