import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { payLinkPath } from "../routes.ts";
import { isEmailConfigured } from "../email/env.ts";
import {
  buildDuesReminderSubject,
  buildDuesReminderText,
} from "../email/templates/dues-reminder-template.ts";
import type {
  ReminderPreviewData,
  ReminderRecipient,
  ReminderPeriodInfo,
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
