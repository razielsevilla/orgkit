"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { FeedbackDialog } from "@/src/components/feedback/feedback-dialog";
import { TourHelpButton } from "@/src/components/workspace/tour/tour-help-button";

/**
 * The "Feedback" button on every workspace page. A round icon button in the
 * bottom-right corner, so it stays clear of the sidebar on a phone; the word
 * "Feedback" shows from 640px up. The typed message lives here, so closing the
 * dialog by accident does not lose it. Only a saved message clears it.
 *
 * The corner is a row: the "?" that replays the officer tour (inside a
 * workspace only) sits to the left of Feedback, so the two never overlap and
 * the 60px clear space under a scrolling screen still covers both.
 */
export function FeedbackButton() {
  const pathname = usePathname() ?? "/";
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");

  return (
    <>
      <style>{`
        .orgkit-fab-row {
          position: fixed;
          right: 16px;
          bottom: calc(16px + env(safe-area-inset-bottom, 0px));
          z-index: 900; /* under the dialog (1000), over the page */
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .orgkit-feedback-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-width: 48px;
          height: 48px;
          padding: 0 14px;
          border-radius: 9999px;
          border: 1px solid color-mix(in srgb, var(--color-accent) 30%, transparent);
          background-color: var(--color-accent);
          color: var(--color-surface);
          font-family: inherit;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 6px 18px color-mix(in srgb, var(--color-accent) 30%, transparent);
          transition: background-color 0.15s ease, transform 0.15s ease;
        }
        .orgkit-feedback-btn:hover { background-color: var(--color-accent-strong); transform: translateY(-1px); }
        .orgkit-feedback-btn:focus-visible { outline: 3px solid color-mix(in srgb, var(--color-accent) 45%, transparent); outline-offset: 2px; }
        .orgkit-feedback-btn-label { display: none; }
        @media (min-width: 640px) {
          .orgkit-feedback-btn-label { display: inline; }
        }
        /* Screens that scroll leave 60px at the bottom: sit inside it so the last row is never covered */
        @media (max-width: 1023px) {
          .orgkit-fab-row { bottom: calc(8px + env(safe-area-inset-bottom, 0px)); }
        }
      `}</style>

      <div className="orgkit-fab-row" data-tour="corner">
        <TourHelpButton />
        <button
          type="button"
          className="orgkit-feedback-btn"
          aria-label="Send feedback"
          aria-haspopup="dialog"
          onClick={() => setIsOpen(true)}
        >
          <MessageSquare size={20} strokeWidth={2.1} aria-hidden="true" />
          <span className="orgkit-feedback-btn-label">Feedback</span>
        </button>
      </div>

      {isOpen && (
        <FeedbackDialog
          pathname={pathname}
          message={message}
          onMessageChange={setMessage}
          onSent={() => setMessage("")}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
