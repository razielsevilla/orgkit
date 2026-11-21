"use client";

import { useState } from "react";

/**
 * Tracks which rows have a request in flight, so a row can show a spinner and
 * a double press does not send the same request twice.
 */
export function useBusyIds() {
  const [ids, setIds] = useState<ReadonlySet<string>>(new Set());

  /** Runs `task` for `id`, unless one is already running for it. */
  async function track(id: string, task: () => Promise<void>) {
    if (ids.has(id)) return;

    setIds((prev) => new Set(prev).add(id));
    try {
      await task();
    } finally {
      setIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  return { ids, track };
}
