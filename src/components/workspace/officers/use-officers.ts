"use client";

import { useState } from "react";
import { OfficerRole } from "@/src/lib/orgs/permissions";
import {
  WorkspaceOfficersData,
  ActiveOfficer,
  PendingInvite,
  getWorkspaceOfficers,
  createOfficerInvite,
  updateOfficerRole,
  revokeOfficerInvite,
} from "@/src/app/(workspace)/officers-actions";

export function useOfficers(initialData: WorkspaceOfficersData, orgId: string) {
  const [data, setData] = useState<WorkspaceOfficersData>(initialData);
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [accessRevoked, setAccessRevoked] = useState(false);

  // Invite modal state
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteDialogSession, setInviteDialogSession] = useState(0);
  const [invitePrefill, setInvitePrefill] = useState<{ email?: string; role?: OfficerRole }>({});

  // Success panel state
  const [successData, setSuccessData] = useState<{
    inviteUrl: string;
    email: string;
    role: OfficerRole;
  } | null>(null);

  // Remove officer modal state
  const [removeTarget, setRemoveTarget] = useState<ActiveOfficer | null>(null);

  // Refresh data from server
  async function refreshData() {
    try {
      const res = await getWorkspaceOfficers(orgId);
      if (res.success && res.data) {
        setData(res.data);
        setPageError(null);
      } else if (res.error === "access_revoked") {
        setAccessRevoked(true);
      } else {
        setPageError(res.errorMessage || "Failed to refresh officers.");
      }
    } catch {
      setPageError("Failed to communicate with server.");
    }
  }

  // Handle role change
  async function handleRoleChange(officer: ActiveOfficer, newRole: OfficerRole) {
    if (officer.role === newRole) return;
    setLoading(true);
    setPageError(null);

    try {
      const res = await updateOfficerRole(orgId, officer.id, newRole);
      if (res.success) {
        await refreshData();
      } else if (res.error === "access_revoked") {
        setAccessRevoked(true);
      } else {
        setPageError(res.errorMessage || "Failed to update role.");
      }
    } catch {
      setPageError("Failed to update role.");
    } finally {
      setLoading(false);
    }
  }

  // Handle revoke invite
  async function handleRevoke(inviteId: string) {
    setLoading(true);
    setPageError(null);
    try {
      const res = await revokeOfficerInvite(orgId, inviteId);
      if (res.success) {
        await refreshData();
      } else if (res.error === "access_revoked") {
        setAccessRevoked(true);
      } else {
        setPageError(res.errorMessage || "Failed to revoke invite.");
      }
    } catch {
      setPageError("Failed to revoke invite.");
    } finally {
      setLoading(false);
    }
  }

  // Only the hash of an invite link is stored, so an old link cannot be shown
  // again. This makes a fresh link for the same email and role (the old one
  // stops working) and opens the copy panel.
  async function handleRecreate(invite: PendingInvite) {
    if (!invite.email) return;
    setLoading(true);
    setPageError(null);
    try {
      const res = await createOfficerInvite(orgId, invite.email, invite.role);
      if (res.success && res.data) {
        setSuccessData(res.data);
        await refreshData();
      } else if (res.error === "access_revoked") {
        setAccessRevoked(true);
      } else {
        setPageError(res.errorMessage || "Failed to create a new link.");
      }
    } catch {
      setPageError("Failed to create a new link.");
    } finally {
      setLoading(false);
    }
  }

  // Open the invite dialog fresh, with no prefill
  function openInvite() {
    setInvitePrefill({});
    setInviteDialogSession((n) => n + 1);
    setInviteModalOpen(true);
  }

  return {
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
  };
}
