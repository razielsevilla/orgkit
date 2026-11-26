import type { ReactNode } from "react";
import { MONO, TABULAR } from "./health-shared";

/**
 * Small charts for the Home dashboard. Plain HTML and CSS rendered on the server,
 * so there is no chart library and no client code. Each follows the dataviz rules:
 * thin marks, a 2px gap between touching marks, one baseline, a visible legend with
 * the numbers, and a text alternative. The hover tooltip is the native `title`.
 */

/**
 * Chart colours: one hue. Emerald is the data, a light emerald is "in progress", and greys
 * are everything else. There is deliberately no second colour, to keep the page easy on the eyes.
 */
export const FIGURE = {
  accent: "var(--color-accent)",
  /** A lighter step of the same emerald: pending, draft */
  progress: "color-mix(in srgb, var(--color-accent) 60%, var(--color-surface))",
  /** Darker grey for a part that matters (for example a rejected payment) */
  strong: "var(--color-muted)",
  /** Lighter grey for the part that is simply "not yet" */
  soft: "var(--color-muted-soft)",
} as const;

export interface Part {
  label: string;
  value: number;
  color: string;
}

/** A small legend: a swatch and a name, with the count when `counts` is on. `aside` sits at the right of the same row. */
function Legend({ parts, counts, aside }: { parts: Part[]; counts?: boolean; aside?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
      <ul
      aria-hidden="true"
      style={{ listStyle: "none", margin: "6px 0 0 0", padding: 0, display: "flex", flexWrap: "wrap", gap: "2px 14px" }}
    >
      {parts.map((p) => (
        <li
          key={p.label}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--color-muted-strong)" }}
        >
          <span style={{ width: 8, height: 8, borderRadius: 9999, backgroundColor: p.color, flexShrink: 0 }} />
          <span>
            {counts && <strong style={{ fontWeight: 600, color: "var(--color-ink)", ...TABULAR }}>{p.value} </strong>}
            {p.label}
          </span>
        </li>
      ))}
    </ul>
      {aside}
    </div>
  );
}

/**
 * Ranked horizontal bars: one bar per part, the largest first, all on one baseline so close
 * values can be told apart exactly. The name is on the row and the value sits at the tip of
 * the bar, so no legend is needed. Bars are thin and square at the baseline, rounded at the tip.
 */
export function RankedBars({
  parts,
  name,
  keepOrder = false,
  suffix = "",
  labelWidth = 60,
}: {
  parts: Part[];
  name: string;
  /** Keep the order given (for example, newest first) instead of ranking by size */
  keepOrder?: boolean;
  /** Written after each value, such as % */
  suffix?: string;
  labelWidth?: number;
}) {
  const present = parts.filter((p) => p.value > 0);
  const rows = keepOrder ? present : [...present].sort((x, y) => y.value - x.value);
  const total = rows.reduce((sum, p) => sum + p.value, 0);
  if (total === 0) return null;

  const top = Math.max(...rows.map((p) => p.value));
  // The longest bar stops short of the edge, so its value still fits after the tip
  const longest = 82;
  const summary = rows.map((p) => `${p.value}${suffix} ${p.label}`).join(", ");

  return (
    <div role="img" aria-label={`${name}: ${summary}`} style={{ display: "flex", flexDirection: "column", gap: 9 }}>
      {rows.map((p) => {
        const width = (p.value / top) * longest;
        return (
          <div
            key={p.label}
            title={`${p.value}${suffix} ${p.label}${suffix ? "" : ` (${Math.round((p.value / total) * 100)}%)`}`}
            style={{ display: "grid", gridTemplateColumns: `${labelWidth}px minmax(0, 1fr)`, alignItems: "center", gap: 10 }}
          >
            <span style={{ fontSize: 12.5, color: "var(--color-muted-strong)" }}>{p.label}</span>
            <div style={{ position: "relative", height: 10, borderLeft: "1px solid var(--color-line-strong)" }}>
              <div
                style={{
                  width: `${width}%`,
                  height: "100%",
                  borderRadius: "0 4px 4px 0",
                  backgroundColor: p.color,
                }}
              />
              <span
                style={{
                  position: "absolute",
                  left: `calc(${width}% + 8px)`,
                  top: "50%",
                  transform: "translateY(-50%)",
                  ...MONO,
                  fontSize: 12,
                  color: "var(--color-ink)",
                  ...TABULAR,
                }}
              >
                {p.value}
                {suffix}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * A unit chart: one square for each item, coloured by its state, so a small count is
 * read by counting. Best for a handful of things (terms, guides). It stops at 40 squares
 * and says how many more there are; the legend carries the counts.
 */
export function UnitSquares({
  parts,
  name,
  aside,
  caption,
}: {
  parts: Part[];
  name: string;
  aside?: ReactNode;
  /** One line saying what a square stands for, shown above the squares */
  caption?: string;
}) {
  const kept = parts.filter((p) => p.value > 0);
  const total = kept.reduce((sum, p) => sum + p.value, 0);
  if (total === 0) return null;

  const MAX = 40;
  const squares = kept.flatMap((p) => Array.from({ length: p.value }, () => p)).slice(0, MAX);
  const summary = kept.map((p) => `${p.value} ${p.label}`).join(", ");

  return (
    <div>
      {caption && <p style={{ margin: "0 0 8px 0", fontSize: 12.5, color: "var(--color-muted-strong)" }}>{caption}</p>}
      <div role="img" aria-label={`${name}: ${summary}`} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
        {squares.map((p, i) => (
          <span
            key={i}
            title={p.label}
            style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: p.color, flexShrink: 0 }}
          />
        ))}
        {total > MAX && (
          <span style={{ ...MONO, fontSize: 12, color: "var(--color-muted-strong)" }}>+{total - MAX}</span>
        )}
      </div>
      <Legend parts={kept} counts aside={aside} />
    </div>
  );
}

export interface Lollipop {
  /** The row's name, typed by users, so it is shortened with an ellipsis and never widens the card */
  label: string;
  /** Days from today to the mark, held to the axis */
  days: number;
  color: string;
  tip: string;
}

/**
 * A dot plot on a time axis: one row per item, with a dot placed by how many days are left.
 * Rows never overlap, however close two dates are, and the axis is labelled at both ends and
 * the middle. The dot's colour carries the state; the legend names each state.
 */
export function DotTimeline({
  rows,
  horizon,
  legend,
  name,
  aside,
  axisLabel = "ends in",
  maxRows = 3,
}: {
  aside?: ReactNode;
  /** What the axis measures, written at its left: the ticks then read "ends in today, 30 days, 60 days" */
  axisLabel?: string;
  rows: Lollipop[];
  /** The last day on the axis */
  horizon: number;
  legend: Part[];
  name: string;
  maxRows?: number;
}) {
  if (rows.length === 0) return null;

  const shown = rows.slice(0, maxRows);
  const alt = `${name}: ${rows.map((r) => r.tip).join("; ")}`;

  return (
    <div>
      <div role="img" aria-label={alt} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {shown.map((r) => {
          const left = Math.min(100, Math.max(0, (r.days / horizon) * 100));
          return (
            <div
              key={r.label}
              title={r.tip}
              style={{ display: "grid", gridTemplateColumns: "76px minmax(0, 1fr)", alignItems: "center", gap: 10, height: 20 }}
            >
              <span className="orgkit-truncate" style={{ fontSize: 12.5, color: "var(--color-ink-soft)" }}>
                {r.label}
              </span>
              <div style={{ position: "relative", height: 20, margin: "0 6px" }}>
                {/* the track, and a stem from today to the dot */}
                <div style={{ position: "absolute", left: 0, right: 0, top: "50%", height: 1, backgroundColor: "var(--color-line-strong)" }} />
                <div
                  style={{ position: "absolute", left: 0, width: `${left}%`, top: "calc(50% - 1px)", height: 2, backgroundColor: "var(--color-line-strong)" }}
                />
                <span
                  style={{
                    position: "absolute",
                    left: `${left}%`,
                    top: "50%",
                    width: 12,
                    height: 12,
                    transform: "translate(-50%, -50%)",
                    borderRadius: 9999,
                    backgroundColor: r.color,
                    // the surface ring keeps a dot clear of the stem and of its neighbours
                    boxShadow: "0 0 0 2px var(--color-surface)",
                  }}
                />
                {/* The days left, written beside the dot, on the side with room */}
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    top: "50%",
                    transform: "translateY(-50%)",
                    ...(left > 78 ? { right: `calc(${100 - left}% + 12px)` } : { left: `calc(${left}% + 12px)` }),
                    ...MONO,
                    fontSize: 11,
                    color: "var(--color-muted-strong)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {r.days <= 0 ? "today" : `${r.days}d`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div
        aria-hidden="true"
        style={{
          display: "grid",
          gridTemplateColumns: "76px minmax(0, 1fr)",
          gap: 10,
          marginTop: 2,
          ...MONO,
          fontSize: 11.5,
          color: "var(--color-muted-strong)",
        }}
      >
        <span>{axisLabel}</span>
        <span style={{ display: "flex", justifyContent: "space-between", margin: "0 6px" }}>
          <span>today</span>
          <span>{Math.round(horizon / 2)} days</span>
          <span>{horizon} days</span>
        </span>
      </div>
      <Legend parts={legend} aside={aside} />
    </div>
  );
}

export interface Column {
  value: number | null;
  /** The hover text for this column */
  tip: string;
}

/**
 * A row of thin columns on one baseline: bars of at most 24px, rounded at the top and
 * square at the bottom, with a 4px gap. One series, one hue. Only the two ends are
 * labelled under the baseline; the hover text and the text alternative carry the rest.
 */
export function MiniColumns({
  columns,
  max,
  name,
  startLabel,
  endLabel,
  height = 52,
}: {
  columns: Column[];
  /** The top of the scale. Pass 100 for percentages; leave out to fit the data */
  max?: number;
  name: string;
  startLabel: ReactNode;
  endLabel: ReactNode;
  height?: number;
}) {
  const top = max ?? Math.max(1, ...columns.map((c) => c.value ?? 0));
  const alt = `${name}: ${columns.map((c) => (c.value === null ? "no data" : c.value)).join(", ")}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: "1 1 auto", minHeight: 0 }}>
      <div
        role="img"
        aria-label={alt}
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 4,
          flex: "1 1 auto",
          minHeight: height,
          borderBottom: "1px solid var(--color-line-strong)",
        }}
      >
        {columns.map((c, i) => (
          <div
            key={i}
            title={c.tip}
            // The whole slot is the hover target, so a short bar is still easy to point at
            style={{ flex: "0 0 24px", maxWidth: "11%", height: "100%", display: "flex", alignItems: "flex-end" }}
          >
            {c.value !== null && c.value > 0 && (
              <div
                style={{
                  width: "100%",
                  height: `${Math.max(6, Math.min(100, (c.value / top) * 100))}%`,
                  borderRadius: "4px 4px 0 0",
                  backgroundColor: FIGURE.accent,
                }}
              />
            )}
          </div>
        ))}
      </div>
      <div
        aria-hidden="true"
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 8,
          marginTop: 6,
          ...MONO,
          fontSize: 11.5,
          color: "var(--color-muted-strong)",
        }}
      >
        <span>{startLabel}</span>
        <span>{endLabel}</span>
      </div>
    </div>
  );
}
