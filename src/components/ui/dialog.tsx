"use client";

import { useEffect, useRef } from "react";

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
 * A modal dialog: dark backdrop, centered card, and the behaviour a modal
 * needs. Focus moves into the card and returns to the opener on close, Tab
 * stays inside, the page behind does not scroll, and Escape dismisses when the
 * caller allows it.
 */
export function Dialog({
  role = "dialog",
  labelledBy,
  onDismiss,
  dismissOnBackdrop = true,
  maxWidth = 480,
  padding = "28px 24px",
  zIndex = 100,
  backdropPercent = 45,
  shadowPercent = 12,
  popSeconds = 0.2,
  children,
  cardStyle,
}: DialogProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const dismissRef = useRef(onDismiss);
  useEffect(() => {
    dismissRef.current = onDismiss;
  });

  useEffect(() => {
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
  }, []);

  return (
    <div
      role={role}
      aria-modal="true"
      aria-labelledby={labelledBy}
      style={{
        position: "fixed",
        inset: 0,
        zIndex,
        backgroundColor: `color-mix(in srgb, var(--color-ink) ${backdropPercent}%, transparent)`,
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
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
          borderRadius: 24,
          border: "1px solid var(--color-line)",
          boxShadow: `0 20px 50px color-mix(in srgb, var(--color-ink) ${shadowPercent}%, transparent)`,
          padding,
          boxSizing: "border-box",
          position: "relative",
          outline: "none",
          animation: `cardPopout ${popSeconds}s cubic-bezier(0.16, 1, 0.3, 1) both`,
          ...cardStyle,
        }}
      >
        {children}
      </div>
    </div>
  );
}
