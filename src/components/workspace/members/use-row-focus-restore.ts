"use client";

import { useEffect, useRef } from "react";

const isVisible = (el: Element) => (el as HTMLElement).getClientRects().length > 0;

/** The row for a member that is on screen (the desktop table and the mobile cards both render one) */
function visibleRow(memberId: string) {
  return Array.from(document.querySelectorAll(`[data-member-row="${memberId}"]`)).find(isVisible);
}

/** Focuses the first enabled button in the first of these members' rows that has one */
function focusFirstRowButton(memberIds: string[]): boolean {
  for (const id of memberIds) {
    const button = visibleRow(id)?.querySelector<HTMLElement>("button:not([disabled])");
    if (button) {
      button.focus();
      return true;
    }
  }
  return false;
}

/**
 * Keyboard focus: after a prompt closes, lands back on the member's row. If the
 * row is gone (deactivated), lands on a neighbour, then on the page heading.
 *
 * Call the returned `queueFocus` when a prompt closes. Focus moves once the
 * screen is no longer `blocked` (a prompt is open or the list is reloading).
 */
export function useRowFocusRestore(members: readonly { id: string }[], blocked: boolean) {
  const queued = useRef<string[] | null>(null);

  /** The member first, then the rows next to them in case theirs disappears */
  function queueFocus(memberId: string) {
    const index = members.findIndex((m) => m.id === memberId);
    const ids = [memberId];
    if (index >= 0) {
      if (members[index + 1]) ids.push(members[index + 1].id);
      if (members[index - 1]) ids.push(members[index - 1].id);
    }
    queued.current = ids;
  }

  useEffect(() => {
    if (!queued.current || blocked) return;
    const ids = queued.current;
    queued.current = null;

    // The dialog already returned focus to its opener when that button still exists
    const ownRow = visibleRow(ids[0]);
    if (ownRow?.contains(document.activeElement)) return;

    if (!focusFirstRowButton(ids)) {
      document.querySelector<HTMLElement>("[data-members-heading]")?.focus();
    }
  }, [members, blocked]);

  return queueFocus;
}
