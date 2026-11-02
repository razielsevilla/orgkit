"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Plus_Jakarta_Sans } from "next/font/google";
import QRCode from "qrcode";
import { ArrowLeft, Check, Copy, Download, Link2Off, QrCode, RefreshCw } from "lucide-react";
import { Sidebar } from "@/src/components/sidebar";
import type { OfficerProfile } from "@/src/components/navbar";
import { Card, CardBadge, CardDescription, CardHeader, CardTitle } from "@/src/components/card";
import { FloatingIconsDecor } from "@/src/components/floating-decor";
import { useSidebarCollapsed } from "@/src/lib/use-sidebar-collapsed";
import { setJoinLink } from "./actions";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

type Confirming = "off" | "regenerate" | null;

const btnBase: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  height: 46,
  padding: "0 22px",
  borderRadius: 9999,
  fontSize: 14,
  fontWeight: 600,
  fontFamily: "inherit",
  cursor: "pointer",
  textDecoration: "none",
  boxSizing: "border-box",
  whiteSpace: "nowrap",
  transition: "all 0.15s ease",
};
// Matches the call-to-action button on the workspace home
const primaryBtn: React.CSSProperties = {
  ...btnBase,
  backgroundColor: "#059669",
  color: "#FFFFFF",
  border: "none",
  boxShadow: "0 2px 8px rgba(5, 150, 105, 0.2)",
};
const secondaryBtn: React.CSSProperties = {
  ...btnBase,
  backgroundColor: "#FFFFFF",
  color: "#18181B",
  border: "1px solid #E4E4E7",
};

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

  const joinUrl = token && siteUrl ? `${siteUrl}/join/${token}` : null;
  // Only show a QR that was drawn from the link currently on screen
  const qrUrl = qr && qr.forUrl === joinUrl ? qr.dataUrl : null;

  // The QR is drawn from the same link that is shown and copied
  useEffect(() => {
    if (!joinUrl) return;
    let cancelled = false;
    QRCode.toDataURL(joinUrl, { width: 640, margin: 2, errorCorrectionLevel: "M" })
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
        backgroundColor: "#F4F4F5",
        color: "#18181B",
      }}
    >
      <style>{`
        @keyframes cardPopout {
          0% { opacity: 0; transform: scale(0.92) translateY(12px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .mj-sidebar { display: none; }
        .mj-back { display: inline-flex; }
        @media (min-width: 1024px) {
          .mj-shell { height: 100vh; overflow: hidden; }
          .mj-sidebar { display: block; }
          .mj-back { display: none; }
        }
        .mj-btn:hover:not(:disabled) { filter: brightness(0.96); }
        .mj-primary:hover:not(:disabled) {
          background-color: #047857 !important;
          box-shadow: 0 4px 14px rgba(5, 150, 105, 0.28) !important;
          filter: none;
        }
        .mj-btn:disabled { opacity: 0.6; cursor: default; }
        .mj-btn:focus-visible, .mj-link-input:focus-visible {
          outline: none;
          box-shadow: 0 0 0 2px #FFFFFF, 0 0 0 4px #059669;
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
          backgroundColor: "#F4F4F5",
        }}
      >
        {/* Background concentric circles, same as the workspace home */}
        <div
          aria-hidden
          style={{ position: "absolute", top: 0, left: 0, width: 320, height: 320, pointerEvents: "none" }}
        >
          <svg viewBox="0 0 320 320" fill="none" style={{ width: "100%", height: "100%" }}>
            <circle cx="0" cy="0" r="240" fill="rgba(5, 150, 105, 0.05)" />
            <circle cx="0" cy="0" r="180" stroke="rgba(5, 150, 105, 0.12)" strokeWidth="1.2" />
            <circle cx="0" cy="0" r="300" stroke="rgba(5, 150, 105, 0.08)" strokeWidth="1.2" />
          </svg>
        </div>
        <div
          aria-hidden
          style={{ position: "absolute", bottom: 0, right: 0, width: 380, height: 380, pointerEvents: "none" }}
        >
          <svg viewBox="0 0 380 380" fill="none" style={{ width: "100%", height: "100%" }}>
            <circle cx="380" cy="380" r="320" stroke="rgba(5, 150, 105, 0.12)" strokeWidth="1.2" />
            <circle cx="380" cy="380" r="240" stroke="rgba(5, 150, 105, 0.10)" strokeWidth="1.2" />
            <circle cx="380" cy="380" r="160" stroke="rgba(5, 150, 105, 0.08)" strokeWidth="1.2" />
          </svg>
        </div>

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
              href={`/org/${orgId}`}
              className="mj-back"
              style={{
                alignItems: "center",
                gap: 6,
                marginBottom: 16,
                fontSize: 14,
                fontWeight: 600,
                color: "#059669",
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
                <CardHeader style={{ marginBottom: 0 }}>
                  <CardBadge size={72} style={{ marginBottom: 20 }}>
                    <QrCode size={32} color="#059669" strokeWidth={2} />
                  </CardBadge>
                  <p style={{ margin: "0 0 6px 0", fontSize: 13.5, fontWeight: 600, color: "#059669" }}>
                    {schoolName ? `${orgName} · ${schoolName}` : orgName}
                  </p>
                  <CardTitle style={{ fontSize: 27, lineHeight: 1.2, margin: "0 0 8px 0" }}>
                    Member join
                  </CardTitle>
                  <CardDescription
                    style={{ fontSize: 14.5, color: "#71717A", lineHeight: 1.4, maxWidth: 320 }}
                  >
                    {token
                      ? "Your join link is ready. Share it, or show the QR at your next event."
                      : "The link is off. Anyone who opens an old link or QR sees that it isn't active."}
                  </CardDescription>
                  <span
                    style={{
                      marginTop: 14,
                      borderRadius: 9999,
                      padding: "4px 12px",
                      fontSize: 12,
                      fontWeight: 600,
                      backgroundColor: token ? "rgba(5, 150, 105, 0.10)" : "#F4F4F5",
                      color: token ? "#047857" : "#71717A",
                    }}
                  >
                    {token ? "Link is on" : "Link is off"}
                  </span>
                </CardHeader>

                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
                  {!siteUrl && (
                    <p role="alert" style={{ margin: 0, fontSize: 14, color: "#DC2626", textAlign: "center" }}>
                      The app&apos;s public address isn&apos;t set up yet, so a link can&apos;t be shown.
                      Set NEXT_PUBLIC_SITE_URL.
                    </p>
                  )}

                  {token && joinUrl ? (
                    <>
                      <input
                        readOnly
                        value={joinUrl}
                        aria-label="Join link"
                        className="mj-link-input"
                        onFocus={(e) => e.currentTarget.select()}
                        style={{
                          width: "100%",
                          height: 46,
                          padding: "0 14px",
                          borderRadius: 12,
                          border: "1px solid #E4E4E7",
                          backgroundColor: "#F4F4F5",
                          fontSize: 14,
                          fontFamily: "inherit",
                          color: "#18181B",
                          boxSizing: "border-box",
                        }}
                      />

                      <div
                        style={{
                          width: "100%",
                          display: "flex",
                          justifyContent: "center",
                          padding: 14,
                          borderRadius: 18,
                          border: "1px solid #E4E4E7",
                          backgroundColor: "#FFFFFF",
                          boxSizing: "border-box",
                        }}
                      >
                        {qrUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={qrUrl}
                            alt={`QR code to join ${orgName}`}
                            width={176}
                            height={176}
                            style={{ width: 176, height: 176, display: "block" }}
                          />
                        ) : (
                          <div
                            aria-hidden
                            style={{ width: 176, height: 176, borderRadius: 12, backgroundColor: "#F4F4F5" }}
                          />
                        )}
                      </div>

                      <div style={{ width: "100%", display: "flex", gap: 8 }}>
                        <button
                          type="button"
                          onClick={copyLink}
                          className="mj-btn"
                          style={{ ...secondaryBtn, flex: 1, padding: "0 12px" }}
                        >
                          {copied ? <Check size={16} /> : <Copy size={16} />}
                          {copied ? "Copied" : "Copy link"}
                        </button>
                        {qrUrl ? (
                          <a
                            href={qrUrl}
                            download={qrFileName}
                            className="mj-btn"
                            style={{ ...secondaryBtn, flex: 1, padding: "0 12px" }}
                          >
                            <Download size={16} /> Save QR
                          </a>
                        ) : (
                          <span style={{ flex: 1 }} />
                        )}
                      </div>

                      {confirming ? (
                        <div
                          style={{
                            width: "100%",
                            padding: 14,
                            borderRadius: 16,
                            border: "1px solid #E4E4E7",
                            backgroundColor: "#F4F4F5",
                            boxSizing: "border-box",
                          }}
                        >
                          <p style={{ margin: "0 0 10px 0", fontSize: 14, color: "#18181B" }}>
                            {confirming === "off"
                              ? "Turn off the link? The current link and QR will stop working."
                              : "Make a new link? The old link and QR will stop working."}
                          </p>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              type="button"
                              onClick={() => change(confirming)}
                              disabled={pending}
                              className="mj-btn mj-primary"
                              style={{ ...primaryBtn, flex: 1, padding: "0 12px" }}
                            >
                              {confirming === "off" ? "Turn off" : "Make new link"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirming(null)}
                              className="mj-btn"
                              style={{ ...secondaryBtn, flex: 1, padding: "0 12px" }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ width: "100%", display: "flex", gap: 8 }}>
                          <button
                            type="button"
                            onClick={() => setConfirming("regenerate")}
                            disabled={pending}
                            className="mj-btn"
                            style={{ ...secondaryBtn, flex: 1, padding: "0 12px" }}
                          >
                            <RefreshCw size={16} /> New link
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirming("off")}
                            disabled={pending}
                            className="mj-btn"
                            style={{ ...secondaryBtn, flex: 1, padding: "0 12px" }}
                          >
                            <Link2Off size={16} /> Turn off
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => change("on")}
                      disabled={pending || !siteUrl}
                      className="mj-btn mj-primary"
                      style={primaryBtn}
                    >
                      {pending ? "Turning on…" : "Turn on link"}
                    </button>
                  )}

                  <div aria-live="polite" style={{ minHeight: 18, textAlign: "center" }}>
                    {error && (
                      <p role="alert" style={{ margin: 0, fontSize: 14, color: "#DC2626" }}>
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
