"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { plusJakarta } from "@/src/lib/fonts";
import { ArrowLeft } from "lucide-react";
import { Sidebar } from "@/src/components/layout/sidebar";
import type { OfficerProfile } from "@/src/components/layout/navbar";
import { Card } from "@/src/components/ui/card";
import { FloatingIconsDecor } from "@/src/components/decor/floating-decor";
import { useSidebarCollapsed } from "@/src/lib/use-sidebar-collapsed";
import { setJoinLink } from "@/src/app/(workspace)/workspace/[id]/members/join/actions";
import { JoinPanelBackdrop } from "./join-panel-backdrop";
import { JoinPanelHeader } from "./join-panel-header";
import { JoinLinkInput, JoinQrPreview, JoinCopyAndSave } from "./join-link-display";
import { JoinLinkControls, JoinTurnOnButton, type Confirming } from "./join-link-controls";
import { joinLinkPath, workspacePath } from "@/src/lib/routes";

export function JoinPanel({
  orgId,
  orgName,
  schoolName,
  officer,
  siteUrl,
  initialToken,
}: {
  orgId: string;
  orgName: string;
  schoolName: string | null;
  officer: OfficerProfile;
  siteUrl: string | null;
  initialToken: string | null;
}) {
  const [token, setToken] = useState<string | null>(initialToken);
  const [confirming, setConfirming] = useState<Confirming>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState<{ forUrl: string; dataUrl: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [isSidebarCollapsed, toggleSidebar] = useSidebarCollapsed();

  const joinUrl = token && siteUrl ? `${siteUrl}${joinLinkPath(token)}` : null;
  // Only show a QR that was drawn from the link currently on screen
  const qrUrl = qr && qr.forUrl === joinUrl ? qr.dataUrl : null;

  // The QR is drawn from the same link that is shown and copied
  useEffect(() => {
    if (!joinUrl) return;
    let cancelled = false;
    // Loaded on demand: the QR library is only needed once there is a link to draw
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

  const qrFileName = `${orgName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "org"}-join-qr.png`;

  return (
    <div
      className={`${plusJakarta.className} mj-shell`}
      style={{
        display: "flex",
        minHeight: "100vh",
        backgroundColor: "var(--color-base)",
        color: "var(--color-ink)",
      }}
    >
      <style>{`
        .mj-sidebar { display: none; }
        .mj-back { display: inline-flex; }
        @media (min-width: 1024px) {
          .mj-shell { height: 100vh; overflow: hidden; }
          .mj-sidebar { display: block; }
          .mj-back { display: none; }
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
        .mj-wrap { container-type: inline-size; }
        .mj-grid { display: grid; grid-template-columns: 1fr; gap: 28px; align-items: center; }
        @container (min-width: 640px) {
          .mj-grid-on { grid-template-columns: 1fr 1fr; gap: 40px; }
        }
        @media (max-width: 639px) {
          .orgkit-floating-decor { display: none !important; }
        }
      `}</style>

      <div className="mj-sidebar">
        <Sidebar
          rawId={orgId}
          orgName={orgName}
          schoolName={schoolName}
          officer={officer}
          isAdmin
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebar}
          activePath="member-join"
        />
      </div>

      <main
        style={{
          position: "relative",
          flex: 1,
          minWidth: 0,
          height: "100vh",
          overflow: "hidden",
          backgroundColor: "var(--color-base)",
        }}
      >
        <JoinPanelBackdrop />

        {/* Scrolls when the card is taller than the window; centred when it fits */}
        <div
          style={{
            position: "relative",
            zIndex: 2,
            height: "100%",
            overflowY: "auto",
            display: "flex",
            padding: "24px clamp(16px, 4vw, 24px)",
            boxSizing: "border-box",
          }}
        >
          <div
            className="mj-wrap"
            style={{
              position: "relative",
              width: "100%",
              maxWidth: 760,
              margin: "auto",
              animation: "cardPopout 0.45s cubic-bezier(0.16, 1.25, 0.38, 1) both",
            }}
          >
            <Link
              href={workspacePath(orgId)}
              className="mj-back"
              style={{
                alignItems: "center",
                gap: 6,
                marginBottom: 16,
                fontSize: 14,
                fontWeight: 600,
                color: "var(--color-accent)",
                textDecoration: "none",
              }}
            >
              <ArrowLeft size={16} /> Back to workspace
            </Link>

            <FloatingIconsDecor />

            <Card
              maxWidth={760}
              padding="clamp(24px, 4vw, 40px) clamp(20px, 4vw, 40px)"
            >
              {/* Two columns when the card is wide enough, stacked otherwise */}
              <div className={token && joinUrl ? "mj-grid mj-grid-on" : "mj-grid"}>
                <JoinPanelHeader orgName={orgName} schoolName={schoolName} token={token} />

                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
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

                  <div aria-live="polite" style={{ minHeight: 18, textAlign: "center" }}>
                    {error && (
                      <p role="alert" style={{ margin: 0, fontSize: 14, color: "var(--color-danger)" }}>
                        {error}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
