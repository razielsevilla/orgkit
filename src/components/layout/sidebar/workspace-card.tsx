interface WorkspaceCardProps {
  orgName: string;
  schoolName?: string | null;
  isCollapsed: boolean;
}

export function WorkspaceCard({ orgName, schoolName, isCollapsed }: WorkspaceCardProps) {
  // Derive organization initials (e.g. "Junior Marketing Association" -> "JM")
  const orgInitials = (() => {
    const parts = (orgName || "Organization").trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    if (parts.length === 1 && parts[0].length > 0) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return "OR";
  })();

  return !isCollapsed ? (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 18,
        background:
          "linear-gradient(135deg, rgba(236, 253, 245, 0.85) 0%, rgba(209, 250, 229, 0.45) 100%)",
        border: "1px solid color-mix(in srgb, var(--color-accent) 18%, transparent)",
        padding: "12px 14px 14px 14px",
        marginBottom: 16,
        boxShadow: "0 2px 6px color-mix(in srgb, var(--color-accent) 4%, transparent)",
      }}
    >
      {/* Top decorative handle bar */}
      <div
        style={{
          width: 32,
          height: 3,
          borderRadius: 9999,
          backgroundColor: "color-mix(in srgb, var(--color-accent) 28%, transparent)",
          margin: "0 auto 10px auto",
        }}
      />

      {/* Subtitle / Eyebrow */}
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--color-accent)",
          marginBottom: 4,
        }}
      >
        WORKSPACE
      </div>

      {/* Organization Name */}
      <h2
        style={{
          fontSize: 14.5,
          fontWeight: 700,
          letterSpacing: "-0.015em",
          color: "var(--color-ink)",
          margin: 0,
          lineHeight: 1.25,
          wordBreak: "break-word",
        }}
      >
        {orgName}
      </h2>

      {/* School / Community (Only rendered if present) */}
      {schoolName && (
        <div
          style={{
            fontSize: 11.5,
            fontWeight: 400,
            color: "var(--color-muted-strong)",
            marginTop: 3,
            lineHeight: 1.2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={schoolName}
        >
          {schoolName}
        </div>
      )}

      {/* Role Badge */}
      <div style={{ marginTop: 10 }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            borderRadius: 9999,
            backgroundColor: "var(--color-surface)",
            border: "1px solid color-mix(in srgb, var(--color-line) 90%, transparent)",
            padding: "2.5px 8.5px",
            fontSize: 11,
            fontWeight: 600,
            color: "var(--color-accent)",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.03)",
          }}
        >
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              backgroundColor: "var(--color-accent)",
            }}
          />
          Officer
        </span>
      </div>
    </div>
  ) : (
    /* Collapsed: Compact Workspace Pill */
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        marginBottom: 16,
      }}
    >
      <div
        style={{
          position: "relative",
          width: 44,
          height: 48,
          borderRadius: 14,
          background:
            "linear-gradient(135deg, rgba(236, 253, 245, 0.9) 0%, rgba(209, 250, 229, 0.5) 100%)",
          border: "1px solid color-mix(in srgb, var(--color-accent) 20%, transparent)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 2px 6px color-mix(in srgb, var(--color-accent) 5%, transparent)",
        }}
        title={`${orgName}${schoolName ? ` • ${schoolName}` : ""}`}
      >
        <div
          style={{
            width: 14,
            height: 2.5,
            borderRadius: 9999,
            backgroundColor: "color-mix(in srgb, var(--color-accent) 30%, transparent)",
            marginBottom: 4,
          }}
        />
        <span
          style={{
            fontSize: 13,
            fontWeight: 800,
            color: "var(--color-accent)",
            letterSpacing: "-0.02em",
          }}
        >
          {orgInitials}
        </span>
      </div>
    </div>
  );
}
