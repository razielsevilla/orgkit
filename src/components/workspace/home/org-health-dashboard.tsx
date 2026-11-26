import { summarizeHealth, type OrgHealthData } from "@/src/lib/health/org-health";
import { formatClock } from "@/src/lib/health/format";
import { HealthHero } from "./health-hero";
import { HealthCards } from "./health-cards";

interface OrgHealthDashboardProps {
  orgId: string;
  orgName: string;
  schoolName: string | null;
  data: OrgHealthData;
}

/**
 * An officer's Home: how the org is doing across dues, members, events, officer
 * terms and handover. Rendered on the server with no client code, so it is fast
 * and every number is in the first paint. Each card links to the screen where
 * the officer can act on it.
 *
 * Styling follows the "tactile refinement" revision of docs/design.md. Only Home has
 * moved to it so far, so its tokens (easing, durations, shadows), fonts and motion
 * live under `.orgkit-home` here instead of in globals.css. When the rest of the app
 * adopts the revision, delete the token block below and use the global tokens.
 * The fonts (`--font-inter`, `--font-jetbrains`) are loaded by the Home page.
 */
export function OrgHealthDashboard({ orgId, orgName, schoolName, data }: OrgHealthDashboardProps) {
  const summary = summarizeHealth(data);
  const updated = formatClock(data.generatedAt);

  return (
    <div
      className="orgkit-home"
      style={{
        height: "100%",
        overflowY: "auto",
        boxSizing: "border-box",
        // 56px under the last row keeps the Feedback button off the footer text (design.md 5.4)
        padding: "clamp(10px, 1.4vw, 16px) clamp(16px, 2.4vw, 28px) 56px",
      }}
    >
      <style>{`
        /* Tokens from design.md 2.2, scoped to Home until the app adopts them */
        .orgkit-home {
          --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
          --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
          --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
          --ease-spring: cubic-bezier(0.16, 1, 0.3, 1);
          --t-fast: 180ms;
          --t-base: 280ms;
          --t-slow: 450ms;
          --shadow-rest: 0 1px 2px rgba(24, 24, 27, 0.03), 0 4px 16px -4px rgba(24, 24, 27, 0.04);
          --shadow-hover: 0 1px 2px rgba(24, 24, 27, 0.04), 0 6px 20px -4px rgba(24, 24, 27, 0.07);
          --shadow-pressed: 0 1px 2px rgba(24, 24, 27, 0.04);
          --shadow-card: 0 1px 3px rgba(24, 24, 27, 0.03), 0 8px 28px -6px rgba(24, 24, 27, 0.07);
          --shadow-dialog: 0 2px 6px rgba(24, 24, 27, 0.04), 0 20px 48px -12px rgba(24, 24, 27, 0.14);
          font-family: var(--font-inter), "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          font-weight: 500;
          -webkit-font-smoothing: antialiased;
          text-rendering: optimizeLegibility;
        }
        /* High-contrast selection (design.md 2.2) */
        .orgkit-home ::selection {
          background: var(--color-ink);
          color: var(--color-surface);
        }

        /* Entrance: the hero, then the first card row, then the second, rising in turn (design.md 7.1) */
        @keyframes orgkitSmoothRise {
          from { opacity: 0; transform: translateY(20px) scale(0.99); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .orgkit-home .stagger-1 { animation: orgkitSmoothRise 0.7s var(--ease-spring) both; }
        .orgkit-home .stagger-2 { animation: orgkitSmoothRise 0.7s var(--ease-spring) 0.08s both; }
        .orgkit-home .stagger-3 { animation: orgkitSmoothRise 0.7s var(--ease-spring) 0.16s both; }

        .orgkit-health-hero {
          display: grid;
          grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
        }
        .orgkit-health-hero-main {
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 12px;
          min-width: 0;
          padding: clamp(16px, 2vw, 22px) clamp(16px, 2.4vw, 26px);
        }
        .orgkit-health-hero-next {
          min-width: 0;
          padding: clamp(12px, 1.6vw, 16px) clamp(12px, 2vw, 20px);
          border-left: 1px solid var(--color-line);
        }
        .orgkit-health-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          /* Each row is as tall as its content; any leftover height is shared between the two rows */
          grid-template-rows: auto auto;
          align-content: stretch;
          flex: 1 0 auto;
          gap: 10px;
        }
        .orgkit-health-hero { flex-shrink: 0; }
        .orgkit-health-card { scroll-margin-top: 16px; }
        .orgkit-health-card-wide { grid-column: span 2; }

        /* Chips: the shared tactile recipe (design.md 6.6) */
        .orgkit-health-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          min-height: 32px;
          padding: 4px 12px 4px 10px;
          border-radius: 9999px;
          border: 1px solid var(--color-line);
          background-color: var(--color-surface);
          box-shadow: var(--shadow-rest);
          color: var(--color-ink);
          font-size: 13px;
          font-weight: 500;
          letter-spacing: -0.01em;
          text-decoration: none;
          transition:
            transform var(--t-fast) var(--ease-out),
            box-shadow var(--t-fast) var(--ease-out),
            border-color var(--t-fast) var(--ease-out);
        }
        @media (hover: hover) {
          .orgkit-health-chip:hover {
            border-color: var(--color-ink);
            transform: translateY(-1px);
            box-shadow: var(--shadow-hover);
          }
          .orgkit-health-next-item:hover { background-color: var(--color-base-soft); }
          .orgkit-health-link:hover { text-decoration: underline; }
          .orgkit-health-title-link:hover { color: var(--color-accent-strong); }
        }
        .orgkit-health-chip:active {
          transform: scale(0.97);
          box-shadow: var(--shadow-pressed);
        }

        .orgkit-health-next-item {
          display: flex;
          align-items: center;
          gap: 12px;
          min-height: 44px;
          padding: 4px 10px;
          margin: 0 -10px;
          border-radius: 12px;
          text-decoration: none;
          transition:
            background-color var(--t-fast) var(--ease-out),
            transform var(--t-fast) var(--ease-out);
        }
        .orgkit-health-next-item:active { transform: scale(0.97); }

        .orgkit-health-link {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          min-height: 40px;
          color: var(--color-accent-strong);
          font-size: 14px;
          font-weight: 600;
          letter-spacing: -0.01em;
          text-decoration: none;
          transition:
            color var(--t-fast) var(--ease-out),
            transform var(--t-fast) var(--ease-out);
        }
        .orgkit-health-link:active { transform: scale(0.97); }
        .orgkit-health-title-link { color: var(--color-ink); font-size: 16px; min-height: 32px; letter-spacing: -0.02em; }
        .orgkit-health-extra-link { align-self: flex-start; min-height: 32px; }
        .orgkit-health-dues-body {
          display: grid;
          grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
          gap: 16px 24px;
        }

        @media (max-width: 800px) {
          .orgkit-health-hero { grid-template-columns: minmax(0, 1fr); }
          .orgkit-health-dues-body { grid-template-columns: minmax(0, 1fr); }
          .orgkit-health-hero-next {
            border-left: none;
            border-top: 1px solid var(--color-line);
          }
          .orgkit-health-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); grid-template-rows: none; flex: 0 0 auto; }
        }
        @media (max-width: 640px) {
          .orgkit-health-grid { grid-template-columns: minmax(0, 1fr); }
          .orgkit-health-card-wide { grid-column: span 1; }
        }
        @media (max-width: 640px), (pointer: coarse) {
          .orgkit-health-chip { min-height: 44px; }
        }

        /* Reduced motion: everything that moves is flattened (design.md 7.2) */
        @media (prefers-reduced-motion: reduce) {
          .orgkit-home * {
            animation-duration: 0.01ms !important;
            animation-delay: 0ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
          .orgkit-home .stagger-1, .orgkit-home .stagger-2, .orgkit-home .stagger-3 {
            opacity: 1 !important;
            transform: none !important;
          }
          .orgkit-health-chip:hover, .orgkit-health-chip:active,
          .orgkit-health-next-item:active, .orgkit-health-link:active {
            transform: none !important;
          }
        }
      `}</style>

      {/* min-height 100% fills the whole canvas: the hero keeps its height and the card grid takes the rest */}
      <div style={{ maxWidth: 1120, minHeight: "100%", margin: "0 auto", display: "flex", flexDirection: "column", gap: 10 }}>
        <HealthHero
          orgId={orgId}
          orgName={orgName}
          schoolName={schoolName}
          summary={summary}
          updatedText={updated ? `Updated ${updated}` : undefined}
        />
        <HealthCards orgId={orgId} data={data} statuses={summary.statuses} />
      </div>
    </div>
  );
}
