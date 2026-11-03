"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "orgkit_sidebar_collapsed";
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function getSnapshot() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    // localStorage may be disabled in some sandboxes
    return false;
  }
}

// The server and the first client render agree on "expanded"; the saved
// preference is applied right after hydration.
function getServerSnapshot() {
  return false;
}

/** The sidebar's collapsed state, remembered in localStorage. */
export function useSidebarCollapsed(): [boolean, () => void] {
  const collapsed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(!getSnapshot()));
    } catch {}
    listeners.forEach((listener) => listener());
  }, []);

  return [collapsed, toggle];
}
