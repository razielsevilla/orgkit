"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";
import { createAdminClient } from "@/src/lib/supabase/service-role";
import { getFullName, getGoogleSub } from "@/src/lib/google-sub";
import { CONSENT_VERSION } from "@/src/lib/consent-config";
import { getPendingInviteCookie } from "@/src/lib/session-invite";

/** The officer ticked "I agree": create the account and store the agreement. */
export async function acceptConsent(formData: FormData) {
  if (formData.get("agree") !== "on") redirect("/consent");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signin");

  const googleSub = getGoogleSub(user);
  if (!googleSub) {
    await supabase.auth.signOut();
    redirect("/signin?error=google_error");
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
    console.error("Error creating officer:", error);
    await supabase.auth.signOut();
    redirect("/signin?error=google_error");
  }

  const pendingToken = await getPendingInviteCookie();
  if (pendingToken) {
    redirect(`/invite/${pendingToken}`);
  }

  redirect("/orgs/new");
}

/** The officer chose not to agree: no account is kept. */
export async function declineConsent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const admin = createAdminClient();
    // Only remove the sign-in record if there is no officer behind it
    const { data: officer } = await admin
      .from("officers")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();
    if (!officer) {
      const { error } = await admin.auth.admin.deleteUser(user.id);
      if (error) console.error("Error removing declined sign-in:", error);
    }
  }

  await supabase.auth.signOut();
  redirect("/signin");
}
