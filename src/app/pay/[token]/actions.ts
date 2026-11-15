"use server";

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

    if (!screenshot || !(screenshot instanceof File) || screenshot.size === 0) {
      screenshotError = messages.screenshotMissing;
    } else if (screenshot.size > MAX_SCREENSHOT_BYTES) {
      screenshotError = messages.screenshotTooLarge;
    } else if (
      !ALLOWED_IMAGE_TYPES.includes(screenshot.type as AllowedImageType)
    ) {
      screenshotError = messages.screenshotInvalidType;
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
      console.error("Error fetching pay info in submitDuesPayment:", infoError);
      return { status: "inactive" };
    }

    const row = Array.isArray(infoData) ? infoData[0] : infoData;
    if (!row || !row.pay_link_active || row.period_status !== "open") {
      return { status: "inactive" };
    }

    // 6. Upload file buffer to private dues-screenshots storage
    const ext =
      file.type === "image/png"
        ? "png"
        : file.type === "image/webp"
          ? "webp"
          : "jpg";
    const storagePath = `${row.org_id}/${crypto.randomUUID()}.${ext}`;

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

    const { error: uploadError } = await supabase.storage
      .from("dues-screenshots")
      .upload(storagePath, buffer, {
        contentType: genuineType,
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
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
      await supabase.storage.from("dues-screenshots").remove([storagePath]);

      if (rpcError.message.includes("invalid_or_closed_period")) {
        return { status: "inactive" };
      }
      if (rpcError.message.includes("already_submitted")) {
        return { status: "error", formError: messages.alreadySubmitted };
      }
      if (rpcError.message.includes("reference_already_used")) {
        return { status: "error", formError: messages.referenceUsed };
      }
      if (rpcError.message.includes("member_not_eligible")) {
        return { status: "error", formError: messages.memberNotEligible };
      }

      console.error("RPC submit_dues_payment error:", rpcError);
      return { status: "error", formError: messages.saveFailed };
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
    console.error("Unexpected error in submitDuesPayment:", err);
    return {
      status: "error",
      formError: DUES_PAY_MESSAGES.en.saveFailed,
    };
  }
}
