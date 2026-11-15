"use client";

import React, { useEffect, useState, useTransition } from "react";
import { Mail, AlertCircle, AlertTriangle, Send, Lock } from "lucide-react";
import {
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogButton,
} from "@/src/components/ui/dialog";
import type { DuesPeriod } from "@/src/app/(workspace)/dues-actions";
import {
  getDuesReminderPreviewAction,
  sendDuesRemindersAction,
  retryFailedRemindersAction,
} from "@/src/app/(workspace)/dues-actions";
import type {
  ReminderPreviewData,
  SendReminderSummary,
} from "@/src/lib/dues/dues-reminders-types";
import { DuesReminderStatsBadge } from "./dues-reminder-stats-badge";
import { DuesReminderPreviewMessage } from "./dues-reminder-preview-message";
import { DuesReminderSkeleton } from "./dues-reminder-skeleton";
import { DuesReminderProgressBar } from "./dues-reminder-progress";
import { DuesReminderFailureList } from "./dues-reminder-failure-list";
import { DuesReminderSuccessSummary } from "./dues-reminder-success-summary";
import { DuesReminderEmptyState } from "./dues-reminder-empty-state";

export interface DuesReminderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  period: DuesPeriod | null;
  initialPreview?: ReminderPreviewData | null;
  onRemindersSent?: (summary: SendReminderSummary) => void;
}

export function DuesReminderDialog({
  isOpen,
  onClose,
  orgId,
  period,
  initialPreview,
  onRemindersSent,
}: DuesReminderDialogProps) {
  if (!isOpen || !period) return null;

  return (
    <DuesReminderDialogContent
      key={period.id}
      orgId={orgId}
      period={period}
      initialPreview={initialPreview}
      onClose={onClose}
      onRemindersSent={onRemindersSent}
    />
  );
}

function DuesReminderDialogContent({
  orgId,
  period,
  initialPreview = null,
  onClose,
  onRemindersSent,
}: {
  orgId: string;
  period: DuesPeriod;
  initialPreview?: ReminderPreviewData | null;
  onClose: () => void;
  onRemindersSent?: (summary: SendReminderSummary) => void;
}) {
  const [isLoading, setIsLoading] = useState(!initialPreview);
  const [isSending, setIsSending] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [preview, setPreview] = useState<ReminderPreviewData | null>(initialPreview);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<SendReminderSummary | null>(null);

  // Load preview data on open if not provided initially
  useEffect(() => {
    if (initialPreview) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    getDuesReminderPreviewAction(orgId, period.id).then((res) => {
      if (cancelled) return;
      setIsLoading(false);
      if (res.success && res.data) {
        setPreview(res.data);
      } else {
        setError(res.errorMessage || "Failed to load reminder preview.");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [orgId, period.id]);

  const handleSend = async () => {
    if (isSending || !preview || preview.eligible_count === 0) return;
    setIsSending(true);
    setError(null);

    const res = await sendDuesRemindersAction(orgId, period.id);
    setIsSending(false);

    if (res.success && res.data) {
      setSummary(res.data);
      if (onRemindersSent) {
        onRemindersSent(res.data);
      }
      if (res.data.failed_count === 0) {
        // Auto-close on full success after a moment
        setTimeout(() => onClose(), 1200);
      }
    } else {
      setError(res.errorMessage || "Failed to send reminders.");
    }
  };

  const handleRetry = async (failedMemberIds: string[]) => {
    if (isRetrying || failedMemberIds.length === 0) return;
    setIsRetrying(true);
    setError(null);

    const res = await retryFailedRemindersAction(orgId, period.id, failedMemberIds);
    setIsRetrying(false);

    if (res.success && res.data) {
      setSummary(res.data);
      if (onRemindersSent) {
        onRemindersSent(res.data);
      }
      if (res.data.failed_count === 0) {
        setTimeout(() => onClose(), 1200);
      }
    } else {
      setError(res.errorMessage || "Failed to retry sending reminders.");
    }
  };

  const isClosed = period.status === "closed" || preview?.period.is_closed;
  const isEmailConfigured = preview?.is_email_configured ?? true;
  const canSend = !isLoading && !isSending && !isClosed && (preview?.eligible_count ?? 0) > 0;

  return (
    <Dialog
      maxWidth={520}
      labelledBy="dues-reminders-title"
      onDismiss={isSending ? undefined : onClose}
    >
      <DialogHeader
        titleId="dues-reminders-title"
        title="Send payment reminders"
        description={`${period.name} · Due on ${period.dueOn}`}
        onClose={isSending ? undefined : onClose}
        closeDisabled={isSending}
      />

      <DialogBody style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Closed Period Alert */}
        {isClosed && (
          <div
            data-testid="closed-period-alert"
            style={{
              padding: "14px 16px",
              borderRadius: 14,
              backgroundColor: "color-mix(in srgb, var(--color-ink) 5%, transparent)",
              border: "1px solid var(--color-line)",
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              fontSize: 13,
              color: "var(--color-ink)",
            }}
          >
            <Lock size={16} style={{ flexShrink: 0, marginTop: 2, color: "var(--color-muted-strong)" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <strong style={{ fontSize: 13.5, color: "var(--color-ink)" }}>
                This dues period is closed
              </strong>
              <span style={{ fontSize: 12.5, color: "var(--color-muted-strong)", lineHeight: 1.4 }}>
                Payment links are inactive and reminders cannot be sent for closed periods.
              </span>
            </div>
          </div>
        )}

        {/* Missing Email Provider Alert */}
        {!isEmailConfigured && !isClosed && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              backgroundColor: "color-mix(in srgb, #f59e0b 12%, var(--color-surface))",
              border: "1px solid color-mix(in srgb, #f59e0b 30%, transparent)",
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              fontSize: 13,
              color: "#92400e",
            }}
          >
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong>Email service not configured.</strong>
              <div style={{ fontSize: 12, marginTop: 2 }}>
                RESEND_API_KEY is not set. Reminder emails cannot be dispatched.
              </div>
            </div>
          </div>
        )}

        {/* Generic Error */}
        {error && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              backgroundColor: "color-mix(in srgb, var(--color-danger, #ef4444) 10%, var(--color-surface))",
              border: "1px solid color-mix(in srgb, var(--color-danger, #ef4444) 25%, transparent)",
              fontSize: 12.5,
              color: "var(--color-danger, #ef4444)",
            }}
          >
            {error}
          </div>
        )}

        {/* Loading Skeleton */}
        {isLoading && <DuesReminderSkeleton />}

        {/* In-Flight Sending Progress */}
        {(isSending || isRetrying) && (
          <DuesReminderProgressBar
            total={summary?.failures.length || preview?.eligible_count}
            label={isRetrying ? "Retrying failed reminders..." : "Sending payment reminders..."}
          />
        )}

        {/* Success Completion Summary */}
        {summary && summary.failed_count === 0 && !isSending && !isRetrying && (
          <DuesReminderSuccessSummary
            sentCount={summary.sent_count}
            skippedCount={summary.skipped_count}
          />
        )}

        {/* Partial Failure List with Selective Retry */}
        {summary && summary.failures.length > 0 && !isSending && !isRetrying && (
          <DuesReminderFailureList
            failures={summary.failures}
            onRetry={handleRetry}
            isRetrying={isRetrying}
          />
        )}

        {/* Preview State */}
        {!isLoading && !isSending && !isRetrying && !summary && preview && (
          <>
            <DuesReminderStatsBadge
              eligibleCount={preview.eligible_count}
              skipped24hCount={preview.skipped_24h_count}
              totalUnpaidCount={preview.total_unpaid_count}
            />

            {preview.eligible_count === 0 && !isClosed ? (
              <DuesReminderEmptyState />
            ) : (
              <>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-ink)", marginTop: 4 }}>
                  Message preview
                </div>

                <DuesReminderPreviewMessage
                  subject={preview.preview_subject}
                  text={preview.preview_text}
                  sampleRecipientName={preview.sample_recipient?.name}
                  sampleRecipientEmail={preview.sample_recipient?.email}
                />
              </>
            )}
          </>
        )}
      </DialogBody>

      <DialogFooter>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            flexWrap: "wrap",
            gap: 10,
            width: "100%",
          }}
        >
          <DialogButton onClick={onClose} disabled={isSending || isRetrying}>
            {summary ? "Done" : "Cancel"}
          </DialogButton>
          {!summary && (
            <DialogButton
              variant="primary"
              onClick={handleSend}
              disabled={!canSend || isRetrying}
            >
              {isSending ? (
                "Sending..."
              ) : (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Send size={14} />
                  <span>Send reminders</span>
                </span>
              )}
            </DialogButton>
          )}
        </div>
      </DialogFooter>
    </Dialog>
  );
}
