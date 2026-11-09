import type { CSSProperties } from "react";

/** Shared look for the member-list import dialog (docs/design.md: pills, emerald accent, zinc neutrals). */

export const primaryButton: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  minHeight: 42,
  padding: "10px 22px",
  borderRadius: 9999,
  backgroundColor: "var(--color-accent)",
  color: "#FFFFFF",
  border: "none",
  fontSize: 13.5,
  fontWeight: 600,
  cursor: "pointer",
  boxShadow: "0 2px 8px color-mix(in srgb, var(--color-accent) 25%, transparent)",
};

export const secondaryButton: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  minHeight: 42,
  padding: "10px 20px",
  borderRadius: 9999,
  backgroundColor: "var(--color-surface)",
  color: "var(--color-ink)",
  border: "1px solid var(--color-line)",
  fontSize: 13.5,
  fontWeight: 600,
  cursor: "pointer",
};

export const fieldLabel: CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "var(--color-ink)",
  marginBottom: 6,
};

export const selectField: CSSProperties = {
  width: "100%",
  minHeight: 42,
  padding: "9px 12px",
  borderRadius: 12,
  border: "1px solid var(--color-line)",
  backgroundColor: "var(--color-surface)",
  color: "var(--color-ink)",
  fontSize: 14,
  boxSizing: "border-box",
};

export const stepTitle: CSSProperties = {
  fontSize: 20,
  fontWeight: 800,
  color: "var(--color-ink)",
  letterSpacing: "-0.01em",
  margin: "0 0 6px 0",
  outline: "none",
};

export const bodyText: CSSProperties = {
  fontSize: 14,
  color: "var(--color-muted)",
  lineHeight: 1.5,
  margin: "0 0 16px 0",
};

export const noteBox: CSSProperties = {
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid var(--color-line)",
  backgroundColor: "color-mix(in srgb, var(--color-base) 70%, transparent)",
  color: "var(--color-ink)",
  fontSize: 13.5,
  lineHeight: 1.5,
  margin: "0 0 12px 0",
};

export const errorBox: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 10,
  padding: "12px 14px",
  borderRadius: 14,
  backgroundColor: "#FEF2F2",
  border: "1px solid #FCA5A5",
  color: "#991B1B",
  fontSize: 13.5,
  lineHeight: 1.5,
  margin: "0 0 12px 0",
};

export const buttonRow: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "flex-end",
  gap: 10,
  marginTop: 20,
};

/** Long emails and names wrap instead of pushing the dialog wider than a 360px screen */
export const wrapText: CSSProperties = {
  overflowWrap: "anywhere",
  wordBreak: "break-word",
  minWidth: 0,
};
