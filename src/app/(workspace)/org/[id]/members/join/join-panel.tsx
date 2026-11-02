"use client";

import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import Link from "next/link";
import { Plus_Jakarta_Sans } from "next/font/google";
import QRCode from "qrcode";
import { ArrowLeft, Check, Copy, Download, Link2Off, RefreshCw } from "lucide-react";
import { Sidebar } from "@/src/components/sidebar";
import type { OfficerProfile } from "@/src/components/navbar";
import { setJoinLink } from "./actions";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

type Confirming = "off" | "regenerate" | null;

// Same sidebar preference the workspace home uses. localStorage is read through
// useSyncExternalStore so the server render (always expanded) matches hydration.
const SIDEBAR_KEY = "orgkit_sidebar_collapsed";
const sidebarListeners = new Set<() => void>();

function subscribeSidebar(listener: () => void) {
  sidebarListeners.add(listener);
  return () => {
    sidebarListeners.delete(listener);
  };
}

function readSidebarCollapsed() {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === "true";
  } catch {
    return false;
  }
}

const secondaryBtn =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border-2 border-line bg-surface px-5 text-sm font-semibold text-ink hover:bg-zinc-50 disabled:opacity-60";
const primaryBtn =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-strong disabled:opacity-60";

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
  const isSidebarCollapsed = useSyncExternalStore(
    subscribeSidebar,
    readSidebarCollapsed,
    () => false
  );

  const joinUrl = token && siteUrl ? `${siteUrl}/join/${token}` : null;
  // Only show a QR that was drawn from the link currently on screen
  const qrUrl = qr && qr.forUrl === joinUrl ? qr.dataUrl : null;

  const toggleSidebar = () => {
    try {
      localStorage.setItem(SIDEBAR_KEY, String(!isSidebarCollapsed));
    } catch {}
    sidebarListeners.forEach((listener) => listener());
  };

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
      className={`${plusJakarta.className} flex min-h-screen bg-base text-ink lg:h-screen lg:overflow-hidden`}
    >
      <div className="hidden lg:block">
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

      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-10">
        <div className="mx-auto w-full max-w-[560px]">
          <Link
            href={`/org/${orgId}`}
            className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:text-accent-strong lg:hidden"
          >
            <ArrowLeft size={16} /> Back to workspace
          </Link>

          <div className="rounded-3xl border border-line/60 bg-surface p-5 shadow-[0_20px_50px_rgba(24,24,27,0.08)] sm:p-8">
            <div className="mb-1 flex items-center justify-between gap-3">
              <h1 className="text-2xl font-bold tracking-tight">Member join</h1>
              <span
                className={
                  "rounded-full px-3 py-1 text-xs font-semibold " +
                  (token ? "bg-emerald-50 text-accent-strong" : "bg-zinc-100 text-muted")
                }
              >
                {token ? "On" : "Off"}
              </span>
            </div>
            <p className="mb-6 text-sm text-muted">
              Students join {orgName} by opening this link or scanning the QR code.
            </p>

            {!siteUrl && (
              <p role="alert" className="mb-4 text-sm text-red-600">
                The app&apos;s public address isn&apos;t set up yet, so a link can&apos;t be shown.
                Set NEXT_PUBLIC_SITE_URL.
              </p>
            )}

            {token && joinUrl ? (
              <div className="flex flex-col gap-5">
                <p className="text-sm text-muted">
                  Your join link is ready. Share it, or show the QR at your next event.
                </p>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    readOnly
                    value={joinUrl}
                    aria-label="Join link"
                    onFocus={(e) => e.currentTarget.select()}
                    className="min-w-0 flex-1 rounded-xl border border-line bg-base px-3.5 py-3 text-sm text-ink"
                  />
                  <button type="button" onClick={copyLink} className={secondaryBtn}>
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    {copied ? "Copied" : "Copy link"}
                  </button>
                </div>

                <div className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-white p-4">
                  {qrUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={qrUrl}
                      alt={`QR code to join ${orgName}`}
                      width={220}
                      height={220}
                      className="size-[220px]"
                    />
                  ) : (
                    <div className="size-[220px] rounded-xl bg-zinc-100" aria-hidden />
                  )}
                  {qrUrl && (
                    <a href={qrUrl} download={qrFileName} className={secondaryBtn}>
                      <Download size={16} /> Save QR
                    </a>
                  )}
                </div>

                {confirming ? (
                  <div className="rounded-2xl border border-line bg-base p-4">
                    <p className="mb-3 text-sm text-ink">
                      {confirming === "off"
                        ? "Turn off the link? The current link and QR will stop working."
                        : "Make a new link? The old link and QR will stop working."}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => change(confirming)}
                        disabled={pending}
                        className={primaryBtn}
                      >
                        {confirming === "off" ? "Turn off" : "Make new link"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirming(null)}
                        className={secondaryBtn}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirming("regenerate")}
                      disabled={pending}
                      className={secondaryBtn}
                    >
                      <RefreshCw size={16} /> New link
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirming("off")}
                      disabled={pending}
                      className={secondaryBtn}
                    >
                      <Link2Off size={16} /> Turn off
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-start gap-3">
                <p className="text-sm text-muted">
                  The join link is off. Anyone who opens an old link or QR sees that it isn&apos;t
                  active.
                </p>
                <button
                  type="button"
                  onClick={() => change("on")}
                  disabled={pending || !siteUrl}
                  className={primaryBtn}
                >
                  {pending ? "Turning on…" : "Turn on link"}
                </button>
              </div>
            )}

            <div aria-live="polite" className="mt-4 min-h-5">
              {error && (
                <p role="alert" className="text-sm text-red-600">
                  {error}
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
