"use server";

import { logger } from "@/src/lib/logger";
import { createAdminClient } from "@/src/lib/supabase/service-role";
import {
  DUES_PAY_MESSAGES,
  MAX_SCREENSHOT_BYTES,
  ALLOWED_IMAGE_TYPES,
  type AllowedImageType,
  type DuesPayLanguage,
  detectImageMimeType,
  isValidEmail,
  isValidReferenceNo,
  cleanReferenceNo,
  looksLikeToken,
} from "@/src/lib/dues/dues-pay";
import { allowPayAttempt } from "@/src/lib/dues/dues-pay-server";
import { rpcFailure, type ErrorRule } from "@/src/lib/rpc-errors";

export interface PayState {
  status: "idle" | "success" | "inactive" | "error";
  emailError?: string;
  referenceError?: string;
  screenshotError?: string;
  formError?: string;
  submittedData?: {
    referenceNo: string;
    amount: number;
    orgName: string;
    periodName: string;
  };
}

/** The two ways the form can end when the database refuses a submission */
type SubmitRefusal = "inactive" | "error";

/**
 * What to show for each way submit_dues_payment can refuse, in the member's language.
 *
 * The last two rules catch two submissions racing each other: both pass the function's
 * own checks, and the loser is stopped by a unique index instead, which Postgres reports
 * as `duplicate key value violates unique constraint "<index name>"` (checked against a
 * real database in tests/sql/dues-payment-unique-violations.test.ts). Only these two
 * known index names are mapped; any other unique violation stays a generic failure.
 */
function submitRefusalRules(
  messages: (typeof DUES_PAY_MESSAGES)[DuesPayLanguage]
): ErrorRule<SubmitRefusal>[] {
  return [
    { match: "invalid_or_closed_period", error: "inactive", message: "" },
    { match: "already_submitted", error: "error", message: messages.alreadySubmitted },
    { match: "reference_already_used", error: "error", message: messages.referenceUsed },
    { match: "member_not_eligible", error: "error", message: messages.memberNotEligible },
    {
      match: 'unique constraint "dues_payments_active_member_period_idx"',
      error: "error",
      message: messages.alreadySubmitted,
    },
    {
      match: 'unique constraint "dues_payments_org_reference_key_idx"',
      error: "error",
      message: messages.referenceUsed,
    },
  ];
}

/**
 * Deletes a screenshot that was uploaded for a submission the database then refused,
 * so no orphan file is left. A failure here must not change what the member sees, but
 * it must not be silent either: it is logged with the path (an org ID and a random
 * ID, so nothing about the member) so the file can be removed by hand.
 */
async function removeOrphanedScreenshot(
  supabase: ReturnType<typeof createAdminClient>,
  storagePath: string,
  context: { orgId: string; periodId: string }
): Promise<void> {
  try {
    const { error } = await supabase.storage.from("dues-screenshots").remove([storagePath]);
    if (error) {
      logger.error("dues_pay.orphan_cleanup_failed", { ...context, storagePath, error });
    }
  } catch (err) {
    logger.error("dues_pay.orphan_cleanup_failed", { ...context, storagePath, error: err });
  }
}

/**
 * Public payment submission action. Runs with no sign-in.
 * Validates fields, checks rate limiting, uploads screenshot to private storage,
 * and calls submit_dues_payment RPC via service_role client.
 */
export async function submitDuesPayment(
  token: string,
  _prev: PayState,
  formData: FormData
): Promise<PayState> {
  try {
    const language: DuesPayLanguage =
      formData.get("language") === "fil" ? "fil" : "en";
    const messages = DUES_PAY_MESSAGES[language];

    // 1. Rate limiting per IP per minute
    if (!(await allowPayAttempt())) {
      return { status: "error", formError: messages.tooMany };
    }

    // 2. Validate token shape
    if (!looksLikeToken(token)) {
      return { status: "inactive" };
    }

    // 3. Extract inputs
    const email = String(formData.get("email") ?? "").trim();
    const rawRef = String(formData.get("referenceNo") ?? "");
    const referenceNo = cleanReferenceNo(rawRef);
    const screenshot = formData.get("screenshot");

    // 4. Validate fields
    let emailError: string | undefined;
    let referenceError: string | undefined;
    let screenshotError: string | undefined;

    if (!isValidEmail(email)) {
      emailError = messages.emailInvalid;
    }

    if (!isValidReferenceNo(referenceNo)) {
      referenceError = messages.referenceInvalid;
    }

    const isFileOrBlob =
      Boolean(screenshot) &&
      typeof screenshot === "object" &&
      typeof (screenshot as Blob).size === "number" &&
      typeof (screenshot as Blob).arrayBuffer === "function";

    if (!isFileOrBlob || (screenshot as Blob).size === 0) {
      screenshotError = messages.screenshotMissing;
    } else {
      const fileObj = screenshot as File;
      if (fileObj.size > MAX_SCREENSHOT_BYTES) {
        screenshotError = messages.screenshotTooLarge;
      } else if (
        fileObj.type &&
        !ALLOWED_IMAGE_TYPES.includes(fileObj.type as AllowedImageType)
      ) {
        screenshotError = messages.screenshotInvalidType;
      }
    }

    if (emailError || referenceError || screenshotError) {
      return {
        status: "error",
        emailError,
        referenceError,
        screenshotError,
      };
    }

    const file = screenshot as File;
    const supabase = createAdminClient();

    // 5. Query dues period info to ensure it is active and get org_id
    const { data: infoData, error: infoError } = await supabase.rpc(
      "get_dues_pay_info",
      { p_pay_token: token }
    );

    if (infoError || !infoData) {
      logger.error("dues_pay.submit_info_failed", { error: infoError });
      return { status: "inactive" };
    }

    const row = Array.isArray(infoData) ? infoData[0] : infoData;
    if (!row || !row.pay_link_active || row.period_status !== "open") {
      return { status: "inactive" };
    }

    // 6. Upload file buffer to private dues-screenshots storage
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Verify genuine image bytes (prevents non-image files renamed to .png from being stored)
    const genuineType = detectImageMimeType(buffer);
    if (!genuineType) {
      return {
        status: "error",
        screenshotError: messages.screenshotInvalidType,
      };
    }

    const ext =
      genuineType === "image/png"
        ? "png"
        : genuineType === "image/webp"
          ? "webp"
          : "jpg";
    const storagePath = `${row.org_id}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("dues-screenshots")
      .upload(storagePath, buffer, {
        contentType: genuineType,
        upsert: false,
      });

    if (uploadError) {
      logger.error("dues_pay.screenshot_upload_failed", { orgId: row.org_id, error: uploadError });
      return { status: "error", formError: messages.saveFailed };
    }

    // 7. Call submit_dues_payment RPC
    const { error: rpcError } = await supabase.rpc(
      "submit_dues_payment",
      {
        p_pay_token: token,
        p_email: email,
        p_reference_no: referenceNo,
        p_screenshot_path: storagePath,
      }
    );

    if (rpcError) {
      // Remove uploaded screenshot to avoid orphaned files
      await removeOrphanedScreenshot(supabase, storagePath, {
        orgId: row.org_id,
        periodId: row.period_id,
      });

      // Unmatched errors are logged by rpcFailure and shown as the generic save failure
      const refusal = rpcFailure(
        "submit_dues_payment",
        rpcError,
        submitRefusalRules(messages),
        messages.saveFailed,
        { orgId: row.org_id, periodId: row.period_id }
      );
      if (refusal.error === "inactive") return { status: "inactive" };
      return { status: "error", formError: refusal.errorMessage };
    }

    return {
      status: "success",
      submittedData: {
        referenceNo,
        amount: Number(row.amount),
        orgName: row.org_name,
        periodName: row.period_name,
      },
    };
  } catch (err) {
    logger.error("dues_pay.submit_unexpected", { error: err });
    return {
      status: "error",
      formError: DUES_PAY_MESSAGES.en.saveFailed,
    };
  }
}
