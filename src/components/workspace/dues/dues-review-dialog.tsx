"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogButton,
} from "@/src/components/ui/dialog";
import type { DuesPeriod } from "@/src/app/(workspace)/dues-shared";
import {
  getDuesReviewQueue,
  verifyDuesPayment,
  rejectDuesPayment,
} from "@/src/app/(workspace)/dues-review-actions";
import type { DuesReviewQueueItem } from "@/src/lib/dues/dues-review";
import { DuesReviewPane } from "./dues-review-pane";
import { DuesReviewSkeleton } from "./dues-review-skeleton";
import { DuesRejectDialog } from "./dues-reject-dialog";

interface DuesReviewDialogProps {
  period: DuesPeriod | null;
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  onReviewed?: (paymentId: string, action: "verified" | "rejected") => void;
}

export function DuesReviewDialog({
  period,
  isOpen,
  onClose,
  orgId,
  onReviewed,
}: DuesReviewDialogProps) {
  if (!isOpen || !period) return null;

  return (
    <DuesReviewDialogContent
      key={period.id}
      period={period}
      onClose={onClose}
      orgId={orgId}
      onReviewed={onReviewed}
    />
  );
}

function DuesReviewDialogContent({
  period,
  onClose,
  orgId,
  onReviewed,
}: {
  period: DuesPeriod;
  onClose: () => void;
  orgId: string;
  onReviewed?: (paymentId: string, action: "verified" | "rejected") => void;
}) {
  const [items, setItems] = useState<DuesReviewQueueItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<DuesReviewQueueItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [rejectItem, setRejectItem] = useState<DuesReviewQueueItem | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);

  const titleId = "dues-review-dialog-title";

  const loadQueue = useCallback(async () => {
    setIsLoading(true);
    setBannerError(null);
    try {
      const res = await getDuesReviewQueue(orgId, period.id);
      if (res.success && res.data) {
        setItems(res.data);
        if (res.data.length > 0) {
          setSelectedItem(res.data[0]);
        } else {
          setSelectedItem(null);
        }
      } else {
        setBannerError(res.errorMessage || "Failed to load review queue.");
      }
    } catch {
      setBannerError("Failed to load review queue.");
    } finally {
      setIsLoading(false);
    }
  }, [orgId, period.id]);

  useEffect(() => {
    // Fetch-on-change: loading is set when the request starts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadQueue();
  }, [loadQueue]);

  const handleVerify = async (paymentId: string) => {
    const itemToVerify = items.find((i) => i.paymentId === paymentId);
    if (!itemToVerify || isVerifying) return { success: false };

    setIsVerifying(true);
    setBannerError(null);

    // Optimistic removal
    const previousItems = [...items];
    const currentIndex = items.findIndex((i) => i.paymentId === paymentId);
    const nextItem =
      items.length > 1
        ? items[currentIndex + 1] || items[currentIndex - 1] || null
        : null;

    setItems((prev) => prev.filter((i) => i.paymentId !== paymentId));
    setSelectedItem(nextItem);

    try {
      const res = await verifyDuesPayment(orgId, paymentId);
      if (!res.success) {
        // Rollback on conflict or failure
        setItems(previousItems);
        setSelectedItem(itemToVerify);
        setBannerError(
          res.errorMessage || "Could not verify payment. List has been refreshed."
        );
        if (res.error === "already_reviewed") {
          loadQueue();
        }
        return {
          success: false,
          errorMessage: res.errorMessage || "Failed to verify payment.",
        };
      }
      onReviewed?.(paymentId, "verified");
      return { success: true };
    } catch {
      // Rollback
      setItems(previousItems);
      setSelectedItem(itemToVerify);
      setBannerError("An error occurred while verifying. List has been refreshed.");
      loadQueue();
      return { success: false, errorMessage: "An error occurred." };
    } finally {
      setIsVerifying(false);
    }
  };

  const handleConfirmReject = async (paymentId: string, reason: string) => {
    const itemToReject = items.find((i) => i.paymentId === paymentId);
    if (!itemToReject) return { success: false };

    setBannerError(null);

    // Optimistic removal
    const previousItems = [...items];
    const currentIndex = items.findIndex((i) => i.paymentId === paymentId);
    const nextItem =
      items.length > 1
        ? items[currentIndex + 1] || items[currentIndex - 1] || null
        : null;

    setItems((prev) => prev.filter((i) => i.paymentId !== paymentId));
    setSelectedItem(nextItem);
    setRejectItem(null);

    try {
      const res = await rejectDuesPayment(orgId, paymentId, reason);
      if (!res.success) {
        // Rollback
        setItems(previousItems);
        setSelectedItem(itemToReject);
        setBannerError(
          res.errorMessage || "Could not reject payment. List has been refreshed."
        );
        if (res.error === "already_reviewed") {
          loadQueue();
        }
        return {
          success: false,
          errorMessage: res.errorMessage || "Failed to reject payment.",
        };
      }
      onReviewed?.(paymentId, "rejected");
      return { success: true };
    } catch {
      setItems(previousItems);
      setSelectedItem(itemToReject);
      setBannerError("An error occurred while rejecting. List has been refreshed.");
      loadQueue();
      return { success: false, errorMessage: "An error occurred." };
    }
  };

  return (
    <>
      <Dialog labelledBy={titleId} onDismiss={onClose} maxWidth={920}>
        <DialogHeader
          title={`Review payments: ${period.name}`}
          titleId={titleId}
          onClose={onClose}
        />

        <DialogBody style={{ padding: "16px 20px" }}>
          {bannerError && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                // The message and Retry stack on a narrow screen instead of crushing the text
                flexWrap: "wrap",
                padding: "10px 14px",
                borderRadius: 10,
                backgroundColor: "color-mix(in srgb, #ef4444 10%, transparent)",
                color: "#b91c1c",
                fontSize: "0.8125rem",
                marginBottom: 16,
                gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 1 200px", minWidth: 0 }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{bannerError}</span>
              </div>
              <button
                type="button"
                onClick={loadQueue}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#b91c1c",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: "0.75rem",
                  fontWeight: 600,
                }}
              >
                <RefreshCw size={12} />
                <span>Reload</span>
              </button>
            </div>
          )}

          {isLoading ? (
            <DuesReviewSkeleton />
          ) : (
            <DuesReviewPane
              orgId={orgId}
              periodId={period.id}
              periodName={period.name}
              items={items}
              selectedItem={selectedItem}
              onSelectItem={setSelectedItem}
              onVerify={handleVerify}
              onOpenReject={setRejectItem}
              isVerifying={isVerifying}
            />
          )}
        </DialogBody>

        <DialogFooter>
          <DialogButton variant="secondary" onClick={onClose}>
            Done
          </DialogButton>
        </DialogFooter>
      </Dialog>

      {/* Reject Modal */}
      <DuesRejectDialog
        item={rejectItem}
        isOpen={Boolean(rejectItem)}
        onClose={() => setRejectItem(null)}
        onConfirmReject={handleConfirmReject}
      />
    </>
  );
}
