import type { CSSProperties, ReactNode } from "react";
import { AlertCircle, CheckCircle2, CircleDashed, Clock } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { HealthStatus } from "@/src/lib/health/org-health";

/**
 * Pieces shared by the Home dashboard. Status is always icon + words, never colour
 * alone (palette.md), and the colours are the design tokens: emerald for healthy,
 * grey for everything else.
 */

interface StatusMeta {
  label: string;
  Icon: LucideIcon;
  /** Chip text */
  fg: string;
  /** The small icon, which may be a stronger colour than the text */
  iconColor: string;
  bg: string;
  line: string;
}

/**
 * The status pills wear the same colours as the status pills on the Members page
 * (member-status-tones.ts): "Needs a look" is the Pending amber and "Needs action" is
 * the Inactive red, so one colour means one thing across the app. Everything else on
 * Home stays emerald and grey. The pill always carries an icon and words as well.
 */
export const STATUS_META: Record<HealthStatus, StatusMeta> = {
  good: {
    label: "On track",
    Icon: CheckCircle2,
    fg: "var(--color-ink-soft)",
    iconColor: "var(--color-accent)",
    bg: "var(--color-surface)",
    line: "var(--color-line-strong)",
  },
  watch: {
    label: "Needs a look",
    Icon: Clock,
    fg: "var(--color-amber-strong)",
    iconColor: "var(--color-amber-strong)",
    bg: "var(--color-amber-soft)",
    line: "var(--color-amber-line)",
  },
  critical: {
    label: "Needs action",
    Icon: AlertCircle,
    fg: "var(--color-danger-strong)",
    iconColor: "var(--color-danger-strong)",
    bg: "var(--color-danger-soft)",
    line: "var(--color-danger-line)",
  },
  empty: {
    label: "Not started",
    Icon: CircleDashed,
    fg: "var(--color-muted-strong)",
    iconColor: "var(--color-muted)",
    bg: "var(--color-base)",
    line: "var(--color-line)",
  },
};

/** Cards: white surface, a razor-thin hairline and the diffuse resting shadow (design.md 4.2 and 8) */
export const PANEL_STYLE: CSSProperties = {
  backgroundColor: "var(--color-surface)",
  border: "1px solid rgba(228, 228, 231, 0.6)",
  boxShadow: "var(--shadow-rest)",
  boxSizing: "border-box",
};

/** JetBrains Mono for technical detail: status tags, counts inside bars, timestamps (design.md 3.1) */
export const MONO: CSSProperties = {
  fontFamily: 'var(--font-jetbrains), "JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
  fontWeight: 500,
  letterSpacing: "0.02em",
};

/** Figures that must stay aligned: amounts, counts */
export const TABULAR: CSSProperties = { fontVariantNumeric: "tabular-nums" };

export function StatusChip({ status }: { status: HealthStatus }) {
  const { label, Icon, fg, iconColor, bg, line } = STATUS_META[status];
  return (
    <span
      data-status={status}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        flexShrink: 0,
        padding: "4px 10px 4px 8px",
        borderRadius: 9999,
        border: `1px solid ${line}`,
        backgroundColor: bg,
        color: fg,
        ...MONO,
        fontSize: 11.5,
        lineHeight: 1.2,
        whiteSpace: "nowrap",
      }}
    >
      <Icon size={14} strokeWidth={2} aria-hidden="true" style={{ color: iconColor }} />
      {label}
    </span>
  );
}

/** The big number on a card, with what it counts underneath */
export function BigNumber({ value, label, size = 28 }: { value: ReactNode; label: ReactNode; size?: number }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div
        style={{
          fontSize: size,
          fontWeight: 700,
          lineHeight: 1,
          letterSpacing: "-0.03em",
          color: "var(--color-ink)",
          ...TABULAR,
        }}
      >
        {value}
      </div>
      <p style={{ margin: "4px 0 0 0", fontSize: 13, lineHeight: 1.35, color: "var(--color-muted)" }}>{label}</p>
    </div>
  );
}

/** A quiet one-line fact: icon, then text. `tone="warn"` makes it bold and dark. */
export function Fact({
  icon: Icon,
  tone = "muted",
  children,
}: {
  icon: LucideIcon;
  tone?: "muted" | "warn";
  children: ReactNode;
}) {
  return (
    <p
      className="orgkit-wrap"
      style={{
        margin: 0,
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
        fontSize: 13,
        lineHeight: 1.4,
        fontWeight: tone === "warn" ? 600 : 500,
        color: tone === "warn" ? "var(--color-ink)" : "var(--color-muted-strong)",
      }}
    >
      <Icon size={15} strokeWidth={1.75} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
      <span style={{ minWidth: 0 }}>{children}</span>
    </p>
  );
}

/** Collected so far against the date-based pace. The tick is where collection should be by now. */
export function CollectionMeter({ collectedPct, pacePct }: { collectedPct: number; pacePct: number }) {
  return (
    <div>
      <div
        role="progressbar"
        aria-label="Collected"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={collectedPct}
        aria-valuetext={`${collectedPct}% collected, about ${pacePct}% expected by now`}
        style={{
          position: "relative",
          height: 10,
          borderRadius: 9999,
          backgroundColor: "color-mix(in srgb, var(--color-accent) 14%, transparent)",
        }}
      >
        <div
          style={{
            width: `${collectedPct}%`,
            height: "100%",
            borderRadius: 9999,
            backgroundColor: "var(--color-accent)",
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: -4,
            bottom: -4,
            left: `calc(${pacePct}% - 1px)`,
            width: 2,
            borderRadius: 2,
            backgroundColor: "var(--color-ink)",
            opacity: 0.55,
          }}
        />
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          marginTop: 8,
          fontSize: 12.5,
          color: "var(--color-muted-strong)",
        }}
      >
        <span style={{ fontWeight: 600, color: "var(--color-ink)", ...TABULAR }}>{collectedPct}% collected</span>
        <span>Expected by now {pacePct}%</span>
      </div>
    </div>
  );
}
