import type { MemberStatus } from "@/src/app/(workspace)/members-actions";

/** The colors of one status, wherever it shows: the row badge, the filter tab, its count */
export interface StatusTone {
  background: string;
  border: string;
  /** Text and icons on `background` (contrast of at least 4.5 to 1) */
  text: string;
  /** The small dot beside a label */
  dot: string;
}

/**
 * One color per status, so a row and its filter tab match:
 * pending is amber (an officer still has to review), active is the emerald
 * accent, inactive is red.
 */
export const STATUS_TONES: Record<MemberStatus, StatusTone> = {
  pending: {
    background: "var(--color-warning-soft)",
    border: "1px solid var(--color-warning-line)",
    text: "var(--color-warning)",
    dot: "var(--color-warning)",
  },
  active: {
    background: "color-mix(in srgb, var(--color-accent) 12%, transparent)",
    border: "1px solid color-mix(in srgb, var(--color-accent) 25%, transparent)",
    text: "var(--color-accent-strong)",
    dot: "var(--color-accent)",
  },
  inactive: {
    background: "var(--color-danger-soft)",
    border: "1px solid var(--color-danger-line)",
    text: "var(--color-danger-strong)",
    dot: "var(--color-danger)",
  },
};

/** "All" is not a status, so it stays neutral */
export const ALL_TONE: StatusTone = {
  background: "color-mix(in srgb, var(--color-ink) 8%, transparent)",
  border: "1px solid color-mix(in srgb, var(--color-ink) 18%, transparent)",
  text: "var(--color-ink)",
  dot: "var(--color-ink)",
};

export const STATUS_LABELS: Record<MemberStatus, string> = {
  pending: "Pending",
  active: "Active",
  inactive: "Inactive",
};
