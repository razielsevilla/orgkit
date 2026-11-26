import type { CSSProperties, ReactNode } from "react";
import { AlertCircle, ArrowDown, ArrowUp, CheckCircle2, CircleDashed, Clock, Minus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { HealthStatus } from "@/src/lib/health/org-health";

/**
 * Pieces shared by the Home dashboard. Status is always icon + words, never colour
 * alone (palette.md), and the colours are the design tokens: emerald for healthy,
 * amber for "look at this", red only for "act now", grey for "not started yet".
 */

interface StatusMeta {
  label: string;
  Icon: LucideIcon;
  fg: string;
  bg: string;
  line: string;
}

export const STATUS_META: Record<HealthStatus, StatusMeta> = {
  good: {
    label: "On track",
    Icon: CheckCircle2,
    fg: "var(--color-accent-strong)",
    bg: "color-mix(in srgb, var(--color-accent) 10%, var(--color-surface))",
    line: "color-mix(in srgb, var(--color-accent) 24%, transparent)",
  },
  watch: {
    label: "Needs a look",
    Icon: Clock,
    fg: "var(--color-amber-strong)",
    bg: "var(--color-amber-soft)",
    line: "var(--color-amber-line)",
  },
  critical: {
    label: "Needs action",
    Icon: AlertCircle,
    fg: "var(--color-danger-strong)",
    bg: "var(--color-danger-soft)",
    line: "var(--color-danger-line)",
  },
  empty: {
    label: "Not started",
    Icon: CircleDashed,
    fg: "var(--color-muted-strong)",
    bg: "var(--color-base)",
    line: "var(--color-line)",
  },
};

export const PANEL_STYLE: CSSProperties = {
  backgroundColor: "var(--color-surface)",
  border: "1px solid var(--color-line)",
  boxShadow: "0 4px 18px color-mix(in srgb, var(--color-ink) 3%, transparent)",
  boxSizing: "border-box",
};

export function StatusChip({ status }: { status: HealthStatus }) {
  const { label, Icon, fg, bg, line } = STATUS_META[status];
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
        fontSize: 12.5,
        fontWeight: 600,
        lineHeight: 1.2,
        whiteSpace: "nowrap",
      }}
    >
      <Icon size={14} strokeWidth={2} aria-hidden="true" />
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
          fontWeight: 800,
          lineHeight: 1,
          letterSpacing: "-0.02em",
          color: "var(--color-ink)",
        }}
      >
        {value}
      </div>
      <p style={{ margin: "4px 0 0 0", fontSize: 13, lineHeight: 1.35, color: "var(--color-muted)" }}>{label}</p>
    </div>
  );
}

type DeltaTone = "up" | "down" | "flat" | "warn";

/** A change against the period before: an arrow, a short sentence, and the comparison */
export function Delta({ tone, children }: { tone: DeltaTone; children: ReactNode }) {
  const Icon = tone === "up" ? ArrowUp : tone === "flat" ? Minus : ArrowDown;
  const color =
    tone === "up"
      ? "var(--color-accent-strong)"
      : tone === "warn"
        ? "var(--color-amber-strong)"
        : "var(--color-muted-strong)";
  return (
    <p
      className="orgkit-wrap"
      style={{
        margin: 0,
        display: "flex",
        alignItems: "flex-start",
        gap: 6,
        fontSize: 13,
        lineHeight: 1.4,
        fontWeight: 500,
        color,
      }}
    >
      <Icon size={14} strokeWidth={2.25} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
      <span style={{ minWidth: 0 }}>{children}</span>
    </p>
  );
}

/** A quiet one-line fact: icon, then text. `tone="warn"` turns it amber. */
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
        fontWeight: tone === "warn" ? 600 : 400,
        color: tone === "warn" ? "var(--color-amber-strong)" : "var(--color-muted-strong)",
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
        <span style={{ fontWeight: 600, color: "var(--color-ink)" }}>{collectedPct}% collected</span>
        <span>Expected by now: about {pacePct}%</span>
      </div>
    </div>
  );
}
