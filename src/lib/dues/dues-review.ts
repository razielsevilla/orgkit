export type DuesPaymentStatus = "submitted" | "verified" | "rejected";

export type DuesPaymentEventAction = "verified" | "rejected" | "undone";

export interface DuesReviewQueueItem {
  paymentId: string;
  memberId: string;
  memberName: string;
  memberEmail: string;
  amount: number;
  referenceNo: string;
  screenshotPath: string;
  submittedAt: string;
}

export interface DuesPaymentEvent {
  id: string;
  paymentId: string;
  orgId: string;
  action: DuesPaymentEventAction;
  actorId: string;
  reason: string | null;
  createdAt: string;
}

export const REJECT_REASON_SHORTCUTS = [
  "Amount doesn't match",
  "Screenshot unclear",
  "Reference number not found",
  "Duplicate submission",
] as const;

export type RejectReasonShortcut = (typeof REJECT_REASON_SHORTCUTS)[number];
