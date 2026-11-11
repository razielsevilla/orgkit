export type MembersView = "members" | "invited";

const TABS: readonly { id: MembersView; label: string }[] = [
  { id: "members", label: "Members" },
  { id: "invited", label: "Invited" },
];

interface MembersViewTabsProps {
  view: MembersView;
  onSelect: (view: MembersView) => void;
  /** Invitations still waiting for the person to join; shown on the Invited tab */
  pendingInvites: number | undefined;
}

/** The Members | Invited switch. Admins only, because invitations hold email addresses. */
export function MembersViewTabs({ view, onSelect, pendingInvites }: MembersViewTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Members or invited people"
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: 2,
        margin: "6px 0 14px 0",
        backgroundColor: "transparent",
        borderRadius: 9999,
        gap: 4,
      }}
    >
      {TABS.map((tab) => {
        const isActive = view === tab.id;
        const badge = tab.id === "invited" ? pendingInvites : undefined;

        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={isActive}
            onClick={() => onSelect(tab.id)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 18px",
              borderRadius: 9999,
              border: "none",
              backgroundColor: isActive ? "var(--color-accent)" : "transparent",
              color: isActive ? "#FFFFFF" : "var(--color-muted)",
              fontWeight: isActive ? 600 : 500,
              fontSize: 13.5,
              cursor: "pointer",
              boxShadow: isActive
                ? "0 2px 8px color-mix(in srgb, var(--color-accent) 25%, transparent)"
                : "none",
              transition: "all 0.15s ease",
            }}
          >
            <span>{tab.label}</span>
            {typeof badge === "number" && badge > 0 && (
              <span
                style={{
                  padding: "1px 7px",
                  borderRadius: 9999,
                  fontSize: 11,
                  fontWeight: 700,
                  backgroundColor: isActive
                    ? "color-mix(in srgb, #FFFFFF 25%, transparent)"
                    : "color-mix(in srgb, var(--color-line) 80%, transparent)",
                  color: isActive ? "#FFFFFF" : "var(--color-ink)",
                }}
              >
                {badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
