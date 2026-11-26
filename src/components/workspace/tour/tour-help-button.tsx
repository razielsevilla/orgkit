"use client";

import { CircleHelp } from "lucide-react";
import { requestTour, useTourAvailable } from "@/src/lib/tour/tour-request";

/**
 * The round "?" beside the Feedback button. Pressing it opens the guide to the page
 * the officer is on (only that page's part of the tour), as many times as they like. It shows only where
 * the tour can open (inside a workspace), and sits in the corner row built in
 * feedback-button.tsx, so it never covers or crowds the Feedback button.
 */
export function TourHelpButton() {
  const available = useTourAvailable();
  if (!available) return null;

  return (
    <>
      <style>{`
        .orgkit-help-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          padding: 0;
          border-radius: 50%;
          border: 1px solid var(--color-line);
          background-color: var(--color-surface);
          color: var(--color-ink);
          cursor: pointer;
          box-shadow: var(--shadow-rest);
          transition: transform var(--t-fast, 180ms) var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1)),
            box-shadow var(--t-fast, 180ms) var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1)),
            border-color var(--t-fast, 180ms) var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1));
        }
        .orgkit-help-btn svg { color: var(--color-accent); }
        .orgkit-help-btn:active { transform: scale(0.97); box-shadow: var(--shadow-pressed); }
        .orgkit-help-btn:focus-visible {
          outline: none;
          box-shadow: 0 0 0 2px var(--color-base), 0 0 0 4px var(--color-accent);
        }
        @media (hover: hover) {
          .orgkit-help-btn:hover {
            border-color: var(--color-ink);
            transform: translateY(-1px);
            box-shadow: var(--shadow-hover);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .orgkit-help-btn { transition: none; }
          .orgkit-help-btn:hover, .orgkit-help-btn:active { transform: none; }
        }
      `}</style>
      <button
        type="button"
        className="orgkit-help-btn"
        aria-label="Guide to this page"
        title="Guide to this page"
        aria-haspopup="dialog"
        onClick={requestTour}
      >
        <CircleHelp size={22} strokeWidth={2} aria-hidden="true" />
      </button>
    </>
  );
}
