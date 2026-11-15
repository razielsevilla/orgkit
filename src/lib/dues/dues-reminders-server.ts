import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { payLinkPath } from "../routes.ts";
import { isEmailConfigured } from "../email/env.ts";
import { getEmailSender, type EmailSender } from "../email/email-sender.ts";
import {
  buildDuesReminderSubject,
  buildDuesReminderText,
  buildDuesReminderEmail,
} from "../email/templates/dues-reminder-template.ts";
import type {
  ReminderPreviewData,
  ReminderRecipient,
  ReminderPeriodInfo,
  SendReminderSummary,
  SendReminderFailure,
} from "./dues-reminders-types.ts";

export interface RawReminderRpcResponse {
  period: {
    id: string;
    org_id: string;
    org_name: string;
    period_name: string;
    amount: number | string;
    due_on: string;
    pay_token: string;
    status: string;
    is_closed: boolean;
  };
  counts: {
    total_active_members: number;
    total_unpaid: number;
    eligible: number;
    skipped_24h: number;
    paid_or_pending: number;
  };
  recipients: Array<{
    member_id: string;
    full_name: string;
    email: string;
    is_eligible: boolean;
    skip_reason: string | null;
    last_reminded_at: string | null;
  }>;
}

export interface FetchReminderPreviewResult {
  data: (ReminderPreviewData & { recipients: ReminderRecipient[] }) | null;
  error: Error | null;
}

/**
 * Fetches dues reminder recipient evaluations, counts, and formatted preview data.
 */
export async function fetchDuesReminderPreview(
  supabase: SupabaseClient,
  periodId: string,
  baseUrl = "http://localhost:3000"
): Promise<FetchReminderPreviewResult> {
  try {
    const { data, error } = await supabase.rpc("get_dues_reminder_recipients", {
      p_period_id: periodId,
    });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    const raw = data as RawReminderRpcResponse;
    if (!raw || !raw.period) {
      return { data: null, error: new Error("Invalid reminder data returned from database") };
    }

    const payUrl = `${baseUrl.replace(/\/+$/, "")}${payLinkPath(raw.period.pay_token)}`;

    const periodInfo: ReminderPeriodInfo = {
      period_id: raw.period.id,
      org_id: raw.period.org_id,
      org_name: raw.period.org_name,
      period_name: raw.period.period_name,
      amount: Number(raw.period.amount),
      due_on: raw.period.due_on,
      pay_token: raw.period.pay_token,
      is_closed: raw.period.is_closed,
      pay_url: payUrl,
    };

    const recipients: ReminderRecipient[] = (raw.recipients || []).map((r) => ({
      member_id: r.member_id,
      full_name: r.full_name,
      email: r.email,
      is_eligible: r.is_eligible,
      skip_reason: r.skip_reason as any,
      last_reminded_at: r.last_reminded_at,
    }));

    const sample = recipients.find((r) => r.is_eligible) || recipients[0] || null;

    const sampleName = sample?.full_name || "Member";
    const sampleEmail = sample?.email || "member@example.com";

    const previewSubject = buildDuesReminderSubject({
      periodName: periodInfo.period_name,
      orgName: periodInfo.org_name,
    });

    const previewText = buildDuesReminderText({
      recipientName: sampleName,
      recipientEmail: sampleEmail,
      orgName: periodInfo.org_name,
      periodName: periodInfo.period_name,
      amount: periodInfo.amount,
      dueOn: periodInfo.due_on,
      payUrl: periodInfo.pay_url,
    });

    const previewData = {
      period: periodInfo,
      total_unpaid_count: raw.counts?.total_unpaid ?? 0,
      eligible_count: raw.counts?.eligible ?? 0,
      skipped_24h_count: raw.counts?.skipped_24h ?? 0,
      is_email_configured: isEmailConfigured(),
      preview_subject: previewSubject,
      preview_text: previewText,
      sample_recipient: sample
        ? { name: sample.full_name, email: sample.email }
        : null,
      recipients,
    };

    return { data: previewData, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}


/**
 * Splits an array into smaller chunks of given size.
 */
export function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  if (chunkSize <= 0) return [items];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Async delay helper to throttle email batch requests.
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Classifies an error message into a ReminderStatus ('failed' or 'bounced').
 */
export function classifyReminderError(
  errorMessage?: string | null
): "failed" | "bounced" {
  if (!errorMessage) return "failed";
  const lower = errorMessage.toLowerCase();
  if (
    lower.includes("bounce") ||
    lower.includes("does not exist") ||
    lower.includes("invalid email") ||
    lower.includes("recipient rejected") ||
    lower.includes("undeliverable")
  ) {
    return "bounced";
  }
  return "failed";
}

/**
 * Returns a human-friendly error description for member failure cards.
 */
export function formatReminderErrorMessage(rawError?: string | null): string {
  if (!rawError) return "Delivery failed";
  const lower = rawError.toLowerCase();
  if (
    lower.includes("bounce") ||
    lower.includes("does not exist") ||
    lower.includes("undeliverable")
  ) {
    return "Email bounced (address not found)";
  }
  if (lower.includes("rate limit") || lower.includes("429")) {
    return "Sending paused (rate limit reached, retry shortly)";
  }
  if (lower.includes("invalid") && lower.includes("key")) {
    return "Email service configuration error";
  }
  return rawError;
}

export interface SendRemindersOptions {
  supabase: SupabaseClient;
  periodId: string;
  baseUrl?: string;
  targetMemberIds?: string[];
  chunkSize?: number;
  chunkDelayMs?: number;
  emailSender?: EmailSender;
}

export interface SendRemindersExecutionResult {
  data: SendReminderSummary | null;
  error: Error | null;
}

/**
 * Orchestrates sending payment reminder emails in rate-limited batches.
 */
export async function executeSendRemindersBatch(
  options: SendRemindersOptions
): Promise<SendRemindersExecutionResult> {
  const {
    supabase,
    periodId,
    baseUrl = "http://localhost:3000",
    targetMemberIds,
    chunkSize = 25,
    chunkDelayMs = 150,
    emailSender = getEmailSender(),
  } = options;

  try {
    const previewResult = await fetchDuesReminderPreview(supabase, periodId, baseUrl);
    if (previewResult.error || !previewResult.data) {
      return {
        data: null,
        error: previewResult.error || new Error("Failed to load reminder recipient details."),
      };
    }

    const { period, recipients, skipped_24h_count } = previewResult.data;

    if (period.is_closed) {
      return {
        data: null,
        error: new Error("Reminders cannot be sent for a closed period."),
      };
    }

    if (!isEmailConfigured() && process.env.NODE_ENV === "production") {
      return {
        data: null,
        error: new Error("No email provider is configured. Please check your RESEND_API_KEY."),
      };
    }

    // Filter recipients to send to
    let targets = recipients.filter((r) => r.is_eligible);

    // If specific targetMemberIds are supplied (e.g. for retrying failed members)
    if (targetMemberIds && targetMemberIds.length > 0) {
      const allowedIdSet = new Set(targetMemberIds);
      targets = targets.filter((r) => allowedIdSet.has(r.member_id));
    }

    const failures: SendReminderFailure[] = [];
    let sentCount = 0;
    let failedCount = 0;

    const chunks = chunkArray(targets, Math.max(1, chunkSize));

    for (let c = 0; c < chunks.length; c++) {
      const chunk = chunks[c];

      for (const recipient of chunk) {
        const emailContent = buildDuesReminderEmail({
          recipientName: recipient.full_name,
          recipientEmail: recipient.email,
          orgName: period.org_name,
          periodName: period.period_name,
          amount: period.amount,
          dueOn: period.due_on,
          payUrl: period.pay_url,
        });

        const sendResult = await emailSender.send({
          to: recipient.email,
          subject: emailContent.subject,
          text: emailContent.text,
          html: emailContent.html,
        });

        const status = sendResult.success
          ? "sent"
          : classifyReminderError(sendResult.error);
        const errorMessage = sendResult.success
          ? null
          : (sendResult.error || "Unknown delivery error");
        const userFriendlyError = sendResult.success
          ? null
          : formatReminderErrorMessage(sendResult.error);

        // Log result to database
        try {
          await supabase.rpc("log_dues_reminder", {
            p_period_id: period.period_id,
            p_member_id: recipient.member_id,
            p_status: status,
            p_error_message: errorMessage,
          });
        } catch (logErr) {
          console.error("Failed to log dues reminder to database:", logErr);
        }

        if (sendResult.success) {
          sentCount++;
        } else {
          failedCount++;
          failures.push({
            member_id: recipient.member_id,
            full_name: recipient.full_name,
            email: recipient.email,
            error_message: userFriendlyError || "Delivery failed",
          });
        }
      }

      // Throttle between chunks if more chunks remain
      if (c < chunks.length - 1 && chunkDelayMs > 0) {
        await delay(chunkDelayMs);
      }
    }

    const summary: SendReminderSummary = {
      total_targeted: targets.length,
      sent_count: sentCount,
      failed_count: failedCount,
      skipped_count: skipped_24h_count,
      failures,
    };

    return { data: summary, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}
