import type { OrgCallerError } from "@/src/lib/orgs/org-access";
import type { ErrorRule } from "@/src/lib/rpc-errors";

/**
 * Types and the database-error table shared by the dues action files
 * (dues-periods-actions, dues-review-actions, dues-dashboard-actions,
 * dues-reminders-actions). This file has no "use server" directive on purpose: a
 * "use server" file may only export async functions, and the table is a constant.
 */

export type DuesPeriodStatus = "open" | "closed";

export interface DuesPeriod {
  id: string;
  orgId: string;
  name: string;
  amount: number;
  dueOn: string;
  status: DuesPeriodStatus;
  paymentCount: number;
  payToken?: string | null;
  payLinkActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type DuesActionError =
  | OrgCallerError
  | "invalid_input"
  | "not_found"
  | "closed_period"
  | "not_authorized"
  | "already_reviewed"
  | "cannot_review_own_payment"
  | "admin_only"
  | "no_email_provider"
  | "failed";

/**
 * What the dues database functions can refuse with, and what to tell the user. The
 * order of this table does not matter (see `findErrorRule`): the most specific
 * match wins, and the generic `not_found` code only matches a message that is
 * exactly that.
 */
export const DUES_ERROR_RULES: readonly ErrorRule<DuesActionError>[] = [
  {
    match: "already_reviewed",
    error: "already_reviewed",
    message: "This payment has already been reviewed by another officer.",
  },
  {
    match: "cannot_review_own_payment",
    error: "cannot_review_own_payment",
    message: "You cannot review your own payment.",
  },
  {
    match: "admin_only",
    error: "admin_only",
    message: "Only organization admins can undo payment verifications.",
  },
  {
    match: "payment_not_found",
    error: "not_found",
    message: "Payment submission not found.",
  },
  {
    match: "reason_required",
    error: "invalid_input",
    message: "A reason is required.",
  },
  {
    match: "reason_too_long",
    error: "invalid_input",
    message: "Reason cannot exceed 500 characters.",
  },
  {
    match: "Cannot edit closed dues period",
    error: "closed_period",
    message: "Closed dues periods cannot be edited.",
  },
  {
    match: "period_closed",
    error: "closed_period",
    message: "Closed dues periods cannot accept payment links.",
  },
  {
    match: "Name must be between 2 and 100 characters",
    error: "invalid_input",
    message: "Name must be between 2 and 100 characters.",
  },
  {
    match: "Amount must be above 0 and at most 100,000",
    error: "invalid_input",
    message: "Amount must be above ₱0 and at most ₱100,000 with up to 2 decimal places.",
  },
  {
    match: "Due date is required",
    error: "invalid_input",
    message: "Due date is required.",
  },
  {
    match: "invalid_action",
    error: "invalid_input",
    message: "Invalid action for payment link.",
  },
  {
    match: "Dues period not found",
    error: "not_found",
    message: "Dues period not found.",
  },
  {
    // The dashboard and reminder functions raise this one
    match: "period_not_found",
    error: "not_found",
    message: "Dues period not found.",
  },
  {
    // The pay link functions raise the bare code. Exact on purpose: "not_found" is also
    // a piece of "payment_not_found" and "member_not_found", which must not get this message.
    match: "not_found",
    exact: true,
    error: "not_found",
    message: "Dues period not found.",
  },
  {
    match: "Not permitted",
    error: "not_authorized",
    message: "You are not permitted to manage dues for this organization.",
  },
  {
    match: "not_authorized",
    error: "not_authorized",
    message: "You are not permitted to manage dues for this organization.",
  },
];
