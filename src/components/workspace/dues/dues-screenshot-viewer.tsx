"use client";

import React, { useState, useEffect } from "react";
import { ZoomIn, AlertCircle, RefreshCw, X } from "lucide-react";
import { getPaymentScreenshotUrl } from "@/src/app/(workspace)/dues-actions";

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
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Full-size receipt preview"
          onClick={() => setIsZoomed(false)}
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
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsZoomed(false);
            }}
            aria-label="Close full-size preview"
            style={{
              position: "absolute",
              top: 20,
              right: 20,
              width: 40,
              height: 40,
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
            src={signedUrl}
            alt={`Full size proof of payment for reference ${referenceNo}`}
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "95vw",
              maxHeight: "90vh",
              objectFit: "contain",
              borderRadius: 12,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
              cursor: "default",
            }}
          />
        </div>
      )}
    </>
  );
}
