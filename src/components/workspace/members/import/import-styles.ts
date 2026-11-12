import type { CSSProperties } from "react";

/** Shared look for the member-list import dialog. Buttons come from DialogButton in ui/dialog. */

export const fieldLabel: CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "var(--color-ink)",
  marginBottom: 8,
};

export const selectField: CSSProperties = {
  width: "100%",
  minHeight: 44,
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid var(--color-line)",
  backgroundColor: "var(--color-surface)",
  color: "var(--color-ink)",
  fontSize: 14,
  boxSizing: "border-box",
};

export const bodyText: CSSProperties = {
  fontSize: 14,
  color: "var(--color-muted-strong)",
  lineHeight: 1.5,
  margin: "0 0 16px 0",
};

export const noteBox: CSSProperties = {
  padding: "12px 16px",
  borderRadius: 16,
  border: "1px solid var(--color-line)",
  backgroundColor: "color-mix(in srgb, var(--color-base) 70%, transparent)",
  color: "var(--color-ink)",
  fontSize: 13,
  lineHeight: 1.5,
  margin: "0 0 12px 0",
};

export const errorBox: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 8,
  padding: "12px 16px",
  borderRadius: 16,
  backgroundColor: "var(--color-danger-soft)",
  border: "1px solid var(--color-danger-line)",
  color: "var(--color-danger-strong)",
  fontSize: 13,
  lineHeight: 1.5,
  margin: "0 0 12px 0",
};

export const warningBox: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 8,
  padding: "12px 16px",
  borderRadius: 16,
  backgroundColor: "var(--color-warning-soft)",
  border: "1px solid var(--color-warning-line)",
  color: "var(--color-ink)",
  fontSize: 13,
  lineHeight: 1.5,
  margin: "0 0 12px 0",
};

/** Long emails and names wrap instead of pushing the dialog wider than a 360px screen */
export const wrapText: CSSProperties = {
  overflowWrap: "anywhere",
  wordBreak: "break-word",
  minWidth: 0,
};

/** Counts that line up from one step to the next */
export const tabular: CSSProperties = { fontVariantNumeric: "tabular-nums" };

/** A button's spinner: the existing `spin` keyframe */
export const spinnerStyle: CSSProperties = { animation: "spin 1s linear infinite" };
