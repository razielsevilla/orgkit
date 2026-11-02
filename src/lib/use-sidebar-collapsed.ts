"use client";

import { useSyncExternalStore } from "react";

// The workspace sidebar's open/closed choice, remembered in localStorage.
// Read through useSyncExternalStore so the server render (always expanded)
// matches hydration, and every page using it stays in step.
const SIDEBAR_KEY = "orgkit_sidebar_collapsed";
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function read() {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === "true";
  } catch {
    // localStorage may be disabled in some sandboxes
    return false;
  }
}

export function useSidebarCollapsed(): [boolean, () => void] {
  const collapsed = useSyncExternalStore(subscribe, read, () => false);

  const toggle = () => {
    try {
      localStorage.setItem(SIDEBAR_KEY, String(!collapsed));
    } catch {}
    listeners.forEach((listener) => listener());
  };

  return [collapsed, toggle];
}
