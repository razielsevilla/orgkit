"use client";

import React, { useEffect, useState, useTransition } from "react";
import {
  Check,
  Copy,
  Download,
  Loader2,
  PauseCircle,
  PlayCircle,
  QrCode,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";
import {
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogButton,
} from "@/src/components/ui/dialog";
import type { DuesPeriod } from "@/src/app/(workspace)/dues-shared";
import { getDuesPayLink, setDuesPayLink } from "@/src/app/(workspace)/dues-periods-actions";
import { payLinkPath } from "@/src/lib/routes";
import { formatDueDate, formatPesos } from "./dues-table";

interface DuesPayLinkDialogProps {
  period: DuesPeriod | null;
  isOpen: boolean;
  onClose: () => void;
  siteUrl: string | null;
  orgId: string;
  onLinkUpdated?: (
    periodId: string,
    payToken: string | null,
    payLinkActive: boolean
  ) => void;
}

export function DuesPayLinkDialog({
  period,
  isOpen,
  onClose,
  siteUrl,
  orgId,
  onLinkUpdated,
}: DuesPayLinkDialogProps) {
  if (!isOpen || !period) return null;

  return (
    <DuesPayLinkDialogContent
      key={period.id}
      period={period}
      onClose={onClose}
      siteUrl={siteUrl}
      orgId={orgId}
      onLinkUpdated={onLinkUpdated}
    />
  );
}

function DuesPayLinkDialogContent({
  period,
  onClose,
  siteUrl,
  orgId,
  onLinkUpdated,
}: {
  period: DuesPeriod;
  onClose: () => void;
  siteUrl: string | null;
  orgId: string;
  onLinkUpdated?: (
    periodId: string,
    payToken: string | null,
    payLinkActive: boolean
  ) => void;
}) {
  const isPeriodClosed = period.status === "closed";

  const [token, setToken] = useState<string | null>(period.payToken ?? null);
  const [isActive, setIsActive] = useState<boolean>(
    !isPeriodClosed && Boolean(period.payLinkActive ?? true)
  );
  const [confirmAction, setConfirmAction] = useState<"off" | "rotate" | null>(
    null
  );
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState<{ forUrl: string; dataUrl: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(
    !period.payToken && !isPeriodClosed
  );

  const titleId = "dues-pay-link-dialog-title";

  // Use siteUrl prop or fallback to client-side window.location.origin
  const clientOrigin =
    siteUrl || (typeof window !== "undefined" ? window.location.origin : "");
  const payUrl =
    token && clientOrigin ? `${clientOrigin}${payLinkPath(token)}` : null;
  const qrUrl = isActive && qr && qr.forUrl === payUrl ? qr.dataUrl : null;

  // Auto-fetch or generate link token if not present on period
  useEffect(() => {
    if (token || isPeriodClosed) return;
    let cancelled = false;

    async function loadOrGenerateToken() {
      setIsInitialLoading(true);
      try {
        const fetchRes = await getDuesPayLink(orgId, period.id);
        if (cancelled) return;

        if (fetchRes.success && fetchRes.data?.payToken) {
          const payData = fetchRes.data;
          setToken(payData.payToken);
          setIsActive(payData.payLinkActive);
          onLinkUpdated?.(
            period.id,
            payData.payToken,
            payData.payLinkActive
          );
          return;
        }

        // If not found or null token, activate link to generate one
        const genRes = await setDuesPayLink(orgId, period.id, "on");
        if (cancelled) return;

        if (genRes.success && genRes.data?.payToken) {
          const genData = genRes.data;
          setToken(genData.payToken);
          setIsActive(genData.payLinkActive);
          onLinkUpdated?.(
            period.id,
            genData.payToken,
            genData.payLinkActive
          );
        } else {
          setErrorMessage(
            genRes.error === "closed_period"
              ? "This dues period is closed."
              : "Could not load or generate payment link automatically. Please ensure migration 20261115120000_p2_dues_payments.sql has been run in Supabase, or click 'Rotate link'."
          );
        }
      } catch {
        if (!cancelled) {
          setErrorMessage(
            "Failed to load payment link. Please check your network and Supabase connection."
          );
        }
      } finally {
        if (!cancelled) {
          setIsInitialLoading(false);
        }
      }
    }

    loadOrGenerateToken();

    return () => {
      cancelled = true;
    };
  }, [token, isPeriodClosed, orgId, period.id, onLinkUpdated]);

  // Generate QR code dynamically from link
  useEffect(() => {
    if (!payUrl || !isActive) return;
    let cancelled = false;
    import("qrcode")
      .then(({ default: QRCode }) =>
        QRCode.toDataURL(payUrl, {
          width: 500,
          margin: 2,
          errorCorrectionLevel: "M",
          color: {
            dark: "#18181b",
            light: "#ffffff",
          },
        })
      )
      .then((dataUrl) => {
        if (!cancelled) setQr({ forUrl: payUrl, dataUrl });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [payUrl, isActive]);

  const handleCopy = async () => {
    if (!payUrl) return;
    try {
      await navigator.clipboard.writeText(payUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setErrorMessage("Couldn't copy automatically. Select and copy the text.");
    }
  };

  const handleLinkAction = (action: "on" | "off" | "rotate") => {
    setErrorMessage(null);
    setConfirmAction(null);

    startTransition(async () => {
      const res = await setDuesPayLink(orgId, period.id, action);
      if (res.success && res.data) {
        if (action === "rotate" && res.data.payToken) {
          setToken(res.data.payToken);
          setIsActive(true);
          onLinkUpdated?.(period.id, res.data.payToken, true);
        } else if (action === "off") {
          setIsActive(false);
          onLinkUpdated?.(period.id, token, false);
        } else if (action === "on") {
          setIsActive(true);
          if (res.data.payToken) setToken(res.data.payToken);
          onLinkUpdated?.(period.id, res.data.payToken || token, true);
        }
      } else {
        setErrorMessage(
          res.errorMessage || "Failed to update payment link. Try again."
        );
      }
    });
  };

  const qrFileName = `${period.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "dues"}-payment-qr.png`;

  return (
    <Dialog
      role="dialog"
      labelledBy={titleId}
      onDismiss={isPending ? undefined : onClose}
      maxWidth={480}
    >
      <DialogHeader
        title="Payment link"
        description={`${period.name} · ${formatPesos(period.amount)} · Due ${formatDueDate(period.dueOn)}`}
        titleId={titleId}
        onClose={isPending ? undefined : onClose}
      />

      <DialogBody>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {errorMessage && (
            <div
              role="alert"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 14px",
                backgroundColor:
                  "color-mix(in srgb, var(--color-danger) 10%, transparent)",
                border:
                  "1px solid color-mix(in srgb, var(--color-danger) 25%, transparent)",
                borderRadius: 10,
                color: "var(--color-danger-strong)",
                fontSize: 13,
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Period closed warning */}
          {isPeriodClosed ? (
            <div
              style={{
                padding: "14px 16px",
                borderRadius: 12,
                backgroundColor:
                  "color-mix(in srgb, var(--color-base) 80%, transparent)",
                border: "1px solid var(--color-line)",
                display: "flex",
                flexDirection: "column",
                gap: 6,
                fontSize: 13,
                color: "var(--color-muted-strong)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontWeight: 600,
                  color: "var(--color-ink)",
                }}
              >
                <AlertCircle size={16} color="var(--color-muted)" />
                <span>Period is closed</span>
              </div>
              <p style={{ margin: 0, lineHeight: 1.4 }}>
                This dues period is closed and no longer accepts submissions.
                The payment link is permanently inactive.
              </p>
            </div>
          ) : (
            <>
              {/* Status pill & Controls banner */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 8,
                  padding: "10px 14px",
                  borderRadius: 12,
                  backgroundColor: isActive
                    ? "color-mix(in srgb, var(--color-accent) 8%, transparent)"
                    : "color-mix(in srgb, var(--color-muted) 12%, transparent)",
                  border: `1px solid ${
                    isActive
                      ? "color-mix(in srgb, var(--color-accent) 25%, transparent)"
                      : "var(--color-line)"
                  }`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      backgroundColor: isActive
                        ? "var(--color-accent)"
                        : "var(--color-muted)",
                    }}
                  />
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: isActive
                        ? "var(--color-accent-strong, var(--color-ink))"
                        : "var(--color-muted-strong)",
                    }}
                  >
                    {isActive ? "Link is active" : "Link is paused"}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {isActive ? (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => setConfirmAction("off")}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        height: 28,
                        padding: "0 10px",
                        borderRadius: 6,
                        backgroundColor: "var(--color-surface)",
                        border: "1px solid var(--color-line)",
                        fontSize: 12,
                        fontWeight: 500,
                        color: "var(--color-danger-strong)",
                        cursor: isPending ? "not-allowed" : "pointer",
                      }}
                    >
                      <PauseCircle size={13} />
                      Turn off
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleLinkAction("on")}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        height: 28,
                        padding: "0 10px",
                        borderRadius: 6,
                        backgroundColor: "var(--color-accent)",
                        border: "none",
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#fff",
                        cursor: isPending ? "not-allowed" : "pointer",
                      }}
                    >
                      {isPending ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <PlayCircle size={13} />
                      )}
                      Turn on
                    </button>
                  )}
                </div>
              </div>

              {/* Confirmation prompts for Pause or Rotate */}
              {confirmAction === "off" && (
                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: 10,
                    backgroundColor:
                      "color-mix(in srgb, var(--color-danger) 8%, transparent)",
                    border:
                      "1px solid color-mix(in srgb, var(--color-danger) 20%, transparent)",
                    fontSize: 12.5,
                  }}
                >
                  <p
                    style={{
                      margin: "0 0 10px 0",
                      fontWeight: 600,
                      color: "var(--color-danger-strong)",
                    }}
                  >
                    Pause this payment link?
                  </p>
                  <p
                    style={{
                      margin: "0 0 12px 0",
                      color: "var(--color-ink)",
                      lineHeight: 1.4,
                    }}
                  >
                    Members visiting this link will see that submissions are
                    currently closed until you turn it back on.
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleLinkAction("off")}
                      style={{
                        height: 30,
                        padding: "0 12px",
                        borderRadius: 6,
                        backgroundColor: "var(--color-danger)",
                        color: "#fff",
                        border: "none",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {isPending ? "Pausing..." : "Yes, turn off link"}
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => setConfirmAction(null)}
                      style={{
                        height: 30,
                        padding: "0 12px",
                        borderRadius: 6,
                        backgroundColor: "var(--color-surface)",
                        border: "1px solid var(--color-line)",
                        fontSize: 12,
                        color: "var(--color-ink)",
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {confirmAction === "rotate" && (
                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: 10,
                    backgroundColor:
                      "color-mix(in srgb, var(--color-warning, #D97706) 10%, transparent)",
                    border:
                      "1px solid color-mix(in srgb, var(--color-warning, #D97706) 25%, transparent)",
                    fontSize: 12.5,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontWeight: 600,
                      color: "var(--color-warning-strong, #B45309)",
                      marginBottom: 6,
                    }}
                  >
                    <AlertTriangle size={15} />
                    <span>Rotate payment link?</span>
                  </div>
                  <p
                    style={{
                      margin: "0 0 12px 0",
                      color: "var(--color-ink)",
                      lineHeight: 1.4,
                    }}
                  >
                    The current link and QR code will immediately stop working.
                    Members who have the previous link will need the new one.
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleLinkAction("rotate")}
                      style={{
                        height: 30,
                        padding: "0 12px",
                        borderRadius: 6,
                        backgroundColor: "var(--color-ink)",
                        color: "#fff",
                        border: "none",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {isPending ? "Rotating..." : "Yes, rotate link"}
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => setConfirmAction(null)}
                      style={{
                        height: 30,
                        padding: "0 12px",
                        borderRadius: 6,
                        backgroundColor: "var(--color-surface)",
                        border: "1px solid var(--color-line)",
                        fontSize: 12,
                        color: "var(--color-ink)",
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Link Input & Copy */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--color-muted-strong)",
                  }}
                >
                  Public payment link
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="text"
                    readOnly
                    value={
                      isInitialLoading
                        ? "Generating payment link..."
                        : payUrl || "Link not generated yet"
                    }
                    onFocus={(e) => e.currentTarget.select()}
                    aria-label="Payment link"
                    style={{
                      flex: 1,
                      // Without min-width: 0 an input never shrinks below its natural width, which pushed the Copy button out
                      minWidth: 0,
                      height: 40,
                      padding: "0 12px",
                      borderRadius: 10,
                      border: "1px solid var(--color-line)",
                      backgroundColor: "var(--color-base)",
                      color: "var(--color-ink)",
                      fontSize: 13,
                      fontFamily: "inherit",
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleCopy}
                    disabled={!payUrl}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      height: 40,
                      padding: "0 14px",
                      borderRadius: 10,
                      backgroundColor: copied
                        ? "color-mix(in srgb, var(--color-accent) 15%, transparent)"
                        : "var(--color-surface)",
                      border: `1px solid ${
                        copied ? "var(--color-accent)" : "var(--color-line)"
                      }`,
                      color: copied
                        ? "var(--color-accent-strong)"
                        : "var(--color-ink)",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: !payUrl ? "not-allowed" : "pointer",
                      transition: "all 0.15s ease",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {copied ? <Check size={15} /> : <Copy size={15} />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>

              {/* QR Code Preview */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  padding: "16px",
                  borderRadius: 16,
                  border: "1px solid var(--color-line)",
                  backgroundColor: "var(--color-base)",
                  gap: 12,
                }}
              >
                {isInitialLoading ? (
                  <div
                    style={{
                      width: 180,
                      height: 180,
                      borderRadius: 12,
                      border: "1px dashed var(--color-line)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      color: "var(--color-muted)",
                      backgroundColor: "var(--color-surface)",
                    }}
                  >
                    <Loader2 size={32} className="animate-spin" color="var(--color-accent)" />
                    <span style={{ fontSize: 12 }}>Generating link & QR...</span>
                  </div>
                ) : isActive && qrUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrUrl}
                    alt={`Payment QR code for ${period.name}`}
                    width={180}
                    height={180}
                    style={{
                      width: 180,
                      height: 180,
                      borderRadius: 12,
                      backgroundColor: "#fff",
                      padding: 8,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 180,
                      height: 180,
                      borderRadius: 12,
                      border: "1px dashed var(--color-line)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      color: "var(--color-muted)",
                      backgroundColor: "var(--color-surface)",
                    }}
                  >
                    <QrCode size={36} strokeWidth={1.5} />
                    <span style={{ fontSize: 12 }}>
                      {isActive ? "Generating QR..." : "QR paused"}
                    </span>
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    width: "100%",
                    justifyContent: "center",
                    flexWrap: "wrap",
                  }}
                >
                  {isActive && qrUrl && (
                    <a
                      href={qrUrl}
                      download={qrFileName}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        height: 34,
                        padding: "0 14px",
                        borderRadius: 8,
                        backgroundColor: "var(--color-surface)",
                        border: "1px solid var(--color-line)",
                        color: "var(--color-ink)",
                        fontSize: 12.5,
                        fontWeight: 600,
                        textDecoration: "none",
                        cursor: "pointer",
                      }}
                    >
                      <Download size={14} />
                      Save QR code
                    </a>
                  )}

                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => setConfirmAction("rotate")}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      height: 34,
                      padding: "0 12px",
                      borderRadius: 8,
                      backgroundColor: "var(--color-surface)",
                      border: "1px solid var(--color-line)",
                      color: "var(--color-muted-strong)",
                      fontSize: 12.5,
                      fontWeight: 500,
                      cursor: isPending ? "not-allowed" : "pointer",
                    }}
                  >
                    <RefreshCw size={13} />
                    Rotate link
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogBody>

      <DialogFooter>
        <DialogButton variant="secondary" onClick={onClose}>
          Done
        </DialogButton>
      </DialogFooter>
    </Dialog>
  );
}
