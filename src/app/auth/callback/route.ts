import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { createAdminClient } from "@/src/lib/supabase/service-role";
import { getGoogleSub } from "@/src/lib/google-sub";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");

  const toSignIn = (errorCode?: string) =>
    NextResponse.redirect(
      new URL(errorCode ? `/signin?error=${errorCode}` : "/signin", requestUrl.origin)
    );

  // Handle errors or user cancellations returned by Google or Supabase Auth
  if (error) {
    const description = errorDescription?.toLowerCase() ?? "";
    if (
      error === "access_denied" ||
      description.includes("denied") ||
      description.includes("cancel")
    ) {
      return toSignIn("cancelled");
    }
    if (
      error === "admin_policy_enforced" ||
      description.includes("admin") ||
      description.includes("policy") ||
      description.includes("school") ||
      description.includes("domain")
    ) {
      return toSignIn("school_blocked");
    }
    return toSignIn("google_error");
  }

  if (!code) return toSignIn();

  const supabase = await createClient();
  const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError || !data.user) {
    console.error("Auth exchange error:", exchangeError);
    return toSignIn("google_error");
  }

  const user = data.user;
  const googleSub = getGoogleSub(user);

  if (!googleSub) {
    console.error("Missing Google sub claim for user:", user.id);
    return toSignIn("google_error");
  }

  // Service-role client so row level security never blocks the callback
  const admin = createAdminClient();

  // Match by Google's permanent account ID, never by email
  const { data: officer, error: officerQueryError } = await admin
    .from("officers")
    .select("id, email")
    .eq("google_sub", googleSub)
    .maybeSingle();

  // Never fall through to "new officer" when the lookup itself failed,
  // or a returning officer could end up looking new
  if (officerQueryError) {
    console.error("Error querying officers table:", officerQueryError);
    await supabase.auth.signOut();
    return toSignIn("google_error");
  }

  if (officer) {
    if (officer.id !== user.id) {
      console.error("Officer row and auth user disagree:", officer.id, user.id);
      await supabase.auth.signOut();
      return toSignIn("google_error");
    }

    // Returning officer: keep the email current and record the sign-in
    const { error: updateError } = await admin
      .from("officers")
      .update({
        last_sign_in_at: new Date().toISOString(),
        email: user.email || officer.email,
      })
      .eq("id", officer.id);

    if (updateError) {
      console.error("Error updating officer:", updateError);
      await supabase.auth.signOut();
      return toSignIn("google_error");
    }

    return NextResponse.redirect(new URL("/workspace", requestUrl.origin));
  }

  // First-time officer: no account row yet. They see the privacy notice first,
  // and the row is created only after they agree (see /consent).
  return NextResponse.redirect(new URL("/consent", requestUrl.origin));
}
