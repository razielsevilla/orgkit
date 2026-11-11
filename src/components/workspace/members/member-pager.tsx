import { ChevronLeft, ChevronRight } from "lucide-react";
import { pageNumbers } from "@/src/lib/pagination";

interface MemberPagerProps {
  /** The page on screen, counted from 1 */
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  /** A page is loading: the buttons wait until it arrives */
  disabled?: boolean;
}

const BUTTON_SIZE = 32;

const baseButton: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: BUTTON_SIZE,
  height: BUTTON_SIZE,
  padding: 0,
  borderRadius: 8,
  fontSize: 13,
  transition: "background-color 0.15s ease, border-color 0.15s ease, opacity 0.15s ease",
};

/** Previous, numbered pages and next. The current page is marked for screen readers too. */
export function MemberPager({ page, pageCount, onPageChange, disabled = false }: MemberPagerProps) {
  const arrow = (label: string, target: number, icon: React.ReactNode) => {
    const unavailable = disabled || target < 1 || target > pageCount;
    return (
      <button
        type="button"
        aria-label={label}
        disabled={unavailable}
        onClick={() => onPageChange(target)}
        style={{
          ...baseButton,
          border: "1px solid var(--color-line)",
          backgroundColor: "var(--color-surface)",
          color: unavailable ? "var(--color-muted)" : "var(--color-ink)",
          cursor: unavailable ? "not-allowed" : "pointer",
          opacity: unavailable ? 0.5 : 1,
        }}
      >
        {icon}
      </button>
    );
  };

  return (
    <nav aria-label="Pagination" style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {arrow("Previous page", page - 1, <ChevronLeft size={16} strokeWidth={2} />)}

      {pageNumbers(page, pageCount).map((entry, i) =>
        entry === "gap" ? (
          <span key={`gap-${i}`} aria-hidden="true" style={{ color: "var(--color-muted)", padding: "0 2px" }}>
            …
          </span>
        ) : (
          <button
            key={entry}
            type="button"
            aria-label={`Page ${entry}`}
            aria-current={entry === page ? "page" : undefined}
            disabled={disabled || entry === page}
            onClick={() => onPageChange(entry)}
            style={{
              ...baseButton,
              border: entry === page ? "none" : "1px solid var(--color-line)",
              backgroundColor: entry === page ? "var(--color-accent)" : "var(--color-surface)",
              color: entry === page ? "#FFFFFF" : "var(--color-ink)",
              fontWeight: entry === page ? 700 : 500,
              cursor: entry === page ? "default" : disabled ? "not-allowed" : "pointer",
              opacity: disabled && entry !== page ? 0.5 : 1,
            }}
          >
            {entry}
          </button>
        )
      )}

      {arrow("Next page", page + 1, <ChevronRight size={16} strokeWidth={2} />)}
    </nav>
  );
}
