"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * Calls `onDismiss` when the user presses Escape or clicks outside `ref`.
 * Used by the profile dropdowns in the navbar and the sidebar.
 */
export function useDismissable(ref: RefObject<HTMLElement | null>, onDismiss: () => void) {
  // Always call the latest callback without re-subscribing on every render
  const latest = useRef(onDismiss);
  useEffect(() => {
    latest.current = onDismiss;
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        latest.current();
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        latest.current();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [ref]);
}
