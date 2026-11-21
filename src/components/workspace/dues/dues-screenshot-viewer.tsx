"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ZoomIn, AlertCircle, RefreshCw, X } from "lucide-react";
import { useMounted } from "@/src/lib/use-mounted";
import { getPaymentScreenshotUrl } from "@/src/app/(workspace)/dues-review-actions";

interface DuesScreenshotViewerProps {
  orgId: string;
  screenshotPath: string;
  referenceNo: string;
}

export function DuesScreenshotViewer({
  orgId,
  screenshotPath,
  referenceNo,
}: DuesScreenshotViewerProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  const loadUrl = async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const res = await getPaymentScreenshotUrl(orgId, screenshotPath);
      if (res.success && res.data?.signedUrl) {
        setSignedUrl(res.data.signedUrl);
      } else {
        setHasError(true);
      }
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (orgId && screenshotPath) {
      loadUrl();
    }
  }, [orgId, screenshotPath]);

  return (
    <>
      <div
        style={{
          position: "relative",
          width: "100%",
          height: 210,
          backgroundColor: "color-mix(in srgb, var(--color-base) 60%, var(--color-surface))",
          borderRadius: 12,
          overflow: "hidden",
          border: "1px solid var(--color-line)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxSizing: "border-box",
        }}
      >
        {isLoading && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              color: "var(--color-muted)",
              fontSize: "0.8125rem",
            }}
          >
            <RefreshCw size={20} className="animate-spin" />
            <span>Loading screenshot...</span>
          </div>
        )}

        {!isLoading && hasError && (
          <div
            style={{
              padding: 16,
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              color: "var(--color-muted)",
            }}
          >
            <AlertCircle size={24} style={{ color: "var(--color-danger)" }} />
            <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-ink)" }}>
              Screenshot unavailable
            </span>
            <p style={{ margin: 0, fontSize: "0.75rem", maxWidth: 220, lineHeight: 1.3 }}>
              The payment screenshot could not be loaded or the link has expired.
            </p>
            <button
              type="button"
              onClick={loadUrl}
              style={{
                marginTop: 4,
                padding: "4px 12px",
                fontSize: "0.75rem",
                fontWeight: 600,
                borderRadius: 6,
                border: "1px solid var(--color-line)",
                backgroundColor: "var(--color-surface)",
                color: "var(--color-ink)",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <RefreshCw size={12} />
              <span>Retry</span>
            </button>
          </div>
        )}

        {!isLoading && !hasError && signedUrl && (
          <button
            type="button"
            onClick={() => setIsZoomed(true)}
            aria-label="Enlarge receipt screenshot"
            style={{
              padding: 0,
              border: "none",
              background: "transparent",
              cursor: "zoom-in",
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={signedUrl}
              alt={`Proof of payment for reference ${referenceNo}`}
              onError={() => setHasError(true)}
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
                display: "block",
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: 8,
                right: 8,
                backgroundColor: "rgba(0, 0, 0, 0.7)",
                color: "#ffffff",
                padding: "4px 8px",
                borderRadius: 6,
                fontSize: "0.6875rem",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 5,
                backdropFilter: "blur(4px)",
              }}
            >
              <ZoomIn size={12} />
              <span>Tap to enlarge</span>
            </div>
          </button>
        )}
      </div>

      {/* Full-screen Lightbox Modal */}
      {isZoomed && signedUrl && (
        <Lightbox url={signedUrl} referenceNo={referenceNo} onClose={() => setIsZoomed(false)} />
      )}
    </>
  );
}

/**
 * The full-size receipt. It is drawn through a portal into document.body, not
 * inside the review dialog: the dialog card keeps a transform, and a fixed
 * element inside a transformed parent is sized to that parent, not the screen.
 *
 * It handles its own Escape and Tab in the capture phase, so Escape closes only
 * the receipt (not the review dialog under it) and focus stays on its button.
 */
function Lightbox({ url, referenceNo, onClose }: { url: string; referenceNo: string; onClose: () => void }) {
  const mounted = useMounted();
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!mounted) return;
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCloseRef.current();
      } else if (event.key === "Tab") {
        // The close button is the only control: keep focus on it
        event.preventDefault();
        event.stopPropagation();
        closeRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      opener?.focus?.();
    };
  }, [mounted]);

  if (!mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Full-size receipt preview"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        backgroundColor: "rgba(0, 0, 0, 0.88)",
        backdropFilter: "blur(8px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        boxSizing: "border-box",
        cursor: "zoom-out",
      }}
    >
      <button
        ref={closeRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Close full-size preview"
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          width: 44,
          height: 44,
          borderRadius: "50%",
          backgroundColor: "rgba(255, 255, 255, 0.2)",
          color: "#ffffff",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <X size={20} />
      </button>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={`Full size proof of payment for reference ${referenceNo}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "95vw",
          maxHeight: "90dvh",
          objectFit: "contain",
          borderRadius: 12,
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          cursor: "default",
        }}
      />
    </div>,
    document.body
  );
}
