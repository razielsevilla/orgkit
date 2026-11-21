import { UserPlus } from "lucide-react";

interface MembersAddButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

/** Primary action on members page: opens the Add Members (join link & QR) modal */
export function MembersAddButton({ onClick, disabled = false }: MembersAddButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="orgkit-btn-accent"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        minHeight: 42,
        padding: "10px 20px",
        borderRadius: 9999,
        backgroundColor: "var(--color-accent)",
        color: "#FFFFFF",
        fontSize: 13.5,
        fontWeight: 600,
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <UserPlus size={15} aria-hidden="true" />
      <span>Add Members</span>
    </button>
  );
}
