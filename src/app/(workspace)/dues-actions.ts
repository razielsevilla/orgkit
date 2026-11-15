"use server";

import { revalidatePath } from "next/cache";
import { fail, ok, type ActionResult } from "@/src/lib/action-result";
import {
  withOrgCaller,
  type OrgCaller,
  type OrgCallerError,
} from "@/src/lib/orgs/org-access";
import { rpcFailure, type ErrorRule } from "@/src/lib/rpc-errors";
import { duesPath } from "@/src/lib/routes";
import { isUuid } from "@/src/lib/validation";
import {
  validateDuesPeriodInput,
  type DuesPeriodInput,
  type DuesPeriodValidationErrors,
} from "@/src/lib/dues/dues-validation";
import type { DuesReviewQueueItem } from "@/src/lib/dues/dues-review";
import { fetchDuesReviewQueue } from "@/src/lib/dues/dues-review-server";

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
  | "failed";

const DUES_ERROR_RULES: readonly ErrorRule<DuesActionError>[] = [
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
    match: "not_found",
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

/**
 * Loads all dues periods for an organization.
 */
export async function getWorkspaceDuesPeriods(
  orgId: string
): Promise<ActionResult<DuesPeriod[], DuesActionError>> {
  return withOrgCaller(
    orgId,
    {
      name: "getWorkspaceDuesPeriods",
      unexpected: "We couldn't load your dues periods. Try again.",
    },
    async (caller: OrgCaller) => {
      const { data, error } = await caller.supabase
        .from("dues_periods")
        .select("id, org_id, name, amount, due_on, status, pay_token, pay_link_active, created_at, updated_at")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading dues_periods:", error);
        return fail("failed", "We couldn't load your dues periods. Try again.");
      }

      const periods: DuesPeriod[] = (data || []).map((row) => ({
        id: row.id,
        orgId: row.org_id,
        name: row.name,
        amount: Number(row.amount),
        dueOn: row.due_on,
        status: row.status as DuesPeriodStatus,
        paymentCount: 0, // Placeholder until payments table (subsequent ticket)
        payToken: row.pay_token,
        payLinkActive: Boolean(row.pay_link_active),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      return ok(periods);
    }
  );
}

/**
 * Creates a new dues period with Open status.
 */
export async function createDuesPeriod(
  orgId: string,
  input: DuesPeriodInput
): Promise<ActionResult<{ id: string }, DuesActionError | "validation_error">> {
  const validation = validateDuesPeriodInput(input);
  if (!validation.isValid || !validation.cleaned) {
    const firstErrorMessage =
      validation.errors.name ||
      validation.errors.amount ||
      validation.errors.dueOn ||
      "Invalid input.";
    return fail("invalid_input", firstErrorMessage);
  }

  const { name, amount, dueOn } = validation.cleaned;

  return withOrgCaller(
    orgId,
    {
      name: "createDuesPeriod",
      unexpected: "We couldn't create the dues period. Try again.",
    },
    async (caller: OrgCaller) => {
      const { data, error } = await caller.supabase.rpc("create_dues_period", {
        p_org_id: orgId,
        p_name: name,
        p_amount: amount,
        p_due_on: dueOn,
      });

      if (error) {
        return rpcFailure(
          "create_dues_period",
          error,
          DUES_ERROR_RULES,
          "We couldn't create the dues period. Try again."
        );
      }

      revalidatePath(duesPath(orgId));
      return ok({ id: data as string });
    }
  );
}

/**
 * Updates an open dues period's name, amount, or due date.
 */
export async function updateDuesPeriod(
  orgId: string,
  periodId: string,
  input: DuesPeriodInput
): Promise<ActionResult<void, DuesActionError>> {
  if (!isUuid(periodId)) {
    return fail("not_found", "Invalid dues period ID.");
  }

  const validation = validateDuesPeriodInput(input);
  if (!validation.isValid || !validation.cleaned) {
    const firstErrorMessage =
      validation.errors.name ||
      validation.errors.amount ||
      validation.errors.dueOn ||
      "Invalid input.";
    return fail("invalid_input", firstErrorMessage);
  }

  const { name, amount, dueOn } = validation.cleaned;

  return withOrgCaller(
    orgId,
    {
      name: "updateDuesPeriod",
      unexpected: "We couldn't update the dues period. Try again.",
    },
    async (caller: OrgCaller) => {
      const { error } = await caller.supabase.rpc("update_dues_period", {
        p_period_id: periodId,
        p_name: name,
        p_amount: amount,
        p_due_on: dueOn,
      });

      if (error) {
        return rpcFailure(
          "update_dues_period",
          error,
          DUES_ERROR_RULES,
          "We couldn't update the dues period. Try again."
        );
      }

      revalidatePath(duesPath(orgId));
      return ok();
    }
  );
}

/**
 * Closes an open dues period.
 */
export async function closeDuesPeriod(
  orgId: string,
  periodId: string
): Promise<ActionResult<void, DuesActionError>> {
  if (!isUuid(periodId)) {
    return fail("not_found", "Invalid dues period ID.");
  }

  return withOrgCaller(
    orgId,
    {
      name: "closeDuesPeriod",
      unexpected: "We couldn't close the dues period. Try again.",
    },
    async (caller: OrgCaller) => {
      const { error } = await caller.supabase.rpc("close_dues_period", {
        p_period_id: periodId,
      });

      if (error) {
        return rpcFailure(
          "close_dues_period",
          error,
          DUES_ERROR_RULES,
          "We couldn't close the dues period. Try again."
        );
      }

      revalidatePath(duesPath(orgId));
      return ok();
    }
  );
}

export interface DuesPayLinkInfo {
  periodId: string;
  payToken: string | null;
  payLinkActive: boolean;
  status: string;
}

export interface SetDuesPayLinkResult {
  ok: boolean;
  payToken: string | null;
  payLinkActive: boolean;
}

/**
 * Retrieves payment link info for a dues period.
 */
export async function getDuesPayLink(
  orgId: string,
  periodId: string
): Promise<ActionResult<DuesPayLinkInfo, DuesActionError>> {
  if (!isUuid(orgId) || !isUuid(periodId)) {
    return fail("not_found", "Invalid organization or dues period ID.");
  }

  return withOrgCaller(
    orgId,
    {
      name: "getDuesPayLink",
      unexpected: "We couldn't retrieve the payment link. Try again.",
    },
    async (caller: OrgCaller) => {
      const { data, error } = await caller.supabase.rpc("get_dues_period_pay_link", {
        p_org_id: orgId,
        p_period_id: periodId,
      });

      if (error) {
        return rpcFailure(
          "get_dues_period_pay_link",
          error,
          DUES_ERROR_RULES,
          "We couldn't retrieve the payment link. Try again."
        );
      }

      const row = Array.isArray(data) ? data[0] : data;
      if (!row) {
        return fail("not_found", "Dues period not found.");
      }

      return ok({
        periodId: row.period_id,
        payToken: row.pay_token,
        payLinkActive: Boolean(row.pay_link_active),
        status: row.status,
      });
    }
  );
}

/**
 * Turns a dues period payment link on/off or rotates its token.
 */
export async function setDuesPayLink(
  orgId: string,
  periodId: string,
  action: "on" | "off" | "rotate"
): Promise<ActionResult<SetDuesPayLinkResult, DuesActionError>> {
  if (!isUuid(orgId) || !isUuid(periodId)) {
    return fail("not_found", "Invalid organization or dues period ID.");
  }

  if (!["on", "off", "rotate"].includes(action)) {
    return fail("invalid_input", "Invalid link action.");
  }

  return withOrgCaller(
    orgId,
    {
      name: "setDuesPayLink",
      unexpected: "We couldn't update the payment link. Try again.",
    },
    async (caller: OrgCaller) => {
      const { data, error } = await caller.supabase.rpc("set_dues_pay_link", {
        p_org_id: orgId,
        p_period_id: periodId,
        p_action: action,
      });

      if (error) {
        return rpcFailure(
          "set_dues_pay_link",
          error,
          DUES_ERROR_RULES,
          "We couldn't update the payment link. Try again."
        );
      }

      revalidatePath(duesPath(orgId));
      const isNowActive = action !== "off";
      const token = typeof data === "string" ? data : null;

      return ok({
        ok: true,
        payToken: token,
        payLinkActive: isNowActive,
      });
    }
  );
}

/**
 * Loads submitted payments waiting for officer review for a dues period.
 */
export async function getDuesReviewQueue(
  orgId: string,
  periodId: string
): Promise<ActionResult<DuesReviewQueueItem[], DuesActionError>> {
  if (!isUuid(orgId) || !isUuid(periodId)) {
    return fail("not_found", "Invalid organization or dues period ID.");
  }

  return withOrgCaller(
    orgId,
    {
      name: "getDuesReviewQueue",
      unexpected: "We couldn't load the review queue. Try again.",
    },
    async (caller: OrgCaller) => {
      const { data, error } = await fetchDuesReviewQueue(
        caller.supabase,
        orgId,
        periodId
      );

      if (error) {
        return rpcFailure(
          "get_dues_review_queue",
          error,
          DUES_ERROR_RULES,
          "We couldn't load the review queue. Try again."
        );
      }

      return ok(data ?? []);
    }
  );
}


