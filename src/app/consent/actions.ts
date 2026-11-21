"use server";

import { logger } from "@/src/lib/logger";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/src/lib/auth/session-user";
import { createAdminClient } from "@/src/lib/supabase/service-role";
import { getFullName, getGoogleSub } from "@/src/lib/auth/google-sub";
import { CONSENT_VERSION } from "@/src/lib/auth/consent-config";
import { getPendingInviteCookie } from "@/src/lib/auth/session-invite";
import { ROUTES, officerLandingPath, signInPath } from "@/src/lib/routes";

/** The officer ticked "I agree": create the account and store the agreement. */
export async function acceptConsent(formData: FormData) {
  if (formData.get("agree") !== "on") redirect(ROUTES.consent);

  const { supabase, user } = await getSessionUser();
  if (!user) redirect(ROUTES.signIn);

  const googleSub = getGoogleSub(user);
  if (!googleSub) {
    await supabase.auth.signOut();
    redirect(signInPath("google_error"));
  }

  const now = new Date().toISOString();
  const { error } = await createAdminClient().from("officers").insert({
    id: user.id,
    google_sub: googleSub,
    email: user.email ?? "",
    full_name: getFullName(user),
    consent_version: CONSENT_VERSION,
    consent_at: now,
    created_at: now,
    last_sign_in_at: now,
  });

  // 23505 = unique violation: this officer already exists (e.g. a double submit)
  if (error && error.code !== "23505") {
    logger.error("consent.create_officer_failed", { userId: user.id, error });
    await supabase.auth.signOut();
    redirect(signInPath("google_error"));
  }

  // A pending invite comes first, then the create screen
  redirect(officerLandingPath({ pendingInvite: await getPendingInviteCookie() }));
}

/** The officer chose not to agree: no account is kept. */
export async function declineConsent() {
  const { supabase, user } = await getSessionUser();

  if (user) {
    const admin = createAdminClient();
    // Only remove the sign-in record if there is no officer behind it
    const { data: officer, error: lookupError } = await admin
      .from("officers")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    // Never delete when the lookup itself failed: a failed lookup looks the same as "no
    // officer", and deleting the sign-in record of an existing officer would cascade to
    // their officer row, org memberships and audit records. Same rule as the sign-in
    // callback, which never treats a failed lookup as "new officer".
    if (lookupError) {
      logger.error("consent.decline_lookup_failed", { userId: user.id, error: lookupError });
      await supabase.auth.signOut();
      redirect(signInPath("google_error"));
    }

    if (!officer) {
      const { error } = await admin.auth.admin.deleteUser(user.id);
      if (error) logger.error("consent.remove_declined_failed", { userId: user.id, error });
    }
  }

  await supabase.auth.signOut();
  redirect(ROUTES.signIn);
}
