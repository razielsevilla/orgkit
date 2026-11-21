/**
 * Types and interfaces for P5: Payment Reminders.
 */

export type ReminderStatus = "sent" | "failed" | "bounced" | "skipped";

export type ReminderSkipReason =
  | "paid"
  | "pending"
  | "inactive"
  | "recently_reminded";

export interface DuesReminderRecord {
  id: string;
  org_id: string;
  period_id: string;
  member_id: string;
  sent_by: string;
  sent_at: string;
  status: ReminderStatus;
  error_message: string | null;
}

export interface ReminderRecipient {
  member_id: string;
  full_name: string;
  email: string;
  is_eligible: boolean;
  skip_reason?: ReminderSkipReason | null;
  last_reminded_at?: string | null;
}

export interface ReminderPeriodInfo {
  period_id: string;
  org_id: string;
  org_name: string;
  period_name: string;
  amount: number;
  due_on: string;
  pay_token: string;
  is_closed: boolean;
  pay_url: string;
}

export interface ReminderPreviewData {
  period: ReminderPeriodInfo;
  total_unpaid_count: number;
  eligible_count: number;
  skipped_24h_count: number;
  is_email_configured: boolean;
  preview_subject: string;
  preview_text: string;
  sample_recipient: {
    name: string;
    email: string;
  } | null;
}

export interface SendReminderResult {
  member_id: string;
  email: string;
  status: ReminderStatus;
  error_message?: string;
}

export interface SendReminderFailure {
  member_id: string;
  full_name: string;
  email: string;
  error_message: string;
}

export interface SendReminderSummary {
  total_targeted: number;
  sent_count: number;
  failed_count: number;
  skipped_count: number;
  failures: SendReminderFailure[];
}
