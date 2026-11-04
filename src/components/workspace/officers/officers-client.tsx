"use client";

import React from "react";
import { WorkspaceOfficersData } from "@/src/app/(workspace)/officers-actions";
import { FloatingIconsDecor } from "@/src/components/decor/floating-decor";
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
    <div
      style={{
        width: "100%",
        maxWidth: 960,
        margin: "0 auto",
        position: "relative",
        animation: "cardPopout 0.45s cubic-bezier(0.16, 1.25, 0.38, 1) both",
      }}
    >
      {/* ── Keyframe Animations & Responsive Styles ── */}
      <OfficersStyles />

      {/* ── Removed Officer Alert Modal (Ticket Decision 7) ── */}
      {accessRevoked && <AccessRevokedDialog />}

      <OfficersHeader
        data={data}
        pageError={pageError}
        onInvite={openInvite}
        onClearError={() => setPageError(null)}
      />

      {/* ── Cards Container with Floating Icons Behind ── */}
      <div style={{ position: "relative", width: "100%" }}>
        {/* Floating Icons Decor positioned behind the cards */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 0,
          }}
        >
          <FloatingIconsDecor />
        </div>

        {/* Foreground Content & Cards */}
        <div style={{ position: "relative", zIndex: 2 }}>
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
        </div>
      </div>

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
