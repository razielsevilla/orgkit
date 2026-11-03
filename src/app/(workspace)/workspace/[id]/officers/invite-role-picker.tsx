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
    <div style={{ marginBottom: 24 }}>
      <span
        style={{
          display: "block",
          fontSize: 12.5,
          fontWeight: 600,
          color: "var(--color-ink)",
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
                padding: "12px 14px",
                borderRadius: 14,
                border: isSelected
                  ? "2px solid var(--color-accent)"
                  : "1px solid var(--color-line)",
                backgroundColor: isSelected
                  ? "color-mix(in srgb, var(--color-accent) 4%, transparent)"
                  : "var(--color-surface)",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.15s ease",
                boxSizing: "border-box",
              }}
              onMouseEnter={(e) => {
                if (!isSelected && !loading) {
                  e.currentTarget.style.borderColor = "var(--color-line-strong)";
                  e.currentTarget.style.backgroundColor = "var(--color-base-soft)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected && !loading) {
                  e.currentTarget.style.borderColor = "var(--color-line)";
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
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: isSelected ? "var(--color-accent-strong)" : "var(--color-ink)",
                    lineHeight: 1.2,
                  }}
                >
                  <Icon size={15} color={isSelected ? "var(--color-accent)" : "var(--color-muted)"} />
                  <span>{details.label}</span>
                </div>
                <p
                  style={{
                    fontSize: 12,
                    color: "var(--color-muted)",
                    margin: "4px 0 0 0",
                    lineHeight: 1.35,
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
