export const labelStyle: React.CSSProperties = {
  fontSize: 13.5,
  fontWeight: 600,
  color: "var(--color-ink)",
  marginBottom: 2,
};
export const errorStyle: React.CSSProperties = {
  margin: "4px 0 0 0",
  fontSize: 13,
  color: "var(--color-danger)",
  fontWeight: 500,
};
export const fieldStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
};
export const checkRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 10,
  fontSize: 13.5,
  color: "var(--color-ink)",
  cursor: "pointer",
};
export const checkStyle: React.CSSProperties = {
  width: 18,
  height: 18,
  marginTop: 2,
  flexShrink: 0,
  accentColor: "var(--color-accent)",
};

export function inputStyle(invalid: boolean): React.CSSProperties {
  return {
    width: "100%",
    height: 46,
    padding: "0 14px",
    borderRadius: 12,
    border: `1px solid ${invalid ? "var(--color-danger)" : "var(--color-line)"}`,
    backgroundColor: "var(--color-surface)",
    fontSize: 15,
    fontFamily: "inherit",
    color: "var(--color-ink)",
    boxSizing: "border-box",
    transition: "border-color 0.15s ease, box-shadow 0.15s ease",
  };
}
