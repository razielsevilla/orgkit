import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { createAdminClient } from "@/src/lib/supabase/service-role";

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

    // Extract Google sub (permanent account ID — used for all matching, not email)
    const googleIdentity = user.identities?.find((i: { provider: string }) => i.provider === "google");
    const googleSub =
      user.user_metadata?.sub ||
      (googleIdentity?.identity_data as Record<string, unknown> | undefined)?.sub ||
      user.user_metadata?.provider_id;

    if (!googleSub) {
      console.error("Missing Google sub claim for user:", user.id);
      return NextResponse.redirect(new URL("/register?error=google_error", requestUrl.origin));
    }

    const email = user.email ?? "";
    const now = new Date().toISOString();

    // Use service-role client for DB reads/writes so RLS never blocks the callback
    const admin = createAdminClient();

    // Check if an officer record already exists for this Google sub
    const { data: officer, error: officerQueryError } = await admin
      .from("officers")
      .select("id, email, consent_version")
      .eq("google_sub", googleSub as string)
      .maybeSingle();

    if (officerQueryError) {
      console.error("Error querying officers table:", officerQueryError);
    }

    if (officer) {
      // Returning officer: sync email and update last_sign_in_at
      await admin
        .from("officers")
        .update({
          last_sign_in_at: now,
          email: email || officer.email,
        })
        .eq("id", officer.id);

      // Already consented — go straight to the app
      return NextResponse.redirect(new URL("/setup", requestUrl.origin));
    }

    // First-time officer: create the row now.
    // Google's own OAuth consent screen (shown before this callback runs)
    // is the official consent — no custom page needed.
    const fullName = user.user_metadata?.full_name || user.user_metadata?.name || "";
    const { error: insertError } = await admin.from("officers").insert({
      id: user.id,
      google_sub: googleSub as string,
      email,
      full_name: fullName,
      consent_version: "v1",
      consent_at: now,
      created_at: now,
      last_sign_in_at: now,
    });

    if (insertError) {
      console.error("Error inserting new officer:", insertError);
      return NextResponse.redirect(new URL("/register?error=google_error", requestUrl.origin));
    }

    return NextResponse.redirect(new URL("/setup", requestUrl.origin));
  }

  return NextResponse.redirect(new URL("/register", requestUrl.origin));
}
