import { z } from "zod";

export const CALLER_TRANSFER_ROLES = ["officer", "finance", "remove"] as const;
export type CallerTransferRole = (typeof CALLER_TRANSFER_ROLES)[number];

export const transferAdminSchema = z.object({
  targetOfficerId: z.string().uuid("Invalid target officer ID"),
  callerNewRole: z.enum(CALLER_TRANSFER_ROLES, {
    message: "Invalid target role for outgoing admin",
  }),
  confirmOrgName: z.string().min(1, "Please type the organization name to confirm"),
});

export type TransferAdminInput = z.infer<typeof transferAdminSchema>;

export const TRANSFER_ADMIN_ERROR_MESSAGES = {
  last_admin: "Every org needs at least one admin. Make someone else an admin first.",
  cannot_transfer_to_self: "You are already an admin. Please choose another officer.",
  officer_not_found: "The selected officer was not found in this organization.",
  not_authorized: "Only an organization admin can transfer admin rights.",
  not_authenticated: "You must be signed in to perform this action.",
  org_not_found: "Organization not found.",
  org_name_mismatch: "The typed organization name does not match.",
  failed: "Failed to transfer admin rights. Please try again.",
} as const;

export type TransferAdminError = keyof typeof TRANSFER_ADMIN_ERROR_MESSAGES;
