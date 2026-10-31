import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");

  // Handle errors or user cancellations returned by Google or Supabase Auth
  if (error) {
    if (
      error === "access_denied" ||
      errorDescription?.toLowerCase().includes("denied") ||
      errorDescription?.toLowerCase().includes("cancel")
    ) {
      return NextResponse.redirect(new URL("/register?error=cancelled", requestUrl.origin));
    }
    if (
      errorDescription?.toLowerCase().includes("admin") ||
      errorDescription?.toLowerCase().includes("policy") ||
      errorDescription?.toLowerCase().includes("school") ||
      errorDescription?.toLowerCase().includes("domain")
    ) {
      return NextResponse.redirect(new URL("/register?error=school_blocked", requestUrl.origin));
    }
    return NextResponse.redirect(new URL("/register?error=google_error", requestUrl.origin));
  }

  if (code) {
    const supabase = await createClient();
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError || !data.user) {
      console.error("Auth exchange error:", exchangeError);
      return NextResponse.redirect(new URL("/register?error=google_error", requestUrl.origin));
    }

    const user = data.user;

    // Extract Google sub (account ID)
    const googleIdentity = user.identities?.find((i: { provider: string }) => i.provider === "google");
    const googleSub =
      user.user_metadata?.sub ||
      (googleIdentity?.identity_data as Record<string, unknown> | undefined)?.sub ||
      user.user_metadata?.provider_id;

    if (!googleSub) {
      console.error("Missing Google sub claim for user:", user.id);
      return NextResponse.redirect(new URL("/register?error=google_error", requestUrl.origin));
    }

    // Check if an officer record already exists for this Google sub
    const { data: officer, error: officerQueryError } = await supabase
      .from("officers")
      .select("*")
      .eq("google_sub", googleSub as string)
      .maybeSingle();

    if (officerQueryError) {
      console.error("Error querying officers table:", officerQueryError);
    }

    if (officer) {
      // Existing officer: update last_sign_in_at and sync current email
      await supabase
        .from("officers")
        .update({
          last_sign_in_at: new Date().toISOString(),
          email: user.email ?? officer.email,
        })
        .eq("id", officer.id);

      // If consent hasn't been recorded yet, direct to consent
      if (!officer.consent_version) {
        return NextResponse.redirect(new URL("/consent", requestUrl.origin));
      }

      // Acceptance criterion: Land on org setup (EP-1) if no org, or on their org page if they do
      return NextResponse.redirect(new URL("/setup", requestUrl.origin));
    }

    // First-time sign-in: Show the privacy notice and unticked "I agree" box
    return NextResponse.redirect(new URL("/consent", requestUrl.origin));
  }

  return NextResponse.redirect(new URL("/register", requestUrl.origin));
}
