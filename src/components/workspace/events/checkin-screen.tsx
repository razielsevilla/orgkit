"use client";

import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { AlertCircle, ArrowLeft, Loader2, QrCode, Users, WifiOff } from "lucide-react";
import {
  getCheckinTokenAction,
  setCheckinOpenAction,
  type WorkspaceEvent,
} from "@/src/app/(workspace)/events-actions";
import { Dialog, DialogBody, DialogButton, DialogFooter, DialogHeader } from "@/src/components/ui/dialog";
import { ErrorToast } from "@/src/components/error-toast";
import { useMounted } from "@/src/lib/use-mounted";
import { eventPath } from "@/src/lib/routes";
import { CHECKIN_MESSAGES, type CheckinBlock } from "@/src/lib/events/checkin-eligibility";
import { CHECKIN_QR_SIZE, CheckinQrSkeleton } from "./checkin-skeleton";

type Phase = "closed" | "loading" | "live" | "reconnecting" | "unavailable";

/** How often the screen checks the clock: drives the ring, the rotation and the stale check */
const TICK_MS = 250;
/** A code this long past its slot, with no new one, is treated as lost */
const STALE_MS = 5000;
/** How often a failed refresh is tried again */
const RETRY_MS = 2500;
/** Used until the first code says how long a slot is */
const DEFAULT_SLOT_MS = 30_000;

interface LiveCode {
  url: string;
  expiresAtMs: number;
  slotMs: number;
  count: number;
}

const RING_RADIUS = 18;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

/** A small ring that empties as the current code runs out */
function CountdownRing({ remainingMs, slotMs }: { remainingMs: number; slotMs: number }) {
  const fraction = Math.min(1, Math.max(0, remainingMs / slotMs));
  return (
    <svg width={44} height={44} viewBox="0 0 44 44" role="img" aria-label={`New code in ${Math.ceil(remainingMs / 1000)} seconds`}>
      <circle cx={22} cy={22} r={RING_RADIUS} fill="none" stroke="var(--color-line)" strokeWidth={4} />
      <circle
        cx={22}
        cy={22}
        r={RING_RADIUS}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray={RING_LENGTH}
        strokeDashoffset={RING_LENGTH * (1 - fraction)}
        transform="rotate(-90 22 22)"
        className="orgkit-checkin-ring"
      />
      <text
        x={22}
        y={22}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={13}
        fontWeight={700}
        fill="var(--color-ink)"
      >
        {Math.max(0, Math.ceil(remainingMs / 1000))}
      </text>
    </svg>
  );
}

const pillBase: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  minHeight: 46,
  padding: "0 24px",
  borderRadius: 9999,
  fontSize: 14.5,
  fontWeight: 600,
  cursor: "pointer",
};

/**
 * The full-screen check-in view of one event. While the window is open the QR
 * is replaced every slot (30 seconds) with a fresh signed code from the server.
 * If the code can't be refreshed, or the connection drops, the QR is hidden and
 * "Reconnecting" is shown, so a stale code never looks valid.
 */
export function CheckinScreen({
  orgId,
  event,
  initialBlock,
}: {
  orgId: string;
  event: WorkspaceEvent;
  initialBlock: CheckinBlock | null;
}) {
  const mounted = useMounted();
  const [open, setOpen] = useState(event.checkinOpen && !initialBlock);
  const [phase, setPhase] = useState<Phase>(initialBlock ? "unavailable" : event.checkinOpen ? "loading" : "closed");
  const [unavailable, setUnavailable] = useState<string | null>(initialBlock ? CHECKIN_MESSAGES[initialBlock] : null);
  const [code, setCode] = useState<LiveCode | null>(null);
  const [qr, setQr] = useState<{ forUrl: string; dataUrl: string } | null>(null);
  const [serverNow, setServerNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep asking the server for the current code while the window is open
  useEffect(() => {
    if (!open) return;
    let active = true;
    let inFlight = false;
    let lastAttempt = 0;
    let offset = 0; // server clock minus this device's clock
    let expiresAt = 0; // server ms when the code on screen runs out
    let current: Phase = "loading";

    const go = (next: Phase) => {
      current = next;
      setPhase(next);
    };

    const refresh = async () => {
      inFlight = true;
      lastAttempt = Date.now();
      try {
        const res = await getCheckinTokenAction(orgId, event.id);
        if (!active) return;
        if (res.success && res.data) {
          offset = res.data.serverNowMs - Date.now();
          expiresAt = res.data.expiresAtMs;
          setCode({ ...res.data });
          setServerNow(res.data.serverNowMs);
          go("live");
        } else if (res.error === "closed") {
          // Closed from another screen
          setOpen(false);
          setCode(null);
          go("closed");
        } else if (res.error === "failed") {
          go("reconnecting");
        } else {
          // Cancelled, ended, not found or access removed: retrying can't help
          setUnavailable(res.errorMessage ?? CHECKIN_MESSAGES.tokenFailed);
          setCode(null);
          go("unavailable");
        }
      } catch {
        if (active) go("reconnecting");
      } finally {
        inFlight = false;
      }
    };

    const tick = () => {
      const clientNow = Date.now();
      const now = clientNow + offset;
      setServerNow(now);

      // The code on screen is long past due and no new one came: stop showing it
      if (current === "live" && now > expiresAt + STALE_MS) go("reconnecting");
      if (inFlight) return;

      if (current === "live") {
        if (now >= expiresAt) void refresh();
      } else if (clientNow - lastAttempt >= RETRY_MS) {
        void refresh();
      }
    };

    const onOffline = () => {
      if (current === "live") go("reconnecting");
    };
    const onOnline = () => {
      lastAttempt = 0; // try again on the next tick
    };

    void refresh();
    const timer = window.setInterval(tick, TICK_MS);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, [open, orgId, event.id]);

  // Draw the QR from the link the server just signed
  const codeUrl = code?.url ?? null;
  useEffect(() => {
    if (!codeUrl) return;
    let cancelled = false;
    // Loaded on demand: the QR library is only needed once there is a code to draw
    import("qrcode")
      .then(({ default: QRCode }) =>
        QRCode.toDataURL(codeUrl, { width: 960, margin: 2, errorCorrectionLevel: "M" })
      )
      .then((dataUrl) => {
        if (!cancelled) setQr({ forUrl: codeUrl, dataUrl });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [codeUrl]);

  const openCheckin = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await setCheckinOpenAction(orgId, event.id, true);
      if (res.success) {
        setCode(null);
        setQr(null);
        setPhase("loading");
        setOpen(true);
      } else if (res.error === "cancelled" || res.error === "ended") {
        setUnavailable(res.errorMessage ?? CHECKIN_MESSAGES.openFailed);
        setPhase("unavailable");
      } else {
        setError(res.errorMessage || CHECKIN_MESSAGES.openFailed);
      }
    } catch {
      setError(CHECKIN_MESSAGES.openFailed);
    } finally {
      setBusy(false);
    }
  }, [orgId, event.id]);

  const closeCheckin = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await setCheckinOpenAction(orgId, event.id, false);
      if (res.success) {
        setOpen(false);
        setCode(null);
        setQr(null);
        setPhase("closed");
        setConfirmClose(false);
      } else {
        setError(res.errorMessage || CHECKIN_MESSAGES.closeFailed);
      }
    } catch {
      setError(CHECKIN_MESSAGES.closeFailed);
    } finally {
      setBusy(false);
    }
  }, [orgId, event.id]);

  if (!mounted) return null;

  // Only a QR drawn from the code currently on screen is ever shown
  const qrDataUrl = phase === "live" && code && qr && qr.forUrl === code.url ? qr.dataUrl : null;
  const slotMs = code?.slotMs ?? DEFAULT_SLOT_MS;
  const remainingMs = code ? Math.max(0, code.expiresAtMs - serverNow) : slotMs;
  const showCode = phase === "loading" || phase === "live" || phase === "reconnecting";

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 900,
        overflowY: "auto",
        backgroundColor: "var(--color-base)",
        color: "var(--color-ink)",
      }}
    >
      <style>{`
        .orgkit-checkin-ring { transition: stroke-dashoffset ${TICK_MS}ms linear; }
        @media (prefers-reduced-motion: reduce) { .orgkit-checkin-ring { transition: none; } }
      `}</style>

      <div
        style={{
          minHeight: "100%",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
          padding: "20px 16px 32px",
        }}
      >
        <div style={{ width: "100%", maxWidth: 960, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <Link
            href={eventPath(orgId, event.id)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13.5,
              fontWeight: 600,
              color: "var(--color-muted-strong)",
              textDecoration: "none",
            }}
          >
            <ArrowLeft size={15} aria-hidden="true" />
            <span>Back to event</span>
          </Link>
          {showCode && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--color-accent-strong)" }}>
              <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 9999, backgroundColor: "var(--color-accent)" }} />
              Check-in is open
            </span>
          )}
        </div>

        <div
          style={{
            flex: 1,
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 20,
            textAlign: "center",
          }}
        >
          <h1
            tabIndex={-1}
            style={{
              outline: "none",
              margin: 0,
              maxWidth: "min(92vw, 900px)",
              fontSize: "clamp(22px, 4vw, 40px)",
              fontWeight: 800,
              letterSpacing: "-0.025em",
              lineHeight: 1.15,
              wordBreak: "break-word",
            }}
          >
            {event.title}
          </h1>

          {phase === "closed" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, maxWidth: 420 }}>
              <QrCode size={44} aria-hidden="true" style={{ color: "var(--color-muted)" }} />
              <p style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{CHECKIN_MESSAGES.closed}</p>
              <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.5, color: "var(--color-muted-strong)" }}>
                Open check-in to show a QR code that members scan on their own phones. It changes every 30 seconds.
              </p>
              <button
                type="button"
                onClick={openCheckin}
                disabled={busy}
                className="orgkit-btn-accent"
                style={{ ...pillBase, border: "none", backgroundColor: "var(--color-accent)", color: "#FFFFFF" }}
              >
                {busy && <Loader2 size={16} aria-hidden="true" style={{ animation: "spin 1s linear infinite" }} />}
                <span>Open check-in</span>
              </button>
            </div>
          )}

          {phase === "unavailable" && (
            <div
              role="alert"
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                maxWidth: 440,
                padding: "14px 16px",
                borderRadius: 14,
                textAlign: "left",
                backgroundColor: "var(--color-warning-soft)",
                border: "1px solid var(--color-warning-line)",
                color: "var(--color-ink)",
                fontSize: 14.5,
                lineHeight: 1.5,
              }}
            >
              <AlertCircle size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
              <span>{unavailable ?? CHECKIN_MESSAGES.tokenFailed}</span>
            </div>
          )}

          {showCode && (
            <>
              <div
                style={{
                  position: "relative",
                  width: CHECKIN_QR_SIZE,
                  height: CHECKIN_QR_SIZE,
                  flexShrink: 0,
                }}
              >
                {qrDataUrl ? (
                  // A data URL drawn from the live link; next/image has nothing to optimize
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrDataUrl}
                    alt={`Check-in QR code for ${event.title}. It changes every 30 seconds.`}
                    width={960}
                    height={960}
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "block",
                      borderRadius: 24,
                      backgroundColor: "#FFFFFF",
                      border: "1px solid var(--color-line)",
                      boxSizing: "border-box",
                      imageRendering: "pixelated",
                    }}
                  />
                ) : phase === "reconnecting" ? (
                  <div
                    role="status"
                    aria-live="polite"
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 12,
                      borderRadius: 24,
                      border: "1px dashed var(--color-line-strong)",
                      backgroundColor: "var(--color-surface)",
                      color: "var(--color-muted-strong)",
                      boxSizing: "border-box",
                    }}
                  >
                    <WifiOff size={40} aria-hidden="true" />
                    <span style={{ fontSize: 20, fontWeight: 700, color: "var(--color-ink)" }}>Reconnecting</span>
                    <span style={{ fontSize: 14, maxWidth: 260, lineHeight: 1.4 }}>
                      The code is hidden until the connection is back.
                    </span>
                  </div>
                ) : (
                  <CheckinQrSkeleton />
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: 20 }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                  <CountdownRing remainingMs={phase === "live" ? remainingMs : slotMs} slotMs={slotMs} />
                  <span style={{ fontSize: 13.5, color: "var(--color-muted-strong)", textAlign: "left", lineHeight: 1.3 }}>
                    New code
                    <br />
                    every {Math.round(slotMs / 1000)}s
                  </span>
                </div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 600 }}>
                  <Users size={18} aria-hidden="true" style={{ color: "var(--color-accent)" }} />
                  <span aria-live="polite">
                    {code?.count ?? 0} checked in
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setConfirmClose(true)}
                disabled={busy}
                className="orgkit-btn-secondary"
                style={{
                  ...pillBase,
                  border: "1px solid var(--color-line)",
                  backgroundColor: "var(--color-surface)",
                  color: "var(--color-ink)",
                }}
              >
                Close check-in
              </button>
            </>
          )}
        </div>
      </div>

      {confirmClose && (
        <Dialog role="alertdialog" labelledBy="close-checkin-title" onDismiss={busy ? undefined : () => setConfirmClose(false)} maxWidth={440}>
          <DialogHeader
            titleId="close-checkin-title"
            title="Close check-in"
            description={event.title}
            onClose={() => setConfirmClose(false)}
            closeDisabled={busy}
            closeLabel="Close confirmation dialog"
          />
          <DialogBody>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: "var(--color-muted-strong)" }}>
              {CHECKIN_MESSAGES.closePrompt}
            </p>
          </DialogBody>
          <DialogFooter>
            <DialogButton onClick={() => setConfirmClose(false)} disabled={busy}>
              Keep open
            </DialogButton>
            <DialogButton variant="danger" data-autofocus onClick={closeCheckin} disabled={busy}>
              {busy && <Loader2 size={16} aria-hidden="true" style={{ animation: "spin 1s linear infinite" }} />}
              <span>{busy ? "Closing..." : "Close check-in"}</span>
            </DialogButton>
          </DialogFooter>
        </Dialog>
      )}

      <ErrorToast message={error} onDismiss={() => setError(null)} />
    </div>,
    document.body
  );
}
