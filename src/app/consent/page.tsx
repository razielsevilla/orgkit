"use client";

import Image from "next/image";
import Link from "next/link";
import { Plus_Jakarta_Sans } from "next/font/google";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/src/lib/supabase/client";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export default function ConsentPage() {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialChecking, setInitialChecking] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/register");
        return;
      }

      setUserName(user.user_metadata?.full_name || user.user_metadata?.name || "Officer");

      // Check if officer already has consent
      const googleIdentity = user.identities?.find((i: { provider: string }) => i.provider === "google");
      const googleSub =
        user.user_metadata?.sub ||
        (googleIdentity?.identity_data as Record<string, unknown> | undefined)?.sub ||
        user.user_metadata?.provider_id;

      if (googleSub) {
        const { data: officer } = await supabase
          .from("officers")
          .select("consent_version")
          .eq("google_sub", googleSub as string)
          .maybeSingle();

        if (officer?.consent_version) {
          router.push("/setup");
          return;
        }
      }

      setInitialChecking(false);
    }

    checkAuth();
  }, [router]);

  async function handleAgree() {
    if (!agreed || loading) return;
    setLoading(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push("/register");
        return;
      }

      const googleIdentity = user.identities?.find((i: { provider: string }) => i.provider === "google");
      const googleSub =
        user.user_metadata?.sub ||
        (googleIdentity?.identity_data as Record<string, unknown> | undefined)?.sub ||
        user.user_metadata?.provider_id;

      const email = user.email || "";
      const fullName = user.user_metadata?.full_name || user.user_metadata?.name || "Officer";

      if (!googleSub) {
        throw new Error("Missing Google account information.");
      }

      const now = new Date().toISOString();

      // Upsert officer account with required consent version and timestamp
      const { error: upsertError } = await supabase.from("officers").upsert(
        {
          id: user.id,
          google_sub: googleSub as string,
          email,
          full_name: fullName,
          consent_version: "v1",
          consent_at: now,
          created_at: now,
          last_sign_in_at: now,
        },
        { onConflict: "google_sub" }
      );

      if (upsertError) {
        throw upsertError;
      }

      // Success -> proceed to setup (EP-1)
      router.push("/setup");
    } catch (err: unknown) {
      console.error("Consent error:", err);
      setErrorMessage("Unable to save your agreement. Please try again.");
      setLoading(false);
    }
  }

  async function handleCancel() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/register?error=cancelled");
  }

  if (initialChecking) {
    return (
      <main
        className={`${plusJakarta.className} flex items-center justify-center min-h-screen bg-[#F4F4F5]`}
      >
        <div className="flex flex-col items-center gap-3">
          <svg
            className="animate-spin text-[#059669]"
            width={32}
            height={32}
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle cx="12" cy="12" r="10" stroke="#E4E4E7" strokeWidth="3" />
            <path
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="text-sm font-medium text-[#71717A]">Verifying account...</span>
        </div>
      </main>
    );
  }

  return (
    <main
      className={`${plusJakarta.className} flex min-h-screen items-center justify-center bg-[#F4F4F5] p-4 text-[#18181B]`}
    >
      <div className="w-full max-w-lg rounded-3xl border border-[#E4E4E7]/70 bg-white p-8 sm:p-10 shadow-[0_20px_50px_rgba(24,24,27,0.08)]">
        <div className="flex flex-col items-center text-center">
          <Image
            src="/orgkit-logo.png"
            alt="OrgKit"
            width={72}
            height={46}
            priority
            draggable={false}
            className="mb-5 select-none"
          />

          <h1 className="text-2xl font-bold tracking-tight text-[#18181B] sm:text-3xl">
            Welcome to OrgKit
          </h1>

          <p className="mt-2 text-base text-[#71717A]">
            Signed in as <span className="font-semibold text-[#18181B]">{userName}</span>
          </p>
        </div>

        {/* First sign-in notice required by Ticket A1 */}
        <div className="mt-6 rounded-2xl border border-[#E4E4E7] bg-[#FAFAFA] p-5 text-sm leading-relaxed text-[#3F3F46]">
          <p>
            We use your name and email from Google to run <strong className="font-semibold text-[#18181B]">OrgKit</strong>. Only the officers of your org can see them.
          </p>
        </div>

        {errorMessage && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-center text-sm font-medium text-red-700">
            {errorMessage}
          </div>
        )}

        {/* Unticked "I agree" checkbox as required by Ticket A1 */}
        <label className="mt-6 flex cursor-pointer items-start gap-3 select-none">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 h-5 w-5 rounded border-[#D4D4D8] text-[#059669] focus:ring-[#059669] cursor-pointer"
          />
          <span className="text-sm leading-snug text-[#3F3F46]">
            I agree to the{" "}
            <Link
              href="/privacy"
              target="_blank"
              className="font-semibold text-[#059669] hover:underline"
            >
              Privacy Notice
            </Link>
            .
          </span>
        </label>

        <div className="mt-8 flex flex-col gap-3">
          <button
            type="button"
            disabled={!agreed || loading}
            onClick={handleAgree}
            className="flex h-12 w-full items-center justify-center rounded-full bg-[#059669] text-base font-semibold text-white shadow-sm transition-all hover:bg-[#047857] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Setting up your account..." : "Continue to OrgKit"}
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={handleCancel}
            className="h-10 text-sm font-medium text-[#71717A] hover:text-[#18181B] transition-colors"
          >
            Cancel and return
          </button>
        </div>
      </div>
    </main>
  );
}
