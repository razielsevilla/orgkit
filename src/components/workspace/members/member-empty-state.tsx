"use client";

import React, { useState } from "react";
import { Users, Link2, Copy, Check, SearchX, QrCode } from "lucide-react";
import { joinLinkPath } from "@/src/lib/routes";

interface MemberEmptyStateProps {
  type: "no-members" | "no-matches" | "no-active-members";
  joinLinkToken?: string | null;
  inactiveCount?: number;
  onClearFilters?: () => void;
  onViewInactive?: () => void;
}

/**
 * Premium empty state for the member roster adhering to docs/design.md:
 * - Floating icon cards around the container for a minimalist, aesthetic look.
 * - Displays public join link with one-click copy when the link is active.
 * - Accessible "No members match" reset trigger.
 * - Informative "No active members" view when all org members are currently inactive.
 */
export function MemberEmptyState({
  type,
  joinLinkToken,
  inactiveCount,
  onClearFilters,
  onViewInactive,
}: MemberEmptyStateProps) {
  const [copied, setCopied] = useState(false);

  const fullJoinUrl =
    typeof window !== "undefined" && joinLinkToken
      ? `${window.location.origin}${joinLinkPath(joinLinkToken)}`
      : joinLinkToken
        ? joinLinkPath(joinLinkToken)
        : "";

  const handleCopyLink = async () => {
    if (!fullJoinUrl) return;
    try {
      await navigator.clipboard.writeText(fullJoinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API is blocked
    }
  };

  if (type === "no-active-members") {
    return (
      <div
        role="region"
        aria-label="No active members"
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "clamp(48px, 6vw, 64px) clamp(24px, 4vw, 36px)",
          backgroundColor: "var(--color-surface)",
          borderRadius: 24,
          border: "1px solid var(--color-line)",
          textAlign: "center",
          boxShadow: "0 10px 30px rgba(24, 24, 27, 0.04)",
          overflow: "hidden",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            backgroundColor: "color-mix(in srgb, var(--color-line) 60%, transparent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--color-muted)",
            marginBottom: 16,
          }}
        >
          <Users size={26} strokeWidth={1.8} />
        </div>
        <h3
          style={{
            fontSize: 19,
            fontWeight: 700,
            color: "var(--color-ink)",
            marginBottom: 6,
          }}
        >
          No active members
        </h3>
        <p
          style={{
            fontSize: 14,
            color: "var(--color-muted)",
            maxWidth: 420,
            lineHeight: 1.5,
            marginBottom: 24,
          }}
        >
          {inactiveCount && inactiveCount > 0
            ? `All members in this org are currently inactive (${inactiveCount}). You can review and reactivate them at any time.`
            : "There are currently no active or pending members on the roster."}
        </p>
        {onViewInactive && (
          <button
            type="button"
            onClick={onViewInactive}
            className="orgkit-btn-accent"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 24px",
              borderRadius: 9999,
              backgroundColor: "var(--color-accent)",
              color: "#FFFFFF",
              fontSize: 13.5,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              boxShadow: "0 2px 8px color-mix(in srgb, var(--color-accent) 25%, transparent)",
              transition: "all 0.15s ease",
            }}
          >
            View inactive members {inactiveCount ? `(${inactiveCount})` : ""}
          </button>
        )}
      </div>
    );
  }

  if (type === "no-matches") {
    return (
      <div
        role="region"
        aria-label="No matching members"
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "clamp(48px, 6vw, 64px) clamp(24px, 4vw, 36px)",
          backgroundColor: "var(--color-surface)",
          borderRadius: 24,
          border: "1px solid var(--color-line)",
          textAlign: "center",
          boxShadow: "0 10px 30px rgba(24, 24, 27, 0.04)",
          overflow: "hidden",
        }}
      >
        {/* Decorative Geometric Background Circles */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: -50,
            left: -50,
            width: 180,
            height: 180,
            borderRadius: "50%",
            backgroundColor: "color-mix(in srgb, var(--color-accent) 4%, transparent)",
            pointerEvents: "none",
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            bottom: -60,
            right: -60,
            width: 200,
            height: 200,
            borderRadius: "50%",
            backgroundColor: "color-mix(in srgb, var(--color-accent) 5%, transparent)",
            pointerEvents: "none",
          }}
        />

        {/* Floating Accent Badges around Card */}
        <div
          aria-hidden="true"
          className="orgkit-float-a"
          style={{
            position: "absolute",
            top: 24,
            left: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 44,
            height: 44,
            borderRadius: 14,
            backgroundColor: "color-mix(in srgb, var(--color-accent) 10%, transparent)",
            border: "1px solid color-mix(in srgb, var(--color-accent) 20%, transparent)",
            color: "var(--color-accent)",
            boxShadow: "0 8px 20px rgba(5, 150, 105, 0.08)",
            transform: "rotate(-6deg)",
          }}
        >
          <Users size={20} strokeWidth={2} />
        </div>

        <div
          aria-hidden="true"
          className="orgkit-float-b"
          style={{
            position: "absolute",
            bottom: 24,
            right: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 44,
            height: 44,
            borderRadius: 14,
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-line)",
            color: "var(--color-accent)",
            boxShadow: "0 10px 25px rgba(24, 24, 27, 0.06)",
            transform: "rotate(8deg)",
          }}
        >
          <QrCode size={20} strokeWidth={2} />
        </div>

        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            backgroundColor: "color-mix(in srgb, var(--color-line) 60%, transparent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--color-muted)",
            marginBottom: 16,
          }}
        >
          <SearchX size={26} strokeWidth={1.8} />
        </div>
        <h3
          style={{
            fontSize: 19,
            fontWeight: 700,
            color: "var(--color-ink)",
            marginBottom: 6,
          }}
        >
          No members match
        </h3>
        <p
          style={{
            fontSize: 14,
            color: "var(--color-muted)",
            maxWidth: 380,
            lineHeight: 1.5,
            marginBottom: 24,
          }}
        >
          We couldn&apos;t find any roster entries matching your current search query or status filter.
        </p>
        {onClearFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="orgkit-btn-accent"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 24px",
              borderRadius: 9999,
              backgroundColor: "var(--color-accent)",
              color: "#FFFFFF",
              fontSize: 13.5,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              boxShadow: "0 2px 8px color-mix(in srgb, var(--color-accent) 25%, transparent)",
              transition: "all 0.15s ease",
            }}
          >
            Clear search and filters
          </button>
        )}
      </div>
    );
  }

  // type === "no-members"
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "clamp(48px, 6vw, 72px) clamp(24px, 4vw, 48px)",
        backgroundColor: "var(--color-surface)",
        borderRadius: 28,
        border: "1px solid var(--color-line)",
        textAlign: "center",
        boxShadow: "0 20px 50px rgba(24, 24, 27, 0.05)",
        overflow: "hidden",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* Decorative Geometric Background Circles */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: -60,
          left: -60,
          width: 220,
          height: 220,
          borderRadius: "50%",
          backgroundColor: "color-mix(in srgb, var(--color-accent) 4%, transparent)",
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          bottom: -80,
          right: -80,
          width: 260,
          height: 260,
          borderRadius: "50%",
          backgroundColor: "color-mix(in srgb, var(--color-accent) 5%, transparent)",
          pointerEvents: "none",
        }}
      />

      {/* Floating Accent Badges (docs/design.md floating icons pattern) */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 24,
          left: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 44,
          height: 44,
          borderRadius: 14,
          backgroundColor: "color-mix(in srgb, var(--color-accent) 10%, transparent)",
          border: "1px solid color-mix(in srgb, var(--color-accent) 20%, transparent)",
          color: "var(--color-accent)",
          boxShadow: "0 8px 20px rgba(5, 150, 105, 0.08)",
          transform: "rotate(-6deg)",
        }}
      >
        <Users size={20} strokeWidth={2} />
      </div>

      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          bottom: 28,
          right: 36,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 44,
          height: 44,
          borderRadius: 14,
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-line)",
          color: "var(--color-accent)",
          boxShadow: "0 10px 25px rgba(24, 24, 27, 0.06)",
          transform: "rotate(8deg)",
        }}
      >
        <QrCode size={20} strokeWidth={2} />
      </div>

      {/* Main Center Icon */}
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          backgroundColor: "color-mix(in srgb, var(--color-accent) 10%, transparent)",
          border: "1px solid color-mix(in srgb, var(--color-accent) 22%, transparent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--color-accent)",
          marginBottom: 20,
          boxShadow: "0 8px 24px rgba(5, 150, 105, 0.12)",
        }}
      >
        <Users size={28} strokeWidth={2.2} />
      </div>

      {/* Title & Copy */}
      <h2
        style={{
          fontSize: "clamp(22px, 2.2vw, 28px)",
          fontWeight: 700,
          color: "var(--color-ink)",
          letterSpacing: "-0.015em",
          margin: "0 0 10px 0",
        }}
      >
        No members yet
      </h2>
      <p
        style={{
          fontSize: 15,
          color: "var(--color-muted)",
          maxWidth: 420,
          lineHeight: 1.5,
          margin: "0 0 28px 0",
        }}
      >
        Share your join link or QR code to get started. When students sign up, they will appear here as pending for officer review.
      </p>

      {/* Join Link Display Card (if active) */}
      {joinLinkToken ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            maxWidth: 500,
            width: "100%",
            backgroundColor: "var(--color-base)",
            border: "1px solid var(--color-line)",
            borderRadius: 16,
            padding: "8px 10px 8px 16px",
            boxSizing: "border-box",
          }}
        >
          <Link2 size={16} color="var(--color-accent)" style={{ flexShrink: 0 }} />
          <span
            style={{
              flex: 1,
              fontSize: 13,
              fontFamily: "monospace",
              color: "var(--color-ink)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              textAlign: "left",
            }}
          >
            {fullJoinUrl}
          </span>
          <button
            type="button"
            onClick={handleCopyLink}
            aria-label="Copy public join link"
            className={copied ? "orgkit-btn-accent" : "orgkit-btn-secondary"}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 16px",
              borderRadius: 9999,
              backgroundColor: copied ? "var(--color-accent)" : "var(--color-surface)",
              color: copied ? "var(--color-on-accent)" : "var(--color-ink)",
              border: copied ? "1px solid var(--color-accent)" : "1px solid var(--color-line)",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s ease",
              boxShadow: copied
                ? "0 2px 8px color-mix(in srgb, var(--color-accent) 25%, transparent)"
                : "0 1px 3px rgba(24, 24, 27, 0.04)",
              flexShrink: 0,
            }}
          >
            {copied ? (
              <>
                <Check size={14} strokeWidth={2.5} />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy size={14} strokeWidth={2} />
                <span>Copy Link</span>
              </>
            )}
          </button>
        </div>
      ) : (
        <p style={{ fontSize: 13, color: "var(--color-muted)", margin: 0 }}>
          Your public join link is currently turned off. An admin can activate it under{" "}
          <strong style={{ color: "var(--color-ink)" }}>Join</strong> in the sidebar.
        </p>
      )}
    </div>
  );
}

