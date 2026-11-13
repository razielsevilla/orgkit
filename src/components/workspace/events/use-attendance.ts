"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  addAttendanceAction,
  getEventAttendanceAction,
  removeAttendanceAction,
} from "@/src/app/(workspace)/attendance-actions";
import {
  ATTENDANCE_MESSAGES,
  ATTENDANCE_POLL_MS,
  addRecord,
  isPresent,
  mergePolled,
  removeRecord,
  undoAdd,
  undoRemove,
  type AttendanceData,
  type AttendanceRecord,
  type AttendeeCandidate,
} from "@/src/lib/events/attendance-state";

interface UseAttendanceOptions {
  orgId: string;
  eventId: string;
  initial: AttendanceData;
  /** Set when the first load failed, so the page can show the error with a way to retry */
  initialError?: string | null;
}

/**
 * The attendance list. It polls every few seconds (no Realtime), and add and
 * remove update the screen first and roll that one row back if the server says no.
 */
export function useAttendance({ orgId, eventId, initial, initialError = null }: UseAttendanceOptions) {
  const [data, setData] = useState<AttendanceData>(initial);
  const [error, setError] = useState<string | null>(initialError);
  const [pollFailed, setPollFailed] = useState(false);
  const [busyIds, setBusyIds] = useState<ReadonlySet<string>>(new Set());

  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // Members with a change in flight, and a counter that moves whenever one starts or ends.
  // A poll that began before the counter moved may predate the change, so it is dropped.
  const pendingRef = useRef(new Set<string>());
  const epochRef = useRef(0);
  const inFlightRef = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    const startEpoch = epochRef.current;
    try {
      const res = await getEventAttendanceAction(orgId, eventId);
      if (epochRef.current !== startEpoch) return;
      if (res.success && res.data) {
        const polled = res.data;
        setData((current) => mergePolled(current, polled, pendingRef.current));
        setPollFailed(false);
        setError((current) => (current === ATTENDANCE_MESSAGES.loadFailed ? null : current));
      } else {
        setPollFailed(true);
      }
    } catch {
      setPollFailed(true);
    } finally {
      inFlightRef.current = false;
    }
  }, [orgId, eventId]);

  // The poll. It waits while the tab is hidden and catches up as soon as it is shown again.
  useEffect(() => {
    const tick = () => {
      if (!document.hidden) void refresh();
    };
    const timer = window.setInterval(tick, ATTENDANCE_POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [refresh]);

  /** Runs `task` for one member, unless a change for them is already in flight */
  async function track(memberId: string, task: () => Promise<void>) {
    if (pendingRef.current.has(memberId)) return;
    pendingRef.current.add(memberId);
    epochRef.current += 1;
    setBusyIds(new Set(pendingRef.current));
    try {
      await task();
    } finally {
      pendingRef.current.delete(memberId);
      epochRef.current += 1;
      setBusyIds(new Set(pendingRef.current));
    }
  }

  async function add(candidate: AttendeeCandidate) {
    if (isPresent(dataRef.current, candidate.id)) return;
    setError(null);

    const record: AttendanceRecord = {
      memberId: candidate.id,
      fullName: candidate.fullName,
      method: "manual",
      checkedInAt: new Date().toISOString(),
    };

    await track(candidate.id, async () => {
      setData((current) => addRecord(current, record));
      let succeeded = false;
      try {
        const res = await addAttendanceAction(orgId, eventId, candidate.id);
        succeeded = res.success;
        if (!res.success) setError(res.errorMessage || ATTENDANCE_MESSAGES.addFailed);
      } catch {
        setError(ATTENDANCE_MESSAGES.addFailed);
      }
      if (!succeeded) setData((current) => undoAdd(current, candidate.id));
    });
    // Whether it worked or someone else got there first, show what the server holds
    void refresh();
  }

  async function remove(record: AttendanceRecord) {
    setError(null);
    const index = dataRef.current.records.findIndex((r) => r.memberId === record.memberId);
    if (index < 0) return;

    await track(record.memberId, async () => {
      setData((current) => removeRecord(current, record.memberId));
      let succeeded = false;
      try {
        const res = await removeAttendanceAction(orgId, eventId, record.memberId);
        succeeded = res.success;
        if (!res.success) setError(res.errorMessage || ATTENDANCE_MESSAGES.removeFailed);
      } catch {
        setError(ATTENDANCE_MESSAGES.removeFailed);
      }
      if (!succeeded) setData((current) => undoRemove(current, record, index));
    });
    void refresh();
  }

  return {
    data,
    error,
    pollFailed,
    busyIds,
    add,
    remove,
    refresh,
    dismissError: () => setError(null),
  };
}
