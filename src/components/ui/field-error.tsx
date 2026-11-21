import { AlertCircle } from "lucide-react";

interface FieldErrorProps {
  /** Matches the input's `aria-describedby` */
  id?: string;
  children: React.ReactNode;
}

/**
 * The message under a form field that failed validation: a small alert icon
 * and the sentence in red, with no box around it. The input itself carries the
 * red border. For a problem with the whole form, use a banner instead.
 */
export function FieldError({ id, children }: FieldErrorProps) {
  return (
    <p
      id={id}
      role="alert"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 6,
        margin: "6px 0 0",
        fontSize: 13,
        fontWeight: 500,
        lineHeight: 1.4,
        color: "var(--color-danger-strong)",
      }}
    >
      <AlertCircle size={14} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
      <span>{children}</span>
    </p>
  );
}
