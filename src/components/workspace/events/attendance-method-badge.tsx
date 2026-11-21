import React from "react";
import type { AttendanceMethod } from "@/src/lib/events/attendance-state";
import { ALL_TONE, STATUS_TONES } from "@/src/components/workspace/members/member-status-tones";

/** QR uses the emerald accent tone and Manual uses the warm amber tone so manual officer entries stand distinct */
const METHOD_TONES = {
  qr: STATUS_TONES.active,
  manual: {
    background: "var(--color-amber-soft, #fef3c7)",
    border: "1px solid var(--color-amber-line, #fde68a)",
    text: "var(--color-amber-strong, #b45309)",
  },
} as const;

const METHOD_LABELS: Record<AttendanceMethod, string> = {
  qr: "QR",
  manual: "Manual",
};

export function AttendanceMethodBadge({ method }: { method: AttendanceMethod }) {
  const tone = METHOD_TONES[method];
  const label = METHOD_LABELS[method];

  return (
    <span
      aria-label={`Checked in by ${label}`}
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
        letterSpacing: "0.01em",
        lineHeight: 1,
        whiteSpace: "nowrap",
        userSelect: "none",
      }}
    >
      {label}
    </span>
  );
}
