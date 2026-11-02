"use client";

import React, { useState } from "react";
import { Copy, Check, AlertCircle, X, Shield, Wallet, UserCheck } from "lucide-react";
import { OfficerRole, ROLE_DETAILS } from "@/src/lib/permissions";
import { createOfficerInvite } from "@/src/app/(workspace)/officers-actions";

interface InviteDialogProps {
  orgId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: { inviteUrl: string; email: string; role: OfficerRole }) => void;
  initialEmail?: string;
  initialRole?: OfficerRole;
}

export function InviteDialog({
  orgId,
  isOpen,
  onClose,
  onSuccess,
  initialEmail = "",
  initialRole = "officer",
}: InviteDialogProps) {
  const [email, setEmail] = useState(initialEmail);
  const [role, setRole] = useState<OfficerRole>(initialRole);
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  // Synchronize when prefilling from "Create new link"
  React.useEffect(() => {
    if (isOpen) {
      setEmail(initialEmail);
      setRole(initialRole);
      setFieldError(null);
      setServerError(null);
    }
  }, [isOpen, initialEmail, initialRole]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldError(null);
    setServerError(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setFieldError("Email is required.");
      return;
    }

    if (!cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      setFieldError("Enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await createOfficerInvite(orgId, cleanEmail, role);
      if (res.success && res.data) {
        onSuccess(res.data);
      } else {
        setServerError(res.errorMessage || "Failed to create invite.");
      }
    } catch {
      setServerError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const roleIcons = {
    admin: Shield,
    finance: Wallet,
    officer: UserCheck,
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-modal-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        backgroundColor: "rgba(24, 24, 27, 0.45)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        boxSizing: "border-box",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        className="orgkit-card"
        style={{
          width: "100%",
          maxWidth: 480,
          backgroundColor: "#FFFFFF",
          borderRadius: 24,
          border: "1px solid #E4E4E7",
          boxShadow: "0 20px 50px rgba(24, 24, 27, 0.12)",
          padding: "28px 24px",
          position: "relative",
          boxSizing: "border-box",
          animation: "cardPopout 0.2s cubic-bezier(0.16, 1, 0.3, 1) both",
        }}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          aria-label="Close modal"
          style={{
            position: "absolute",
            top: 20,
            right: 20,
            width: 32,
            height: 32,
            borderRadius: 8,
            border: "none",
            backgroundColor: "transparent",
            color: "#71717A",
            cursor: loading ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            if (!loading) e.currentTarget.style.backgroundColor = "#F4F4F5";
          }}
          onMouseLeave={(e) => {
            if (!loading) e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div style={{ marginBottom: 20 }}>
          <h2
            id="invite-modal-title"
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "#18181B",
              margin: "0 0 6px 0",
              letterSpacing: "-0.015em",
            }}
          >
            Invite an officer
          </h2>
          <p style={{ fontSize: 13, color: "#71717A", margin: 0, lineHeight: 1.4 }}>
            Create a single-use invite link. It works once and expires in 7 days.
          </p>
        </div>

        {/* Server Save Error Alert (Section 8: Save problems show above list/form) */}
        {serverError && (
          <div
            role="alert"
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              padding: "10px 14px",
              borderRadius: 12,
              backgroundColor: "#FEF2F2",
              border: "1px solid #FCA5A5",
              color: "#DC2626",
              fontSize: 13,
              lineHeight: 1.4,
              marginBottom: 18,
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Email Input */}
          <div style={{ marginBottom: 20 }}>
            <label
              htmlFor="invite-email"
              style={{
                display: "block",
                fontSize: 12.5,
                fontWeight: 600,
                color: "#18181B",
                marginBottom: 6,
              }}
            >
              Email address
            </label>
            <input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldError) setFieldError(null);
              }}
              placeholder="officer@school.edu"
              disabled={loading}
              autoFocus
              style={{
                width: "100%",
                padding: "11px 14px",
                borderRadius: 12,
                border: fieldError ? "1.5px solid #DC2626" : "1px solid #E4E4E7",
                backgroundColor: "#FFFFFF",
                fontSize: 14,
                color: "#18181B",
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.15s ease, box-shadow 0.15s ease",
              }}
              onFocus={(e) => {
                if (!fieldError) {
                  e.currentTarget.style.borderColor = "#059669";
                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(5, 150, 105, 0.12)";
                }
              }}
              onBlur={(e) => {
                if (!fieldError) {
                  e.currentTarget.style.borderColor = "#E4E4E7";
                  e.currentTarget.style.boxShadow = "none";
                }
              }}
            />
            {fieldError && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 6,
                  color: "#DC2626",
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                <AlertCircle size={13} />
                <span>{fieldError}</span>
              </div>
            )}
          </div>

          {/* Role Selection (3 Selectable Cards per Ticket Section 8) */}
          <div style={{ marginBottom: 24 }}>
            <span
              style={{
                display: "block",
                fontSize: 12.5,
                fontWeight: 600,
                color: "#18181B",
                marginBottom: 8,
              }}
            >
              Role
            </span>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(["admin", "finance", "officer"] as OfficerRole[]).map((r) => {
                const isSelected = role === r;
                const details = ROLE_DETAILS[r];
                const Icon = roleIcons[r];

                return (
                  <label
                    key={r}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                      padding: "12px 14px",
                      borderRadius: 14,
                      border: isSelected
                        ? "2px solid #059669"
                        : "1px solid #E4E4E7",
                      backgroundColor: isSelected
                        ? "rgba(5, 150, 105, 0.04)"
                        : "#FFFFFF",
                      cursor: loading ? "not-allowed" : "pointer",
                      transition: "all 0.15s ease",
                      boxSizing: "border-box",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected && !loading) {
                        e.currentTarget.style.borderColor = "#D4D4D8";
                        e.currentTarget.style.backgroundColor = "#FAFAFA";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected && !loading) {
                        e.currentTarget.style.borderColor = "#E4E4E7";
                        e.currentTarget.style.backgroundColor = "#FFFFFF";
                      }
                    }}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={r}
                      checked={isSelected}
                      onChange={() => setRole(r)}
                      disabled={loading}
                      style={{
                        marginTop: 3,
                        accentColor: "#059669",
                        cursor: "pointer",
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 13.5,
                          fontWeight: 600,
                          color: isSelected ? "#047857" : "#18181B",
                          lineHeight: 1.2,
                        }}
                      >
                        <Icon size={15} color={isSelected ? "#059669" : "#71717A"} />
                        <span>{details.label}</span>
                      </div>
                      <p
                        style={{
                          fontSize: 12,
                          color: "#71717A",
                          margin: "4px 0 0 0",
                          lineHeight: 1.35,
                        }}
                      >
                        {details.description}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: "10px 18px",
                borderRadius: 9999,
                border: "1px solid #E4E4E7",
                backgroundColor: "#FFFFFF",
                color: "#52525B",
                fontSize: 13.5,
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "10px 22px",
                borderRadius: 9999,
                border: "none",
                backgroundColor: "#059669",
                color: "#FFFFFF",
                fontSize: 13.5,
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: "0 2px 8px rgba(5, 150, 105, 0.25)",
                opacity: loading ? 0.75 : 1,
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.backgroundColor = "#047857";
              }}
              onMouseLeave={(e) => {
                if (!loading) e.currentTarget.style.backgroundColor = "#059669";
              }}
            >
              {loading ? "Creating…" : "Create invite"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface SuccessPanelProps {
  inviteUrl: string;
  email: string;
  role: OfficerRole;
  onClose: () => void;
}

export function SuccessPanel({ inviteUrl, email, role, onClose }: SuccessPanelProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      const input = document.getElementById("invite-link-input") as HTMLInputElement;
      if (input) {
        input.select();
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="success-panel-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        backgroundColor: "rgba(24, 24, 27, 0.45)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        boxSizing: "border-box",
      }}
    >
      <div
        className="orgkit-card"
        style={{
          width: "100%",
          maxWidth: 480,
          backgroundColor: "#FFFFFF",
          borderRadius: 24,
          border: "1px solid #E4E4E7",
          boxShadow: "0 20px 50px rgba(24, 24, 27, 0.12)",
          padding: "32px 28px",
          boxSizing: "border-box",
          animation: "cardPopout 0.22s cubic-bezier(0.16, 1, 0.3, 1) both",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              backgroundColor: "rgba(5, 150, 105, 0.10)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 14px auto",
            }}
          >
            <Check size={28} color="#059669" strokeWidth={2.5} />
          </div>

          <h2
            id="success-panel-title"
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "#18181B",
              margin: "0 0 6px 0",
              letterSpacing: "-0.015em",
            }}
          >
            Invite link created
          </h2>

          <p style={{ fontSize: 13.5, color: "#52525B", margin: 0, lineHeight: 1.4 }}>
            Invite created. Copy the link and send it to them. It works once, for 7 days.
          </p>
        </div>

        {/* Copy Link Input Bar */}
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 8px 6px 14px",
              borderRadius: 14,
              border: "1px solid #E4E4E7",
              backgroundColor: "#F4F4F5",
            }}
          >
            <input
              id="invite-link-input"
              type="text"
              readOnly
              value={inviteUrl}
              onFocus={(e) => e.currentTarget.select()}
              style={{
                flex: 1,
                border: "none",
                backgroundColor: "transparent",
                fontSize: 13,
                color: "#18181B",
                outline: "none",
                fontFamily: "monospace",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            />

            <button
              type="button"
              onClick={handleCopy}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 10,
                border: "none",
                backgroundColor: copied ? "#059669" : "#18181B",
                color: "#FFFFFF",
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
                flexShrink: 0,
              }}
            >
              {copied ? (
                <>
                  <Check size={14} />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span>Copy link</span>
                </>
              )}
            </button>
          </div>
        </div>

        <p
          style={{
            fontSize: 11.5,
            color: "#71717A",
            textAlign: "center",
            margin: "0 0 24px 0",
            lineHeight: 1.35,
          }}
        >
          For security, the full link is shown once. If lost, you can revoke it and create a new link at any time.
        </p>

        <div style={{ textAlign: "center" }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: "100%",
              padding: "11px 20px",
              borderRadius: 9999,
              border: "1px solid #E4E4E7",
              backgroundColor: "#FFFFFF",
              color: "#18181B",
              fontSize: 13.5,
              fontWeight: 600,
              cursor: "pointer",
              transition: "background-color 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F4F4F5")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#FFFFFF")}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

