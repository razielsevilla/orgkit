import { BarChart3 } from "lucide-react";
import { describeMissingWeek, formatWeekRange, type UsageWeek } from "@/src/lib/owner/usage-report";

/**
 * The owner's usage report: one row per completed week on wide screens, and one
 * card per week at 640px and below, so nothing scrolls sideways on a phone.
 * Both layouts are in the page; a media query shows one of them.
 */

const STAT_LABELS = [
  { key: "orgsActive", label: "Active orgs" },
  { key: "orgsInactive", label: "Inactive orgs" },
  { key: "eventsCreated", label: "Events" },
  { key: "checkIns", label: "Check-ins" },
  { key: "activeOfficers", label: "Active officers" },
] as const;

const surface = {
  backgroundColor: "var(--color-surface)",
  border: "1px solid var(--color-line)",
  borderRadius: 24,
  boxShadow: "0 2px 10px rgba(24, 24, 27, 0.03)",
  boxSizing: "border-box",
} as const;

function UsageEmptyState() {
  return (
    <div
      style={{
        ...surface,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        padding: "clamp(40px, 6vw, 64px) clamp(20px, 4vw, 40px)",
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          backgroundColor: "color-mix(in srgb, var(--color-accent) 10%, transparent)",
          color: "var(--color-accent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
        }}
      >
        <BarChart3 size={28} strokeWidth={1.75} aria-hidden="true" />
      </div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--color-ink)", margin: "0 0 8px" }}>
        No data yet
      </h2>
      <p style={{ fontSize: 14, color: "var(--color-muted)", maxWidth: 380, margin: 0, lineHeight: 1.5 }}>
        The first weekly report is made after a full week (Monday to Sunday, UTC) has ended. It
        appears here as soon as it has run.
      </p>
    </div>
  );
}

function MissingNote({ week }: { week: UsageWeek }) {
  const failed = week.status === "failed";
  return (
    <span
      role={failed ? "alert" : undefined}
      style={{
        fontSize: 13,
        fontWeight: failed ? 600 : 500,
        color: failed ? "var(--color-danger)" : "var(--color-muted)",
        overflowWrap: "anywhere",
      }}
    >
      {describeMissingWeek(week)}
    </span>
  );
}

export function UsageTable({ weeks }: { weeks: UsageWeek[] }) {
  // Nothing produced and nothing failed: the very first week, before any report has run
  if (weeks.every((week) => week.status === "pending")) {
    return <UsageEmptyState />;
  }

  return (
    <div>
      <style>{`
        .orgkit-usage-cards { display: none; }
        @media (max-width: 640px) {
          .orgkit-usage-table-wrap { display: none; }
          .orgkit-usage-cards { display: flex; flex-direction: column; gap: 12px; }
        }
      `}</style>

      {/* Wide screens: one row per week */}
      <div className="orgkit-usage-table-wrap" style={{ ...surface, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <caption className="sr-only">Usage by week, newest first</caption>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--color-muted)", fontSize: 12.5 }}>
              <th scope="col" style={{ padding: "14px 20px", fontWeight: 700 }}>
                Week
              </th>
              {STAT_LABELS.map((stat) => (
                <th
                  key={stat.key}
                  scope="col"
                  style={{ padding: "14px 16px", fontWeight: 700, textAlign: "right" }}
                >
                  {stat.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week) => (
              <tr key={week.weekStart} style={{ borderTop: "1px solid var(--color-line)" }}>
                <th
                  scope="row"
                  style={{ padding: "14px 20px", fontWeight: 600, color: "var(--color-ink)", textAlign: "left" }}
                >
                  {formatWeekRange(week.weekStart, week.weekEnd)}
                </th>
                {week.status === "ready" ? (
                  STAT_LABELS.map((stat) => (
                    <td
                      key={stat.key}
                      style={{
                        padding: "14px 16px",
                        textAlign: "right",
                        fontVariantNumeric: "tabular-nums",
                        color: "var(--color-ink)",
                      }}
                    >
                      {week[stat.key]}
                    </td>
                  ))
                ) : (
                  <td colSpan={STAT_LABELS.length} style={{ padding: "14px 16px", textAlign: "right" }}>
                    <MissingNote week={week} />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Phones: one card per week */}
      <ul className="orgkit-usage-cards" style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {weeks.map((week) => (
          <li key={week.weekStart} style={{ ...surface, padding: "16px 18px" }}>
            <h3
              style={{
                margin: "0 0 12px",
                fontSize: 15,
                fontWeight: 700,
                color: "var(--color-ink)",
                overflowWrap: "anywhere",
              }}
            >
              {formatWeekRange(week.weekStart, week.weekEnd)}
            </h3>
            {week.status === "ready" ? (
              <dl
                style={{
                  margin: 0,
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: "12px 16px",
                }}
              >
                {STAT_LABELS.map((stat) => (
                  <div key={stat.key} style={{ minWidth: 0 }}>
                    <dt style={{ fontSize: 12, color: "var(--color-muted)", fontWeight: 600 }}>
                      {stat.label}
                    </dt>
                    <dd
                      style={{
                        margin: "2px 0 0",
                        fontSize: 22,
                        fontWeight: 800,
                        color: "var(--color-ink)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {week[stat.key]}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <MissingNote week={week} />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
