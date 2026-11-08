/**
 * Centralized Role-Based Access Control (RBAC) permissions.
 *
 * Rules:
 * - admin: everything, including invites, roles, removing officers, and viewing email addresses.
 * - finance: view the roster and verify payments (cannot manage invites, roles, or view emails).
 * - officer: view the roster and run check-in (cannot manage invites, roles, or view emails).
 */

export type OfficerRole = "admin" | "finance" | "officer";

export type OfficerAction =
  | "invite:create"
  | "invite:revoke"
  | "invite:recreate"
  | "officer:change_role"
  | "officer:remove"
  | "officer:view_emails"
  | "officer:view_list"
  | "members:export"
  | "workspace:manage";

const ROLE_PERMISSIONS: Record<OfficerRole, readonly OfficerAction[]> = {
  admin: [
    "invite:create",
    "invite:revoke",
    "invite:recreate",
    "officer:change_role",
    "officer:remove",
    "officer:view_emails",
    "officer:view_list",
    "members:export",
    "workspace:manage",
  ],
  finance: [
    "officer:view_list",
  ],
  officer: [
    "officer:view_list",
  ],
} as const;

/**
 * Checks whether an officer with the given role can perform an action.
 * Returns false if role is missing or invalid.
 */
export function can(
  role: OfficerRole | string | null | undefined,
  action: OfficerAction
): boolean {
  if (!role) return false;
  const permissions = ROLE_PERMISSIONS[role as OfficerRole];
  if (!permissions) return false;
  return permissions.includes(action);
}

/**
 * Validates whether a given string is a valid OfficerRole.
 */
export function isOfficerRole(role: unknown): role is OfficerRole {
  return role === "admin" || role === "finance" || role === "officer";
}

/**
 * Human-readable role labels and descriptions for UI components.
 */
export const ROLE_DETAILS: Record<
  OfficerRole,
  { label: string; description: string }
> = {
  admin: {
    label: "Admin",
    description: "Everything, including invites, roles and viewing member details.",
  },
  finance: {
    label: "Finance",
    description: "View the roster and verify payments.",
  },
  officer: {
    label: "Officer",
    description: "View the roster and run check-in.",
  },
};

