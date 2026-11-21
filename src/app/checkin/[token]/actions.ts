"use server";

import { createAdminClient } from "@/src/lib/supabase/service-role";
import type { ConsentLanguage } from "@/src/lib/members/member-consent";
import { isValidEmail } from "@/src/lib/members/member-join";
import { CHECKIN_COPY } from "@/src/lib/checkin/checkin-copy";
import { allowCheckinAttempt, eventIdFromToken } from "@/src/lib/checkin/checkin-server";

export interface CheckinState {
  status: "idle" | "success" | "already" | "expired" | "failed" | "throttled" | "error";
  /** Only the first word of the member's name, only on success / already */
  firstName?: string;
  emailError?: string;
  /** Failure, rate limit and save problems: shown above the button */
  formError?: string;
}

/**
 * Public check-in. Runs with no sign-in, so every rule is checked here and
 * again in the database function; nothing the browser sends is trusted.
 * Order: rate limit, email, token, save.
 */
export async function submitCheckin(
  token: string,
  _prev: CheckinState,
  formData: FormData
): Promise<CheckinState> {
  const language: ConsentLanguage = formData.get("language") === "fil" ? "fil" : "en";
  const copy = CHECKIN_COPY[language];

  try {
    if (!(await allowCheckinAttempt())) {
      return { status: "throttled", formError: copy.tooMany };
    }

    const email = String(formData.get("email") ?? "").trim();
    if (!isValidEmail(email)) {
      return { status: "error", emailError: copy.emailInvalid };
    }

    const eventId = eventIdFromToken(token);
    if (!eventId) return { status: "expired" };

    const { data, error } = await createAdminClient().rpc("checkin_member", {
      p_event: eventId,
      p_email: email,
    });

    if (error) {
      console.error("Error checking in:", error);
      return { status: "error", formError: copy.saveFailed };
    }

    const row = Array.isArray(data) ? data[0] : null;
    switch (row?.result) {
      case "closed":
        return { status: "expired" };
      case "not_found":
        // One message for unknown, pending, inactive and other-org emails
        return { status: "failed", formError: copy.failed };
      case "checked_in":
      case "already": {
        const firstName = typeof row.first_name === "string" ? row.first_name : "";
        return {
          status: row.result === "checked_in" ? "success" : "already",
          firstName,
        };
      }
      default:
        return { status: "error", formError: copy.saveFailed };
    }
  } catch (err) {
    console.error("Unexpected error in submitCheckin:", err);
    return { status: "error", formError: copy.saveFailed };
  }
}
