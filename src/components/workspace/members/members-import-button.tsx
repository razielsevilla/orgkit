import { Upload } from "lucide-react";

interface MembersImportButtonProps {
  onClick: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
}

/** The header's import action: opens the import dialog. Admins only. */
export function MembersImportButton({
  onClick,
  variant = "secondary",
  disabled = false,
}: MembersImportButtonProps) {
  const isPrimary = variant === "primary";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={isPrimary ? "orgkit-btn-accent" : "orgkit-btn-export"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        height: 42,
        padding: "0 20px",
        borderRadius: 9999,
        border: isPrimary ? "none" : "1px solid var(--color-line)",
        backgroundColor: isPrimary ? "var(--color-accent)" : "var(--color-surface)",
        color: isPrimary ? "#FFFFFF" : "var(--color-ink)",
        fontSize: 13.5,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        boxShadow: isPrimary
          ? "0 2px 8px color-mix(in srgb, var(--color-accent) 20%, transparent)"
          : "0 1px 3px rgba(24, 24, 27, 0.04)",
        transition: "all 0.15s ease",
      }}
    >
      <Upload size={15} aria-hidden="true" />
      <span>Import</span>
    </button>
  );
}
