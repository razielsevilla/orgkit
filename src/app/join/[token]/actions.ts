"use server";

import { createAdminClient } from "@/src/lib/supabase/service-role";
import { CURRENT_MEMBER_CONSENT, type ConsentLanguage } from "@/src/lib/members/member-consent";
import { allowJoinAttempt } from "@/src/lib/members/member-join-server";
import {
  JOIN_MESSAGES,
  cleanName,
  isValidEmail,
  isValidName,
  looksLikeToken,
} from "@/src/lib/members/member-join";

export interface JoinState {
  status: "idle" | "success" | "inactive" | "error";
  nameError?: string;
  emailError?: string;
  /** Consent, 18+, rate limit and save problems: shown above the button */
  formError?: string;
}

/**
 * Public join. Runs with no sign-in, so every rule is checked here and again
 * in the database function; nothing the browser sends is trusted.
 * Order: rate limit, fields, consent, 18+, save.
 */
export async function submitJoin(
  token: string,
  _prev: JoinState,
  formData: FormData
): Promise<JoinState> {
  try {
    if (!(await allowJoinAttempt())) {
      return { status: "error", formError: JOIN_MESSAGES.tooMany };
    }

    const name = cleanName(String(formData.get("fullName") ?? ""));
    const email = String(formData.get("email") ?? "").trim();
    const language: ConsentLanguage = formData.get("language") === "fil" ? "fil" : "en";

    const nameError = isValidName(name) ? undefined : JOIN_MESSAGES.nameInvalid;
    const emailError = isValidEmail(email) ? undefined : JOIN_MESSAGES.emailInvalid;
    if (nameError || emailError) {
      return { status: "error", nameError, emailError };
    }

    // The wording the student saw must still be the current wording
    if (formData.get("consentVersion") !== CURRENT_MEMBER_CONSENT.version) {
      return { status: "error", formError: JOIN_MESSAGES.pageUpdated };
    }
    if (formData.get("agree") !== "on") {
      return { status: "error", formError: JOIN_MESSAGES.consentMissing };
    }
    if (formData.get("adult") !== "on") {
      return { status: "error", formError: JOIN_MESSAGES.underAge };
    }

    if (!looksLikeToken(token)) return { status: "inactive" };

    const { data, error } = await createAdminClient().rpc("join_org", {
      p_token: token,
      p_name: name,
      p_email: email,
      p_language: language,
      p_consent_version: CURRENT_MEMBER_CONSENT.version,
    });

    if (error) {
      console.error("Error joining org:", error);
      return { status: "error", formError: JOIN_MESSAGES.saveFailed };
    }
    if (data === "inactive") return { status: "inactive" };
    if (data === "ok") return { status: "success" };

    return { status: "error", formError: JOIN_MESSAGES.saveFailed };
  } catch (err) {
    console.error("Unexpected error in submitJoin:", err);
    return { status: "error", formError: JOIN_MESSAGES.saveFailed };
  }
}
