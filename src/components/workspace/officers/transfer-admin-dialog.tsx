"use client";

import React, { useState, useTransition } from "react";
import { ShieldAlert, AlertCircle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogButton,
} from "@/src/components/ui/dialog";
import { Select } from "@/src/components/ui/select";
import {
  transferAdminRightsAction,
  type ActiveOfficer,
} from "@/src/app/(workspace)/officers-actions";
import type { CallerTransferRole } from "@/src/lib/orgs/transfer-admin-validation";

interface TransferAdminDialogProps {
  orgId: string;
  orgName: string;
  officers: ActiveOfficer[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newRole: CallerTransferRole) => void;
}

export function TransferAdminDialog({
  orgId,
  orgName,
  officers,
  isOpen,
  onClose,
  onSuccess,
}: TransferAdminDialogProps) {
  const eligibleOfficers = officers.filter((o) => !o.isCurrentUser);
  const [targetOfficerId, setTargetOfficerId] = useState<string>(
    eligibleOfficers[0]?.id || ""
  );
  const [callerNewRole, setCallerNewRole] = useState<CallerTransferRole>("officer");
  const [typedConfirm, setTypedConfirm] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  const isConfirmed =
    typedConfirm.trim().toLowerCase() === orgName.trim().toLowerCase();
  const canSubmit = !isPending && targetOfficerId && isConfirmed;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!targetOfficerId) {
      setErrorMessage("Please select an officer to receive admin rights.");
      return;
    }

    if (!isConfirmed) {
      setErrorMessage(`Please type "${orgName}" exactly to confirm the transfer.`);
      return;
    }

    startTransition(async () => {
      const res = await transferAdminRightsAction(orgId, {
        targetOfficerId,
        callerNewRole,
        confirmOrgName: typedConfirm.trim(),
      });

      if (!res.success || !res.data) {
        setErrorMessage(res.errorMessage || "Failed to transfer admin rights.");
        return;
      }

      onSuccess(res.data.callerNewRole);
      onClose();
    });
  };

  const officerOptions = eligibleOfficers.map((o) => ({
    value: o.id,
    label: `${o.fullName} (${o.role})`,
  }));

  const roleOptions = [
    {
      value: "officer",
      label: "General Officer",
      description: "Keep access to manage attendance and view roster",
    },
    {
      value: "finance",
      label: "Finance Officer",
      description: "Keep access to view roster and verify dues payments",
    },
    {
      value: "remove",
      label: "Step Down Completely",
      description: "Relinquish officer access and return to general member",
    },
  ];

  return (
    <Dialog
      labelledBy="transfer-admin-dialog-title"
      onDismiss={isPending ? undefined : onClose}
      maxWidth={480}
    >
      <DialogHeader
        titleId="transfer-admin-dialog-title"
        title="Transfer admin rights"
        description={`Pass primary administrative control for ${orgName}`}
        onClose={onClose}
        closeDisabled={isPending}
      />

      <form onSubmit={handleSubmit}>
        <DialogBody style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {errorMessage && (
            <div
              role="alert"
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "10px 14px",
                borderRadius: 12,
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#991b1b",
                fontSize: 13,
                lineHeight: 1.45,
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          {eligibleOfficers.length === 0 ? (
            <div
              style={{
                padding: "20px 16px",
                backgroundColor: "var(--color-base)",
                borderRadius: 14,
                border: "1px solid var(--color-line)",
                textAlign: "center",
                color: "var(--color-muted-strong)",
                fontSize: 13.5,
                lineHeight: 1.5,
              }}
            >
              <ShieldAlert
                size={28}
                color="var(--color-amber, #d97706)"
                style={{ margin: "0 auto 10px auto", display: "block" }}
              />
              <p style={{ margin: 0, fontWeight: 600, color: "var(--color-ink)" }}>
                No eligible officers available
              </p>
              <p style={{ margin: "6px 0 0 0", fontSize: 13 }}>
                You are currently the only active officer. Please invite or add another team member first before transferring admin rights.
              </p>
            </div>
          ) : (
            <>
              {/* Target Officer Selection */}
              <div>
                <label
                  htmlFor="transfer-target-officer"
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--color-ink)",
                    marginBottom: 6,
                  }}
                >
                  New admin <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <Select
                  id="transfer-target-officer"
                  disabled={isPending}
                  value={targetOfficerId}
                  onChange={setTargetOfficerId}
                  options={officerOptions}
                  placeholder="Select incoming team member..."
                />
              </div>

              {/* Outgoing Admin New Role */}
              <div>
                <label
                  htmlFor="transfer-caller-new-role"
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--color-ink)",
                    marginBottom: 6,
                  }}
                >
                  Your new role <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <Select
                  id="transfer-caller-new-role"
                  disabled={isPending}
                  value={callerNewRole}
                  onChange={(val) => setCallerNewRole(val as CallerTransferRole)}
                  options={roleOptions}
                  placeholder="Select your new role..."
                />
              </div>

              {/* High-visibility Warning Notice */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "14px 16px",
                  borderRadius: 14,
                  backgroundColor: "#fff7ed",
                  border: "1px solid #fed7aa",
                  color: "#9a3412",
                  fontSize: 13,
                  lineHeight: 1.45,
                }}
              >
                <ShieldAlert size={20} style={{ flexShrink: 0, marginTop: 1, color: "#ea580c" }} />
                <div>
                  <strong style={{ display: "block", marginBottom: 2, color: "#9a3412", fontSize: 13.5 }}>
                    You will lose admin rights
                  </strong>
                  You will no longer be able to manage billing, invite officers, or configure organization settings. Every organization must have at least one active admin.
                </div>
              </div>

              {/* Typed Confirmation Field */}
              <div>
                <label
                  htmlFor="transfer-confirm-org-name"
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--color-ink)",
                    marginBottom: 6,
                  }}
                >
                  Type <strong style={{ color: "var(--color-ink)" }}>{orgName}</strong> to confirm <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <input
                  id="transfer-confirm-org-name"
                  type="text"
                  required
                  disabled={isPending}
                  value={typedConfirm}
                  onChange={(e) => setTypedConfirm(e.target.value)}
                  placeholder={`Type ${orgName}`}
                  autoComplete="off"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid var(--color-line)",
                    backgroundColor: "var(--color-surface)",
                    fontSize: 13.5,
                    color: "var(--color-ink)",
                    boxSizing: "border-box",
                    outline: "none",
                  }}
                />
              </div>
            </>
          )}
        </DialogBody>

        <DialogFooter>
          <DialogButton onClick={onClose} disabled={isPending}>
            Cancel
          </DialogButton>
          {eligibleOfficers.length > 0 && (
            <DialogButton
              variant="danger"
              type="submit"
              disabled={!canSubmit}
            >
              {isPending && <Loader2 size={16} className="animate-spin" style={{ marginRight: 6 }} />}
              <span>{isPending ? "Transferring…" : "Transfer admin rights"}</span>
            </DialogButton>
          )}
        </DialogFooter>
      </form>
    </Dialog>
  );
}
