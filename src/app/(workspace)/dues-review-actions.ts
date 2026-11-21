"use server";

import { revalidatePath } from "next/cache";
import { fail, ok, type ActionResult } from "@/src/lib/action-result";
import { withOrgCaller, type OrgCaller } from "@/src/lib/orgs/org-access";
import { rpcFailure } from "@/src/lib/rpc-errors";
import { duesPath } from "@/src/lib/routes";
import { isUuid } from "@/src/lib/validation";
import type { DuesReviewQueueItem } from "@/src/lib/dues/dues-review";
import {
  createScreenshotSignedUrl,
  fetchDuesReviewQueue,
} from "@/src/lib/dues/dues-review-server";
import { validateReviewReason } from "@/src/lib/dues/dues-review-validation";
import { DUES_ERROR_RULES, type DuesActionError } from "@/src/app/(workspace)/dues-shared";

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

/**
 * Generates a short-lived signed URL (5 minutes) for viewing a submission screenshot.
 */
export async function getPaymentScreenshotUrl(
  orgId: string,
  screenshotPath: string
): Promise<ActionResult<{ signedUrl: string }, DuesActionError>> {
  if (!isUuid(orgId)) {
    return fail("not_found", "Invalid organization ID.");
  }

  const trimmedPath = (screenshotPath ?? "").trim();
  if (!trimmedPath) {
    return fail("invalid_input", "Screenshot path is required.");
  }

  return withOrgCaller(
    orgId,
    {
      name: "getPaymentScreenshotUrl",
      unexpected: "We couldn't load the screenshot. Try again.",
    },
    async (caller: OrgCaller) => {
      const { signedUrl, error } = await createScreenshotSignedUrl(
        caller.supabase,
        trimmedPath,
        300
      );

      if (error || !signedUrl) {
        return fail("failed", "Screenshot is unavailable or could not be loaded.");
      }

      return ok({ signedUrl });
    }
  );
}

/**
 * Verifies a submitted dues payment, marking it verified and recording the reviewer.
 */
export async function verifyDuesPayment(
  orgId: string,
  paymentId: string
): Promise<ActionResult<{ ok: true }, DuesActionError>> {
  if (!isUuid(orgId) || !isUuid(paymentId)) {
    return fail("not_found", "Invalid organization or payment ID.");
  }

  return withOrgCaller(
    orgId,
    {
      name: "verifyDuesPayment",
      unexpected: "We couldn't verify the payment. Try again.",
    },
    async (caller: OrgCaller) => {
      const { error } = await caller.supabase.rpc("verify_dues_payment", {
        p_payment_id: paymentId,
      });

      if (error) {
        return rpcFailure(
          "verify_dues_payment",
          error,
          DUES_ERROR_RULES,
          "We couldn't verify the payment. Try again."
        );
      }

      revalidatePath(duesPath(orgId));
      return ok({ ok: true });
    }
  );
}

/**
 * Rejects a submitted dues payment with a reason, allowing member resubmission.
 */
export async function rejectDuesPayment(
  orgId: string,
  paymentId: string,
  reason: string
): Promise<ActionResult<{ ok: true }, DuesActionError>> {
  if (!isUuid(orgId) || !isUuid(paymentId)) {
    return fail("not_found", "Invalid organization or payment ID.");
  }

  const reasonValidation = validateReviewReason(reason);
  if (!reasonValidation.isValid || !reasonValidation.cleaned) {
    return fail("invalid_input", reasonValidation.error ?? "A reason is required.");
  }

  return withOrgCaller(
    orgId,
    {
      name: "rejectDuesPayment",
      unexpected: "We couldn't reject the payment. Try again.",
    },
    async (caller: OrgCaller) => {
      const { error } = await caller.supabase.rpc("reject_dues_payment", {
        p_payment_id: paymentId,
        p_reason: reasonValidation.cleaned!,
      });

      if (error) {
        return rpcFailure(
          "reject_dues_payment",
          error,
          DUES_ERROR_RULES,
          "We couldn't reject the payment. Try again."
        );
      }

      revalidatePath(duesPath(orgId));
      return ok({ ok: true });
    }
  );
}

/**
 * Allows an organization admin to reverse a verified payment back to submitted with an audit reason.
 */
export async function undoDuesPaymentVerification(
  orgId: string,
  paymentId: string,
  reason: string
): Promise<ActionResult<{ ok: true }, DuesActionError>> {
  if (!isUuid(orgId) || !isUuid(paymentId)) {
    return fail("not_found", "Invalid organization or payment ID.");
  }

  const reasonValidation = validateReviewReason(reason);
  if (!reasonValidation.isValid || !reasonValidation.cleaned) {
    return fail("invalid_input", reasonValidation.error ?? "A reason is required.");
  }

  return withOrgCaller(
    orgId,
    {
      name: "undoDuesPaymentVerification",
      unexpected: "We couldn't undo the verification. Try again.",
    },
    async (caller: OrgCaller) => {
      const { error } = await caller.supabase.rpc("undo_dues_payment_verification", {
        p_payment_id: paymentId,
        p_reason: reasonValidation.cleaned!,
      });

      if (error) {
        return rpcFailure(
          "undo_dues_payment_verification",
          error,
          DUES_ERROR_RULES,
          "We couldn't undo the verification. Try again."
        );
      }

      revalidatePath(duesPath(orgId));
      return ok({ ok: true });
    }
  );
}
