import "server-only";
import { createAdminClient } from "@/src/lib/supabase/service-role";
import { looksLikeToken } from "@/src/lib/dues/dues-pay";
import { allowRequest } from "@/src/lib/rate-limit";

export interface DuesPayPublicInfo {
  orgId: string;
  orgName: string;
  periodId: string;
  periodName: string;
  amount: number;
  dueOn: string;
  payLinkActive: boolean;
  periodStatus: string;
}

export const DUES_PAY_ATTEMPTS_PER_MINUTE =
  Number(process.env.DUES_PAY_ATTEMPTS_PER_MINUTE) || 30;

/**
 * Loads public payment info for an active dues period token.
 * Returns null if token is malformed, not found, paused, or closed.
 */
export async function getDuesPayInfo(
  token: string
): Promise<DuesPayPublicInfo | null> {
  if (!looksLikeToken(token)) return null;

  try {
    const { data, error } = await createAdminClient().rpc("get_dues_pay_info", {
      p_pay_token: token,
    });

    if (error) {
      console.error("Error loading dues pay info:", error);
      return null;
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return null;

    // Check if period is closed or pay link is turned off
    if (!row.pay_link_active || row.period_status !== "open") {
      return null;
    }

    return {
      orgId: row.org_id,
      orgName: row.org_name,
      periodId: row.period_id,
      periodName: row.period_name,
      amount: Number(row.amount),
      dueOn: row.due_on,
      payLinkActive: Boolean(row.pay_link_active),
      periodStatus: row.period_status,
    };
  } catch (err) {
    console.error("Unexpected error in getDuesPayInfo:", err);
    return null;
  }
}

/** Counts this attempt against the caller's device IP and returns whether it can proceed. */
export function allowPayAttempt(): Promise<boolean> {
  return allowRequest("pay", DUES_PAY_ATTEMPTS_PER_MINUTE);
}
