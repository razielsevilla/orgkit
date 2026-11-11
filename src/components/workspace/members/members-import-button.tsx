import { Upload } from "lucide-react";

/** The header's primary action: opens the import dialog. Admins only. */
export function MembersImportButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
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
        cursor: "pointer",
      }}
    >
      <Upload size={15} aria-hidden="true" />
      <span>Import</span>
    </button>
  );
}
