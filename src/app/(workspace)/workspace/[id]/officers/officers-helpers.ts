import { OfficerRole } from "@/src/lib/orgs/permissions";

// The last admin cannot be demoted or removed. Say why instead of leaving a dead control.
export const LAST_ADMIN_MESSAGE = "Every org needs at least one admin. Make someone else an admin first.";

// Compute initials for an officer
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  if (parts.length === 1 && parts[0].length > 0) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return "OF";
}

// Format date helper
export function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "Recent";
  }
}

export const roleBadgeStyles: Record<
  OfficerRole,
  { bg: string; text: string; border: string }
> = {
  admin: {
    bg: "color-mix(in srgb, var(--color-accent) 10%, transparent)",
    text: "var(--color-accent-strong)",
    border: "color-mix(in srgb, var(--color-accent) 25%, transparent)",
  },
  finance: {
    bg: "var(--color-base)",
    text: "var(--color-ink-soft)",
    border: "var(--color-line)",
  },
  officer: {
    bg: "var(--color-base)",
    text: "var(--color-muted-strong)",
    border: "var(--color-line)",
  },
};
