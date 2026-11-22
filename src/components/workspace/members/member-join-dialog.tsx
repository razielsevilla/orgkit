"use client";

import { useEffect, useState, useTransition } from "react";
import { X } from "lucide-react";
import { Dialog, DialogBody } from "@/src/components/ui/dialog";
import { setJoinLink, getJoinLink } from "@/src/app/(workspace)/workspace/[id]/members/join/actions";
import { ErrorToast } from "@/src/components/error-toast";
import { JoinPanelHeader } from "@/src/components/workspace/member-join/join-panel-header";
import {
  JoinLinkInput,
  JoinQrPreview,
  JoinCopyAndSave,
} from "@/src/components/workspace/member-join/join-link-display";
import {
  JoinLinkControls,
  JoinTurnOnButton,
  type Confirming,
} from "@/src/components/workspace/member-join/join-link-controls";
import { joinLinkPath } from "@/src/lib/routes";

interface MemberJoinDialogProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  orgName: string;
  schoolName?: string | null;
  siteUrl?: string | null;
  initialToken?: string | null;
  onTokenChange?: (token: string | null) => void;
}

/**
 * Modal dialog for sharing and managing the organization's member join link and QR code.
 * Implements the exact UI from the Join page in an accessible, responsive modal dialog.
 */
export function MemberJoinDialog({
  isOpen,
  onClose,
  orgId,
  orgName,
  schoolName = null,
  siteUrl: propSiteUrl = null,
  initialToken = null,
  onTokenChange,
}: MemberJoinDialogProps) {
  const [token, setToken] = useState<string | null>(initialToken ?? null);
  const [prevInitialToken, setPrevInitialToken] = useState(initialToken);
  const [confirming, setConfirming] = useState<Confirming>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState<{ forUrl: string; dataUrl: string } | null>(null);
  const [pending, startTransition] = useTransition();

  if (initialToken !== prevInitialToken) {
    setPrevInitialToken(initialToken);
    setToken(initialToken ?? null);
  }

  // If initial token wasn't provided, fetch the active link on mount
  useEffect(() => {
    if (initialToken) return;
    let cancelled = false;
    getJoinLink(orgId).then((activeToken) => {
      if (!cancelled && activeToken) {
        setToken(activeToken);
        onTokenChange?.(activeToken);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [orgId, initialToken, onTokenChange]);

  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  const fallbackOrigin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const siteUrl = propSiteUrl || configured || fallbackOrigin;

  const joinUrl = token && siteUrl ? `${siteUrl}${joinLinkPath(token)}` : null;
  const qrUrl = qr && qr.forUrl === joinUrl ? qr.dataUrl : null;

  // Render QR code dynamically when joinUrl is ready
  useEffect(() => {
    if (!joinUrl) return;
    let cancelled = false;
    import("qrcode")
      .then(({ default: QRCode }) =>
        QRCode.toDataURL(joinUrl, { width: 640, margin: 2, errorCorrectionLevel: "M" })
      )
      .then((dataUrl) => {
        if (!cancelled) setQr({ forUrl: joinUrl, dataUrl });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [joinUrl]);

  function change(action: "on" | "off" | "regenerate") {
    setError(null);
    setConfirming(null);
    startTransition(async () => {
      const result = await setJoinLink(orgId, action);
      if (result.ok) {
        setToken(result.token);
        onTokenChange?.(result.token);
      } else {
        setError(result.error ?? "We couldn't update the link. Please try again.");
      }
    });
  }

  async function copyLink() {
    if (!joinUrl) return;
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy automatically. Select the link and copy it.");
    }
  }

  if (!isOpen) return null;

  const qrFileName = `${orgName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "org"}-join-qr.png`;

  return (
    <>
    <Dialog
      labelledBy="member-join-title"
      onDismiss={onClose}
      maxWidth={token && joinUrl ? 740 : 500}
      cardStyle={{
        position: "relative",
        transition: "max-width 0.25s ease",
      }}
    >
      <style>{`
        /* The content scrolls inside the dialog (DialogBody), so the buttons at the
           bottom are always reachable on a short phone. On a phone the top gets extra
           room for the close button, which floats in the corner. */
        .mj-body { padding: clamp(24px, 4vw, 36px) clamp(20px, 4vw, 36px); }
        @media (max-width: 640px) {
          .mj-body { padding-top: 64px; }
        }
        .mj-btn:hover:not(:disabled) { filter: brightness(0.96); }
        .mj-primary:hover:not(:disabled) {
          background-color: var(--color-accent-strong) !important;
          box-shadow: 0 4px 14px color-mix(in srgb, var(--color-accent) 28%, transparent) !important;
          filter: none;
        }
        .mj-btn:disabled { opacity: 0.6; cursor: default; }
        .mj-btn:focus-visible, .mj-link-input:focus-visible {
          outline: none;
          box-shadow: 0 0 0 2px var(--color-surface), 0 0 0 4px var(--color-accent);
        }
        .mj-dialog-grid {
          display: grid;
          /* minmax(0, 1fr): a wide link or input cannot stretch the column past the dialog */
          grid-template-columns: minmax(0, 1fr);
          gap: 28px;
          align-items: center;
          width: 100%;
        }
        @media (min-width: 640px) {
          .mj-dialog-grid-on {
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
            gap: 36px;
          }
        }
      `}</style>

      {/* Accessible modal close button */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close join modal"
        data-autofocus
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          width: 32,
          height: 32,
          borderRadius: "50%",
          border: "1px solid var(--color-line)",
          backgroundColor: "var(--color-surface)",
          color: "var(--color-muted)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          zIndex: 20,
          transition: "all 0.15s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "var(--color-base)";
          e.currentTarget.style.color = "var(--color-ink)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "var(--color-surface)";
          e.currentTarget.style.color = "var(--color-muted)";
        }}
      >
        <X size={16} />
      </button>

      <DialogBody style={{ padding: 0 }}>
      <div className="mj-body">
      {/* Two columns when active, centered single column when off */}
      <div className={token && joinUrl ? "mj-dialog-grid mj-dialog-grid-on" : "mj-dialog-grid"}>
        <JoinPanelHeader orgName={orgName} schoolName={schoolName} token={token} />

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, width: "100%" }}>
          {!siteUrl && (
            <p role="alert" style={{ margin: 0, fontSize: 14, color: "var(--color-danger)", textAlign: "center" }}>
              The app&apos;s public address isn&apos;t set up yet, so a link can&apos;t be shown.
              Set NEXT_PUBLIC_SITE_URL.
            </p>
          )}

          {token && joinUrl ? (
            <>
              <JoinLinkInput joinUrl={joinUrl} />

              <JoinQrPreview qrUrl={qrUrl} orgName={orgName} />

              <JoinCopyAndSave
                copied={copied}
                onCopy={copyLink}
                qrUrl={qrUrl}
                qrFileName={qrFileName}
              />

              <JoinLinkControls
                confirming={confirming}
                pending={pending}
                onConfirm={change}
                onSetConfirming={setConfirming}
              />
            </>
          ) : (
            <JoinTurnOnButton pending={pending} siteUrl={siteUrl} onTurnOn={() => change("on")} />
          )}
        </div>
      </div>
      </div>
      </DialogBody>
    </Dialog>

    {/* Outside the dialog: the dialog card keeps a transform, which would pin a fixed toast to the card */}
    <ErrorToast message={error} onDismiss={() => setError(null)} />
    </>
  );
}
