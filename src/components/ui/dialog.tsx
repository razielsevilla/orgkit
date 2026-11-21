"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useMounted } from "@/src/lib/use-mounted";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface DialogProps {
  /** `alertdialog` for something the user must acknowledge */
  role?: "dialog" | "alertdialog";
  /** id of the element that titles the dialog */
  labelledBy?: string;
  /**
   * Called when the user presses Escape or clicks the backdrop. Leave it out for
   * a dialog that can only be closed by its own buttons.
   */
  onDismiss?: () => void;
  /** Whether a click on the backdrop dismisses (Escape always does) */
  dismissOnBackdrop?: boolean;
  maxWidth?: number;
  /** Padding of the card itself. Leave it at 0 and build the inside from DialogHeader, DialogBody and DialogFooter. */
  padding?: string;
  zIndex?: number;
  /** Strength of the dark backdrop and the card shadow, in percent */
  backdropPercent?: number;
  shadowPercent?: number;
  /** Duration of the pop-in animation, in seconds */
  popSeconds?: number;
  children: React.ReactNode;
  /** Extra styles for the card, e.g. `{ textAlign: "center" }` */
  cardStyle?: React.CSSProperties;
}

/**
 * The OrgKit modal frame: dark backdrop with blur, centered card, and accessible modal behavior.
 * Build the inside from DialogHeader (brand mark, title, close), DialogBody and DialogFooter,
 * so every modal in the app has the same identity.
 *
 * Uses React Portal to mount to document.body, ensuring it escapes ancestor transforms/overflows
 * and centers cleanly on the screen while blurring the entire background.
 */
export function Dialog({
  role = "dialog",
  labelledBy,
  onDismiss,
  dismissOnBackdrop = true,
  maxWidth = 480,
  padding = "0",
  zIndex = 1000,
  backdropPercent = 45,
  shadowPercent = 14,
  popSeconds = 0.22,
  children,
  cardStyle,
}: DialogProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const dismissRef = useRef(onDismiss);
  const mounted = useMounted();

  useEffect(() => {
    dismissRef.current = onDismiss;
  });

  useEffect(() => {
    if (!mounted) return;
    const card = cardRef.current;
    const opener = document.activeElement as HTMLElement | null;

    // Move focus inside: an element marked data-autofocus (or autoFocus) keeps
    // it, otherwise the card itself, so a screen reader starts at the title.
    if (card && !card.contains(document.activeElement)) {
      (card.querySelector<HTMLElement>("[data-autofocus]") ?? card).focus();
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && dismissRef.current) {
        event.stopPropagation();
        dismissRef.current();
        return;
      }
      if (event.key !== "Tab" || !card) return;

      const items = Array.from(card.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === card)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      opener?.focus?.();
    };
  }, [mounted]);

  if (!mounted) return null;

  return createPortal(
    <div
      role={role}
      aria-modal="true"
      aria-labelledby={labelledBy}
      style={{
        position: "fixed",
        inset: 0,
        zIndex,
        backgroundColor: `color-mix(in srgb, var(--color-ink) ${backdropPercent}%, transparent)`,
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "clamp(16px, 3vw, 24px)",
        boxSizing: "border-box",
      }}
      onClick={(event) => {
        if (dismissOnBackdrop && event.target === event.currentTarget) dismissRef.current?.();
      }}
    >
      <div
        ref={cardRef}
        tabIndex={-1}
        className="orgkit-card"
        style={{
          width: "100%",
          maxWidth,
          backgroundColor: "var(--color-surface)",
          borderRadius: "var(--radius-panel, 20px)",
          border: "1px solid var(--color-line)",
          // The header strip is clipped to the rounded corners; the body scrolls on short screens
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          maxHeight: "calc(100dvh - 32px)",
          boxShadow: `0 20px 50px color-mix(in srgb, var(--color-ink) ${shadowPercent}%, transparent)`,
          padding,
          boxSizing: "border-box",
          position: "relative",
          outline: "none",
          animation: `cardPopout ${popSeconds}s cubic-bezier(0.16, 1.25, 0.38, 1) both`,
          ...cardStyle,
        }}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

/** The OrgKit mark, painted in the brand emerald from its silhouette, in a small tile */
function BrandMarkTile() {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 44,
        height: 44,
        flexShrink: 0,
        borderRadius: 12,
        backgroundColor: "var(--color-surface)",
        border: "1px solid color-mix(in srgb, var(--color-accent) 24%, transparent)",
      }}
    >
      <span
        style={{
          width: 30,
          height: 22,
          backgroundColor: "var(--color-accent)",
          WebkitMask: "url(/orgkit-logo-mask.png) center / contain no-repeat",
          mask: "url(/orgkit-logo-mask.png) center / contain no-repeat",
        }}
      />
    </span>
  );
}

interface DialogHeaderProps {
  /** Matches the Dialog's `labelledBy` */
  titleId: string;
  title: string;
  /** One quiet line under the title */
  description?: string;
  /** Shows the close button. Leave it out for a dialog only its own buttons can close. */
  onClose?: () => void;
  /** Disables the close button while something is saving */
  closeDisabled?: boolean;
  closeLabel?: string;
}

/**
 * The branded top of every dialog: a soft emerald wash, the OrgKit mark, the
 * title in the deep brand green, and the close button.
 */
export function DialogHeader({
  titleId,
  title,
  description,
  onClose,
  closeDisabled = false,
  closeLabel = "Close",
}: DialogHeaderProps) {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        flexShrink: 0,
        padding: "16px 16px 16px 24px",
        backgroundColor: "var(--color-brand-tint)",
        borderBottom: "1px solid color-mix(in srgb, var(--color-accent) 18%, transparent)",
      }}
    >
      <BrandMarkTile />
      <div style={{ flex: 1, minWidth: 0 }}>
        <h2
          id={titleId}
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 700,
            lineHeight: 1.25,
            letterSpacing: "-0.01em",
            color: "var(--color-brand-deep)",
            overflowWrap: "anywhere",
          }}
        >
          {title}
        </h2>
        {description && (
          <p style={{ margin: "2px 0 0", fontSize: 13, lineHeight: 1.4, color: "var(--color-muted-strong)" }}>
            {description}
          </p>
        )}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          disabled={closeDisabled}
          aria-label={closeLabel}
          className="orgkit-dialog-close"
        >
          <X size={18} strokeWidth={2} aria-hidden="true" />
        </button>
      )}
    </header>
  );
}

/** The dialog's content. It scrolls on its own when the window is short. */
export function DialogBody({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto", padding: "20px 24px", ...style }}>
      {children}
    </div>
  );
}

/** The row of buttons at the bottom, with the main action last */
export function DialogFooter({ children }: { children: React.ReactNode }) {
  return (
    <footer
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "flex-end",
        alignItems: "center",
        gap: 10,
        flexShrink: 0,
        padding: "4px 24px 24px",
      }}
    >
      {children}
    </footer>
  );
}

interface DialogButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** `primary` is the OrgKit emerald, `danger` is red for actions that remove access */
  variant?: "primary" | "secondary" | "danger";
}

/** The one button style for every dialog */
export function DialogButton({ variant = "secondary", type = "button", className, ...props }: DialogButtonProps) {
  return (
    <button
      type={type}
      className={`orgkit-dialog-btn orgkit-dialog-btn--${variant}${className ? ` ${className}` : ""}`}
      {...props}
    />
  );
}
