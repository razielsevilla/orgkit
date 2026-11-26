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
 */
export function OrgHealthDashboard({ orgId, orgName, schoolName, data }: OrgHealthDashboardProps) {
  const summary = summarizeHealth(data);
  const updated = formatClock(data.generatedAt);

  return (
    <div
      style={{
        height: "100%",
        overflowY: "auto",
        boxSizing: "border-box",
        // 60px under the last row keeps the Feedback button off the footer text (design.md 5.4)
        padding: "clamp(12px, 1.8vw, 20px) clamp(16px, 2.4vw, 28px) 60px",
      }}
    >
      <style>{`
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
          gap: 12px;
        }
        .orgkit-health-hero { flex-shrink: 0; }
        .orgkit-health-card { scroll-margin-top: 16px; }
        .orgkit-health-card-wide { grid-column: span 2; }
        .orgkit-health-stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }
        .orgkit-health-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          min-height: 32px;
          padding: 4px 12px 4px 10px;
          border-radius: 9999px;
          border: 1px solid var(--color-line);
          background-color: var(--color-surface);
          color: var(--color-ink-soft);
          font-size: 13px;
          font-weight: 600;
          text-decoration: none;
          transition: background-color 0.15s ease, border-color 0.15s ease;
        }
        .orgkit-health-chip:hover {
          background-color: var(--color-base-soft);
          border-color: var(--color-line-strong);
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
          transition: background-color 0.15s ease;
        }
        .orgkit-health-next-item:hover { background-color: var(--color-base-soft); }
        .orgkit-health-link {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          min-height: 40px;
          color: var(--color-accent-strong);
          font-size: 14px;
          font-weight: 600;
          text-decoration: none;
        }
        .orgkit-health-link:hover { text-decoration: underline; }
        .orgkit-health-title-link { color: var(--color-ink); font-size: 16px; min-height: 32px; }
        .orgkit-health-title-link:hover { color: var(--color-accent-strong); }
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
          .orgkit-health-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 640px), (pointer: coarse) {
          .orgkit-health-chip { min-height: 44px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .orgkit-health-chip, .orgkit-health-next-item { transition: none; }
        }
      `}</style>

      {/* min-height 100% fills the whole canvas: the hero keeps its height and the card grid takes the rest */}
      <div style={{ maxWidth: 1120, minHeight: "100%", margin: "0 auto", display: "flex", flexDirection: "column", gap: 12 }}>
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
