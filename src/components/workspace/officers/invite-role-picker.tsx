import { Shield, Wallet, UserCheck } from "lucide-react";
import { OfficerRole, ROLE_DETAILS } from "@/src/lib/orgs/permissions";

interface InviteRolePickerProps {
  role: OfficerRole;
  setRole: (role: OfficerRole) => void;
  loading: boolean;
}

export function InviteRolePicker({ role, setRole, loading }: InviteRolePickerProps) {
  const roleIcons = {
    admin: Shield,
    finance: Wallet,
    officer: UserCheck,
  };

  // Role Selection (3 Selectable Cards per Ticket Section 8)
  return (
    <div>
      <span
        style={{
          display: "block",
          fontSize: 13,
          fontWeight: 500,
          color: "var(--color-ink-soft)",
          marginBottom: 8,
        }}
      >
        Role
      </span>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {(["admin", "finance", "officer"] as OfficerRole[]).map((r) => {
          const isSelected = role === r;
          const details = ROLE_DETAILS[r];
          const Icon = roleIcons[r];

          return (
            <label
              key={r}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                padding: "12px",
                borderRadius: 10,
                border: isSelected
                  ? "1px solid var(--color-accent)"
                  : "1px solid var(--color-line-strong)",
                backgroundColor: isSelected
                  ? "color-mix(in srgb, var(--color-accent) 8%, transparent)"
                  : "var(--color-surface)",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "background-color 0.15s ease, border-color 0.15s ease",
                boxSizing: "border-box",
              }}
              onMouseEnter={(e) => {
                if (!isSelected && !loading) {
                  e.currentTarget.style.backgroundColor = "var(--color-base-soft)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected && !loading) {
                  e.currentTarget.style.backgroundColor = "var(--color-surface)";
                }
              }}
            >
              <input
                type="radio"
                name="role"
                value={r}
                checked={isSelected}
                onChange={() => setRole(r)}
                disabled={loading}
                style={{
                  marginTop: 3,
                  accentColor: "var(--color-accent)",
                  cursor: "pointer",
                }}
              />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 14,
                    fontWeight: 600,
                    color: isSelected ? "var(--color-accent-strong)" : "var(--color-ink)",
                    lineHeight: 1.2,
                  }}
                >
                  <Icon size={16} color={isSelected ? "var(--color-accent)" : "var(--color-muted)"} aria-hidden="true" />
                  <span>{details.label}</span>
                </div>
                <p
                  style={{
                    fontSize: 12,
                    color: "var(--color-muted)",
                    margin: "4px 0 0 0",
                    lineHeight: 1.4,
                  }}
                >
                  {details.description}
                </p>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
