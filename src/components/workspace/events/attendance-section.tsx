"use client";

import React, { useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AlertCircle, RefreshCw, Users, X } from "lucide-react";
import {
  presentLabel,
  type AttendanceData,
  type AttendanceRecord,
} from "@/src/lib/events/attendance-state";
import { AttendanceSearch } from "./attendance-search";
import { AttendanceTable } from "./attendance-table";
import { useAttendance } from "./use-attendance";

const AttendanceRemoveDialog = dynamic(
  () => import("./attendance-remove-dialog").then((m) => m.AttendanceRemoveDialog),
  { ssr: false }
);

interface AttendanceSectionProps {
  orgId: string;
  eventId: string;
  initial: AttendanceData;
  /** Set when the first load failed: the list is empty because we couldn't read it, not because nobody came */
  initialError?: string | null;
  /** A cancelled event's attendance can be read but not changed */
  readOnly: boolean;
}

/** Who is present at this event: live count, manual add, and remove */
export function AttendanceSection({ orgId, eventId, initial, initialError = null, readOnly }: AttendanceSectionProps) {
  const { data, error, pollFailed, busyIds, add, remove, refresh, dismissError } = useAttendance({
    orgId,
    eventId,
    initial,
    initialError,
  });
  const [removing, setRemoving] = useState<AttendanceRecord | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const presentIds = useMemo(() => new Set(data.records.map((r) => r.memberId)), [data.records]);
  const label = presentLabel(data.records.length, data.activeCount);

  return (
    <section aria-labelledby="attendance-heading" style={{ marginTop: 32 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: "4px 12px", marginBottom: 14 }}>
        <h2
          id="attendance-heading"
          ref={headingRef}
          tabIndex={-1}
          style={{ outline: "none", margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--color-ink)" }}
        >
          Present
        </h2>
        <p aria-live="polite" style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--color-muted-strong)" }}>
          {label}
        </p>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            marginBottom: 14,
            padding: "10px 12px",
            borderRadius: 14,
            backgroundColor: "#FEF2F2",
            border: "1px solid #FCA5A5",
            color: "#991B1B",
            fontSize: 13.5,
            fontWeight: 500,
            lineHeight: 1.45,
          }}
        >
          <AlertCircle size={16} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
          <span style={{ flex: 1, minWidth: 0 }}>{error}</span>
          <button
            type="button"
            onClick={() => {
              dismissError();
              void refresh();
            }}
            aria-label="Dismiss error and refresh"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              flexShrink: 0,
              border: "none",
              borderRadius: "50%",
              background: "transparent",
              color: "inherit",
              cursor: "pointer",
            }}
          >
            <X size={15} aria-hidden="true" />
          </button>
        </div>
      )}

      {readOnly ? (
        <p style={{ margin: "0 0 14px", fontSize: 14, color: "var(--color-muted-strong)", lineHeight: 1.5 }}>
          This event is cancelled, so its attendance can&apos;t be changed.
        </p>
      ) : (
        <div style={{ marginBottom: 14 }}>
          <AttendanceSearch orgId={orgId} eventId={eventId} presentIds={presentIds} onAdd={(c) => void add(c)} />
        </div>
      )}

      {data.records.length === 0 ? (
        <div
          role="region"
          aria-label="No one has checked in yet"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "40px 24px",
            textAlign: "center",
            backgroundColor: "var(--color-surface)",
            borderRadius: 24,
            border: "1px solid var(--color-line)",
            boxSizing: "border-box",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "color-mix(in srgb, var(--color-line) 60%, transparent)",
              color: "var(--color-muted-strong)",
              marginBottom: 14,
            }}
          >
            <Users size={22} />
          </div>
          <h3 style={{ margin: "0 0 6px", fontSize: 17, fontWeight: 700, color: "var(--color-ink)" }}>
            No one has checked in yet
          </h3>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: "var(--color-muted-strong)" }}>
            {readOnly ? "Nobody was marked present." : "Members appear here as they scan, or add someone above."}
          </p>
        </div>
      ) : (
        <AttendanceTable
          records={data.records}
          busyIds={busyIds}
          readOnly={readOnly}
          onRemove={(record) => setRemoving(record)}
        />
      )}

      {pollFailed && (
        <p role="status" style={{ display: "flex", alignItems: "center", gap: 6, margin: "10px 0 0", fontSize: 12.5, color: "var(--color-muted)" }}>
          <RefreshCw size={12} aria-hidden="true" />
          <span>Can&apos;t refresh right now. Showing the last list, and trying again.</span>
        </p>
      )}

      <AttendanceRemoveDialog
        record={removing}
        isOpen={removing !== null}
        onClose={() => setRemoving(null)}
        onConfirm={(record) => {
          void remove(record);
          // The row (and the button that opened the dialog) is leaving, so keep focus on the page
          window.setTimeout(() => headingRef.current?.focus(), 0);
        }}
      />
    </section>
  );
}
