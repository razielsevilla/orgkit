"use client";

import React, { useMemo } from "react";
import { AlertCircle, CalendarCheck, RefreshCw, SearchX } from "lucide-react";
import { Dialog, DialogHeader, DialogBody, DialogFooter, DialogButton } from "@/src/components/ui/dialog";
import { AttendanceMethodBadge } from "@/src/components/workspace/events/attendance-method-badge";
import { formatEventTime } from "@/src/components/workspace/events/local-time";
import { getInitials } from "@/src/components/workspace/officers/officers-helpers";
import type { WorkspaceMember } from "@/src/app/(workspace)/members-actions";
import {
  HISTORY_MESSAGES,
  HISTORY_STATUS_LABELS,
  rowStatus,
  summarise,
  summaryLabel,
  type HistoryStatus,
  type MemberHistory,
  type MemberHistoryRow,
} from "@/src/lib/members/attendance-history";
import { MemberStatusBadge } from "./member-status-badge";
import { ALL_TONE, STATUS_TONES, type StatusTone } from "./member-status-tones";
import { useMemberAttendance } from "./use-member-attendance";

interface MemberAttendanceDialogProps {
  orgId: string;
  member: WorkspaceMember;
  onClose: () => void;
}

const TITLE_ID = "member-attendance-dialog-title";

/** Present is the accent tone, Absent is neutral, Cancelled matches the event's own badge */
const STATUS_ROW_TONES: Record<HistoryStatus, StatusTone> = {
  present: STATUS_TONES.active,
  absent: ALL_TONE,
  cancelled: STATUS_TONES.inactive,
};

/**
 * One member's attendance across past events, opened from a roster row. It loads
 * its own data, so the roster page needs no extra query until an officer asks.
 */
export function MemberAttendanceDialog({ orgId, member, onClose }: MemberAttendanceDialogProps) {
  const { state, retry } = useMemberAttendance(orgId, member.id);

  return (
    <Dialog labelledBy={TITLE_ID} onDismiss={onClose} maxWidth={520}>
      <DialogHeader
        titleId={TITLE_ID}
        title="Attendance"
        description="How often this member has come to events."
        onClose={onClose}
        closeLabel="Close attendance dialog"
      />
      <DialogBody>
        <MemberSummaryCard member={member} />

        <div style={{ marginTop: 16 }}>
          {state.phase === "loading" && <HistorySkeleton />}
          {state.phase === "ready" && <HistoryContent history={state.history} />}
          {state.phase === "not_found" && <NotFound message={state.message} />}
          {state.phase === "error" && <LoadError message={state.message} onRetry={retry} />}
        </div>
      </DialogBody>
      <DialogFooter>
        <DialogButton data-autofocus onClick={onClose}>
          Close
        </DialogButton>
      </DialogFooter>
    </Dialog>
  );
}

function MemberSummaryCard({ member }: { member: WorkspaceMember }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 14px",
        borderRadius: 12,
        backgroundColor: "var(--color-base)",
        border: "1px solid var(--color-line)",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 38,
          height: 38,
          flexShrink: 0,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          fontWeight: 700,
          color: "var(--color-accent-strong)",
          backgroundColor: "color-mix(in srgb, var(--color-accent) 18%, transparent)",
        }}
      >
        {getInitials(member.fullName)}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          title={member.fullName}
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "var(--color-ink)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {member.fullName}
        </div>
        <div
          title={member.email}
          style={{
            fontSize: 12.5,
            color: "var(--color-muted-strong)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {member.email}
        </div>
      </div>
      <MemberStatusBadge status={member.status} size="sm" />
    </div>
  );
}

function HistoryContent({ history }: { history: MemberHistory }) {
  const { attended, total } = useMemo(() => summarise(history.rows, history.joinedAt), [history]);
  const label = summaryLabel(attended, total);

  if (history.rows.length === 0) return <EmptyHistory />;

  return (
    <>
      {label && (
        <p style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 600, color: "var(--color-ink)" }}>{label}</p>
      )}
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {history.rows.map((row, i) => (
          <HistoryRow key={row.eventId} row={row} isLast={i === history.rows.length - 1} />
        ))}
      </ul>
    </>
  );
}

function HistoryRow({ row, isLast }: { row: MemberHistoryRow; isLast: boolean }) {
  const status = rowStatus(row);
  const tone = STATUS_ROW_TONES[status];

  return (
    <li
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 10,
        padding: "12px 0",
        borderBottom: isLast ? "none" : "1px solid var(--color-line)",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          title={row.title}
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "var(--color-ink)",
            overflowWrap: "anywhere",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {row.title}
        </div>
        <time dateTime={row.startsAt} style={{ fontSize: 12.5, color: "var(--color-muted)" }}>
          {formatEventTime(row.startsAt)}
        </time>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: 6, flexShrink: 0 }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "3px 9px",
            borderRadius: 9999,
            backgroundColor: tone.background,
            border: tone.border,
            color: tone.text,
            fontSize: 11.5,
            fontWeight: 600,
            lineHeight: 1,
            whiteSpace: "nowrap",
          }}
        >
          {HISTORY_STATUS_LABELS[status]}
        </span>
        {status === "present" && row.method && <AttendanceMethodBadge method={row.method} />}
      </div>
    </li>
  );
}

function EmptyHistory() {
  return (
    <div style={{ textAlign: "center", padding: "24px 8px" }}>
      <span
        aria-hidden="true"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 44,
          height: 44,
          borderRadius: "50%",
          backgroundColor: "color-mix(in srgb, var(--color-accent) 12%, transparent)",
          color: "var(--color-accent-strong)",
        }}
      >
        <CalendarCheck size={20} />
      </span>
      <h3 style={{ margin: "12px 0 4px", fontSize: 15, fontWeight: 600, color: "var(--color-ink)" }}>
        {HISTORY_MESSAGES.empty}
      </h3>
      <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5, color: "var(--color-muted-strong)" }}>
        {HISTORY_MESSAGES.emptyHint}
      </p>
    </div>
  );
}

function NotFound({ message }: { message: string }) {
  return (
    <div role="alert" style={{ textAlign: "center", padding: "24px 8px" }}>
      <span
        aria-hidden="true"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 44,
          height: 44,
          borderRadius: "50%",
          backgroundColor: "color-mix(in srgb, var(--color-line) 60%, transparent)",
          color: "var(--color-muted-strong)",
        }}
      >
        <SearchX size={20} />
      </span>
      <p style={{ margin: "12px 0 0", fontSize: 14, fontWeight: 500, color: "var(--color-ink)" }}>{message}</p>
    </div>
  );
}

function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      role="alert"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
        padding: "10px 12px",
        borderRadius: 10,
        backgroundColor: "var(--color-danger-soft)",
        border: "1px solid var(--color-danger-line)",
        color: "var(--color-danger-strong)",
        fontSize: 13,
        fontWeight: 500,
        lineHeight: 1.45,
      }}
    >
      <AlertCircle size={16} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} />
      <span style={{ flex: 1, minWidth: 0 }}>{message}</span>
      <button
        type="button"
        onClick={onRetry}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          flexShrink: 0,
          border: "none",
          background: "transparent",
          color: "inherit",
          font: "inherit",
          fontWeight: 600,
          cursor: "pointer",
          padding: 0,
          textDecoration: "underline",
        }}
      >
        <RefreshCw size={13} aria-hidden="true" />
        Try again
      </button>
    </div>
  );
}

function Bar({ width, height, radius = 6 }: { width: number | string; height: number; radius?: number }) {
  return (
    <div
      className="orgkit-skeleton"
      style={{
        width,
        height,
        maxWidth: "100%",
        flexShrink: 0,
        borderRadius: radius,
        backgroundColor: "color-mix(in srgb, var(--color-line) 85%, transparent)",
      }}
    />
  );
}

/** Placeholder rows with the same shape as the loaded list, so nothing shifts */
function HistorySkeleton() {
  return (
    <div role="status" aria-label="Loading attendance history">
      <Bar width={170} height={18} />
      <div style={{ marginTop: 12 }}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              padding: "12px 0",
              borderBottom: i === 3 ? "none" : "1px solid var(--color-line)",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
              <Bar width={i % 2 === 0 ? 150 : 190} height={14} />
              <Bar width={110} height={12} radius={5} />
            </div>
            <Bar width={64} height={22} radius={11} />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading attendance history...</span>
    </div>
  );
}
