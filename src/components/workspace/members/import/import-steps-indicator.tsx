import React from "react";

export type ImportStep = "upload" | "match" | "review" | "done";

const STEPS: { id: ImportStep; label: string }[] = [
  { id: "upload", label: "Upload" },
  { id: "match", label: "Match columns" },
  { id: "review", label: "Review" },
  { id: "done", label: "Done" },
];

/** Where the admin is in the import. Text, not colour alone, says which step is current. */
export function ImportStepsIndicator({ current }: { current: ImportStep }) {
  const currentIndex = STEPS.findIndex((s) => s.id === current);
  return (
    <ol
      aria-label="Import steps"
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "8px 16px",
        listStyle: "none",
        margin: "0 0 20px 0",
        padding: 0,
        fontSize: 13,
      }}
    >
      {STEPS.map((step, i) => {
        const isCurrent = i === currentIndex;
        const isDone = i < currentIndex;
        return (
          <li
            key={step.id}
            aria-current={isCurrent ? "step" : undefined}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontWeight: isCurrent ? 700 : 500,
              color: isCurrent ? "var(--color-ink)" : "var(--color-muted)",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 700,
                backgroundColor: isCurrent
                  ? "var(--color-accent)"
                  : isDone
                    ? "color-mix(in srgb, var(--color-accent) 15%, transparent)"
                    : "color-mix(in srgb, var(--color-line) 80%, transparent)",
                color: isCurrent ? "#FFFFFF" : isDone ? "var(--color-accent-strong)" : "var(--color-muted)",
              }}
            >
              {i + 1}
            </span>
            <span>
              {step.label}
              {isCurrent ? <span className="sr-only"> (current step)</span> : null}
              {isDone ? <span className="sr-only"> (completed)</span> : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
