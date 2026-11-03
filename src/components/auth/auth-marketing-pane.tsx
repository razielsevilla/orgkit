"use client";

import Image from "next/image";
import { Users, CalendarDays, ChartNoAxesCombined } from "lucide-react";

export function AuthMarketingPane() {
  // Left Pane: Header + Marketing Stack
  return (
    <div className="orgkit-left-pane">
      {/* Header: Logo with OrgKit wordmark */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: "clamp(24px, 5.1vh, 48px)",
        }}
      >
        <Image
          src="/orgkit-text-logo.png"
          alt="OrgKit"
          width={217}
          height={72}
          priority
          draggable={false}
          className="object-contain select-none"
          style={{
            width: "clamp(150px, 13vw, 220px)",
            height: "auto",
            display: "block",
          }}
        />
      </header>

      {/* Marketing Content: Desktop only, hidden on mobile */}
      <div className="orgkit-marketing-content">
        <h1
          style={{
            marginTop: 0,
            fontSize: "clamp(38px, 3.83vw, 64px)",
            lineHeight: 1.05,
            fontWeight: 800,
            letterSpacing: "-0.025em",
            color: "var(--color-ink)",
            marginRight: 0,
            marginBottom: 0,
          }}
        >
          <span style={{ whiteSpace: "nowrap" }}>Organize. Collaborate.</span>
          <br />
          <span style={{ color: "var(--color-accent)" }}>Lead.</span>
        </h1>

        <p
          style={{
            marginTop: "clamp(14px, 2.97vh, 28px)",
            fontSize: "clamp(16px, 1.44vw, 24px)",
            lineHeight: 1.25,
            color: "var(--color-muted)",
            fontWeight: 400,
            marginBottom: 0,
          }}
        >
          A modern platform for student organizations
          <br />
          to connect, manage, and grow together.
        </p>

        <div
          role="list"
          aria-label="Key Platform Features"
          style={{
            marginTop: "clamp(24px, 6.8vh, 64px)",
            display: "flex",
            alignItems: "center",
          }}
        >
          {/* Feature 1: Manage Members */}
          <div
            role="listitem"
            className="orgkit-feature-item"
            title="Easily manage all organization members and rosters"
            style={{
              gap: "clamp(8px, 0.84vw, 14px)",
            }}
          >
            <Users
              className="orgkit-feature-icon"
              style={{
                width: "clamp(22px, 1.8vw, 30px)",
                height: "clamp(22px, 1.8vw, 30px)",
              }}
              strokeWidth={1.5}
              color="var(--color-ink)"
              aria-hidden="true"
            />
            <span
              className="orgkit-feature-label"
              style={{
                fontSize: "clamp(13px, 0.93vw, 15.5px)",
                fontWeight: 500,
                color: "var(--color-ink-soft)",
                whiteSpace: "nowrap",
              }}
            >
              Manage Members
            </span>
          </div>

          <div
            aria-hidden="true"
            style={{
              width: 1.5,
              height: "clamp(20px, 3.19vh, 30px)",
              backgroundColor: "rgba(161, 161, 170, 0.6)",
              marginLeft: "clamp(14px, 1.79vw, 30px)",
              marginRight: "clamp(14px, 1.79vw, 30px)",
              flexShrink: 0,
            }}
          />

          {/* Feature 2: Organize Events */}
          <div
            role="listitem"
            className="orgkit-feature-item"
            title="Plan, publish, and schedule student events"
            style={{
              gap: "clamp(8px, 0.84vw, 14px)",
            }}
          >
            <CalendarDays
              className="orgkit-feature-icon"
              style={{
                width: "clamp(22px, 1.8vw, 30px)",
                height: "clamp(22px, 1.8vw, 30px)",
              }}
              strokeWidth={1.5}
              color="var(--color-ink)"
              aria-hidden="true"
            />
            <span
              className="orgkit-feature-label"
              style={{
                fontSize: "clamp(13px, 0.93vw, 15.5px)",
                fontWeight: 500,
                color: "var(--color-ink-soft)",
                whiteSpace: "nowrap",
              }}
            >
              Organize Events
            </span>
          </div>

          <div
            aria-hidden="true"
            style={{
              width: 1.5,
              height: "clamp(20px, 3.19vh, 30px)",
              backgroundColor: "rgba(161, 161, 170, 0.6)",
              marginLeft: "clamp(14px, 1.79vw, 30px)",
              marginRight: "clamp(14px, 1.79vw, 30px)",
              flexShrink: 0,
            }}
          />

          {/* Feature 3: Track Activities */}
          <div
            role="listitem"
            className="orgkit-feature-item"
            title="Monitor organizational growth and participation"
            style={{
              gap: "clamp(8px, 0.84vw, 14px)",
            }}
          >
            <ChartNoAxesCombined
              className="orgkit-feature-icon"
              style={{
                width: "clamp(22px, 1.8vw, 30px)",
                height: "clamp(22px, 1.8vw, 30px)",
              }}
              strokeWidth={1.5}
              color="var(--color-ink)"
              aria-hidden="true"
            />
            <span
              className="orgkit-feature-label"
              style={{
                fontSize: "clamp(13px, 0.93vw, 15.5px)",
                fontWeight: 500,
                color: "var(--color-ink-soft)",
                whiteSpace: "nowrap",
              }}
            >
              Track Activities
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
