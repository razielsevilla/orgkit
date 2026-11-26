"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, UserCheck } from "lucide-react";

interface ConfirmAllPendingProps {
  /** Students waiting right now */
  pendingCount: number;
  /** How many the last "confirm all" confirmed, or null if none has run */
  confirmedCount: number | null;
  isConfirming: boolean;
  onConfirmAll: () => void;
}

const pill = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  minHeight: 40,
  padding: "0 18px",
  borderRadius: 9999,
  fontSize: 13.5,
  fontWeight: 600,
  cursor: "pointer",
} as const;

/**
 * Confirm every waiting student at once. It asks first, because a confirmed member
 * can check in to events and be asked for dues. Shown when more than one student is
 * waiting (one is a single tap on their row), and afterwards to say how many were
 * confirmed.
 */
export function ConfirmAllPending({ pendingCount, confirmedCount, isConfirming, onConfirmAll }: ConfirmAllPendingProps) {
  const [asking, setAsking] = useState(false);
  const students = (n: number) => `${n} ${n === 1 ? "student" : "students"}`;

  const done = confirmedCount !== null && pendingCount === 0;
  if (!done && pendingCount < 2) return null;

  return (
    <div
      role="region"
      aria-label="Confirm waiting students"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 12,
        margin: "4px 0 12px",
        padding: "12px 16px",
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-line)",
        borderRadius: 16,
      }}
    >
      <div aria-live="polite" style={{ display: "flex", alignItems: "center", gap: 10, flex: "1 1 240px", minWidth: 0 }}>
        {done ? (
          <>
            <CheckCircle2 size={18} aria-hidden="true" style={{ color: "var(--color-accent)", flexShrink: 0 }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-ink)" }}>
              {students(confirmedCount)} confirmed. They can now check in to events.
            </span>
          </>
        ) : (
          <>
            <UserCheck size={18} aria-hidden="true" style={{ color: "var(--color-muted-strong)", flexShrink: 0 }} />
            <span style={{ fontSize: 14, color: "var(--color-ink)" }}>
              <strong style={{ fontWeight: 600 }}>{students(pendingCount)}</strong> waiting. Only confirmed members can check in.
            </span>
          </>
        )}
      </div>

      {!done &&
        (asking ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => {
                setAsking(false);
                onConfirmAll();
              }}
              disabled={isConfirming}
              className="orgkit-btn-accent"
              style={{
                ...pill,
                border: "none",
                backgroundColor: "var(--color-accent)",
                color: "var(--color-on-accent, #FFFFFF)",
                opacity: isConfirming ? 0.6 : 1,
              }}
            >
              Yes, confirm {pendingCount}
            </button>
            <button
              type="button"
              onClick={() => setAsking(false)}
              className="orgkit-btn-secondary"
              style={{
                ...pill,
                border: "1px solid var(--color-line)",
                backgroundColor: "var(--color-surface)",
                color: "var(--color-ink)",
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAsking(true)}
            disabled={isConfirming}
            className="orgkit-btn-secondary"
            style={{
              ...pill,
              border: "1px solid var(--color-line)",
              backgroundColor: "var(--color-surface)",
              color: "var(--color-ink)",
              opacity: isConfirming ? 0.6 : 1,
            }}
          >
            {isConfirming ? (
              <>
                <Loader2 size={15} aria-hidden="true" style={{ animation: "spin 1s linear infinite" }} />
                <span>Confirming…</span>
              </>
            ) : (
              <span>Confirm all {pendingCount}</span>
            )}
          </button>
        ))}
    </div>
  );
}
