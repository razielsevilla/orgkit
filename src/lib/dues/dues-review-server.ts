import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DuesReviewQueueItem } from "@/src/lib/dues/dues-review";

interface DuesReviewQueueRow {
  payment_id: string;
  member_id: string;
  member_name: string;
  member_email: string;
  amount: number | string;
  reference_no: string;
  screenshot_path: string;
  submitted_at: string;
}

/**
 * Loads the review queue for a period (submitted payments, oldest first).
 */
export async function fetchDuesReviewQueue(
  supabase: SupabaseClient,
  orgId: string,
  periodId: string
): Promise<{ data: DuesReviewQueueItem[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc("get_dues_review_queue", {
      p_org_id: orgId,
      p_period_id: periodId,
    });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    const rows = (data ?? []) as DuesReviewQueueRow[];
    const items: DuesReviewQueueItem[] = rows.map((row) => ({
      paymentId: row.payment_id,
      memberId: row.member_id,
      memberName: row.member_name,
      memberEmail: row.member_email,
      amount: Number(row.amount),
      referenceNo: row.reference_no,
      screenshotPath: row.screenshot_path,
      submittedAt: row.submitted_at,
    }));

    return { data: items, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Creates a short-lived signed URL for a dues screenshot.
 * By default expires in 300 seconds (5 minutes).
 */
export async function createScreenshotSignedUrl(
  supabase: SupabaseClient,
  screenshotPath: string,
  expiresIn = 300
): Promise<{ signedUrl: string | null; error: Error | null }> {
  try {
    if (!screenshotPath) {
      return { signedUrl: null, error: new Error("Missing screenshot path") };
    }

    // Strip bucket name if prefix included
    const cleanPath = screenshotPath.replace(/^dues-screenshots\//, "");

    const { data, error } = await supabase.storage
      .from("dues-screenshots")
      .createSignedUrl(cleanPath, expiresIn);

    if (error || !data?.signedUrl) {
      return { signedUrl: null, error: new Error(error?.message ?? "Failed to create signed URL") };
    }

    return { signedUrl: data.signedUrl, error: null };
  } catch (err) {
    return { signedUrl: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}
