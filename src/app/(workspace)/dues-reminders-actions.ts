"use server";

import { logger } from "@/src/lib/logger";
import { revalidatePath } from "next/cache";
import { fail, ok, type ActionResult } from "@/src/lib/action-result";
import { withOrgCaller, type OrgCaller } from "@/src/lib/orgs/org-access";
import { duesPath } from "@/src/lib/routes";
import { getBaseUrl } from "@/src/lib/request";
import {
  validateReminderPreviewQuery,
  validateSendReminders,
  validateRetryReminders,
} from "@/src/lib/dues/dues-reminders-validation";
import {
  fetchDuesReminderPreview,
  executeSendRemindersBatch,
} from "@/src/lib/dues/dues-reminders-server";
import type {
  ReminderPreviewData,
  SendReminderSummary,
} from "@/src/lib/dues/dues-reminders-types";
import type { DuesActionError } from "@/src/app/(workspace)/dues-shared";

/**
 * Loads payment reminder preview metadata and recipient evaluations for a period.
 */
export async function getDuesReminderPreviewAction(
  orgId: string,
  periodId: string
): Promise<ActionResult<ReminderPreviewData, DuesActionError>> {
  const validation = validateReminderPreviewQuery({ orgId, periodId });
  if (!validation.isValid || !validation.data) {
    return fail("invalid_input", validation.error ?? "Invalid reminder preview parameters.");
  }

  return withOrgCaller(
    orgId,
    {
      name: "getDuesReminderPreviewAction",
      unexpected: "We couldn't load the reminder preview. Try again.",
    },
    async (caller: OrgCaller) => {
      // Inside the wrapper so a missing site address becomes a normal failure
      const baseUrl = await getBaseUrl();
      const { data, error } = await fetchDuesReminderPreview(
        caller.supabase,
        periodId,
        baseUrl
      );

      if (error || !data) {
        const msg = error?.message ?? "";
        if (msg.includes("period_not_found")) {
          return fail("not_found", "Dues period not found.");
        }
        if (msg.includes("not_authorized")) {
          return fail("not_authorized", "You are not authorized to view this period's reminders.");
        }
        // The cause goes to the server log only; the officer gets a fixed message
        logger.error("dues_reminders.preview_failed", { orgId, periodId, error });
        return fail("failed", "We couldn't load the reminder preview. Try again.");
      }

      return ok(data);
    }
  );
}

/**
 * Sends reminder emails to all eligible unpaid members for a dues period.
 */
export async function sendDuesRemindersAction(
  orgId: string,
  periodId: string
): Promise<ActionResult<SendReminderSummary, DuesActionError>> {
  const validation = validateSendReminders({ orgId, periodId });
  if (!validation.isValid || !validation.data) {
    return fail("invalid_input", validation.error ?? "Invalid send reminders parameters.");
  }

  return withOrgCaller(
    orgId,
    {
      name: "sendDuesRemindersAction",
      unexpected: "We couldn't send the payment reminders. Try again.",
    },
    async (caller: OrgCaller) => {
      // Inside the wrapper, and before anything is sent, so a missing site address
      // becomes a normal failure instead of emails with a bad pay link
      const baseUrl = await getBaseUrl();
      const { data, error } = await executeSendRemindersBatch({
        supabase: caller.supabase,
        periodId,
        baseUrl,
      });

      if (error || !data) {
        const msg = error?.message ?? "";
        if (msg.includes("closed period") || msg.includes("period_closed")) {
          return fail("closed_period", "Reminders cannot be sent for a closed period.");
        }
        if (msg.includes("email provider") || msg.includes("RESEND_API_KEY")) {
          return fail("no_email_provider", "No email provider is configured. Check your RESEND_API_KEY.");
        }
        if (msg.includes("period_not_found")) {
          return fail("not_found", "Dues period not found.");
        }
        if (msg.includes("not_authorized")) {
          return fail("not_authorized", "You are not authorized to send reminders for this organization.");
        }
        // The cause goes to the server log only; the officer gets a fixed message
        logger.error("dues_reminders.send_failed", { orgId, periodId, error });
        return fail("failed", "We couldn't send the payment reminders. Try again.");
      }

      revalidatePath(duesPath(orgId));
      return ok(data);
    }
  );
}

/**
 * Retries sending reminder emails to a specific subset of members that previously failed.
 */
export async function retryFailedRemindersAction(
  orgId: string,
  periodId: string,
  memberIds: string[]
): Promise<ActionResult<SendReminderSummary, DuesActionError>> {
  const validation = validateRetryReminders({ orgId, periodId, memberIds });
  if (!validation.isValid || !validation.data) {
    return fail("invalid_input", validation.error ?? "Invalid retry parameters.");
  }

  return withOrgCaller(
    orgId,
    {
      name: "retryFailedRemindersAction",
      unexpected: "We couldn't retry sending reminders. Try again.",
    },
    async (caller: OrgCaller) => {
      const baseUrl = await getBaseUrl();
      const { data, error } = await executeSendRemindersBatch({
        supabase: caller.supabase,
        periodId,
        baseUrl,
        targetMemberIds: validation.data!.memberIds,
      });

      if (error || !data) {
        const msg = error?.message ?? "";
        if (msg.includes("closed period") || msg.includes("period_closed")) {
          return fail("closed_period", "Reminders cannot be sent for a closed period.");
        }
        if (msg.includes("email provider") || msg.includes("RESEND_API_KEY")) {
          return fail("no_email_provider", "No email provider is configured. Check your RESEND_API_KEY.");
        }
        if (msg.includes("period_not_found")) {
          return fail("not_found", "Dues period not found.");
        }
        if (msg.includes("not_authorized")) {
          return fail("not_authorized", "You are not authorized to send reminders for this organization.");
        }
        // The cause goes to the server log only; the officer gets a fixed message
        logger.error("dues_reminders.retry_failed", { orgId, periodId, error });
        return fail("failed", "We couldn't retry sending reminders. Try again.");
      }

      revalidatePath(duesPath(orgId));
      return ok(data);
    }
  );
}
