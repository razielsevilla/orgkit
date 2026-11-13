"use client";

import { useEffect, useState } from "react";
import { getMemberAttendanceHistoryAction } from "@/src/app/(workspace)/attendance-actions";
import { HISTORY_MESSAGES, type MemberHistory } from "@/src/lib/members/attendance-history";

export type MemberAttendanceState =
  | { phase: "loading" }
  | { phase: "ready"; history: MemberHistory }
  /** A member of another org, a missing member and a malformed ID all land here */
  | { phase: "not_found"; message: string }
  | { phase: "error"; message: string };

/**
 * Loads one member's attendance history when the dialog opens. A failed load
 * keeps the dialog open with a message, and `retry` loads it again.
 */
export function useMemberAttendance(orgId: string, memberId: string) {
  const [state, setState] = useState<MemberAttendanceState>({ phase: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    getMemberAttendanceHistoryAction(orgId, memberId)
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.data) {
          setState({ phase: "ready", history: res.data });
        } else if (res.error === "not_found") {
          setState({ phase: "not_found", message: res.errorMessage || HISTORY_MESSAGES.notFound });
        } else {
          setState({ phase: "error", message: res.errorMessage || HISTORY_MESSAGES.loadFailed });
        }
      })
      .catch(() => {
        if (!cancelled) setState({ phase: "error", message: HISTORY_MESSAGES.loadFailed });
      });

    return () => {
      cancelled = true;
    };
  }, [orgId, memberId, attempt]);

  function retry() {
    setState({ phase: "loading" });
    setAttempt((n) => n + 1);
  }

  return { state, retry };
}
