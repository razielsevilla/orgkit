const btnBase: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  height: 46,
  padding: "0 22px",
  borderRadius: 9999,
  fontSize: 14,
  fontWeight: 600,
  fontFamily: "inherit",
  cursor: "pointer",
  textDecoration: "none",
  boxSizing: "border-box",
  whiteSpace: "nowrap",
  transition: "all 0.15s ease",
};
// Matches the call-to-action button on the workspace home
export const primaryBtn: React.CSSProperties = {
  ...btnBase,
  backgroundColor: "var(--color-accent)",
  color: "var(--color-on-accent)",
  border: "none",
  boxShadow: "0 2px 8px color-mix(in srgb, var(--color-accent) 20%, transparent)",
};
export const secondaryBtn: React.CSSProperties = {
  ...btnBase,
  backgroundColor: "var(--color-surface)",
  color: "var(--color-ink)",
  border: "1px solid var(--color-line)",
};
