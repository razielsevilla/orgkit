"use client";

import Image from "next/image";
import { Plus_Jakarta_Sans } from "next/font/google";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/src/lib/supabase/client";
import { isSessionExpired } from "@/src/lib/session-config";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export default function SetupPage() {
  const router = useRouter();
  const [officerName, setOfficerName] = useState<string>("");
  const [officerEmail, setOfficerEmail] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOfficer() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/signin");
        return;
      }

      // Check if session has exceeded 7 days limit
      if (isSessionExpired(user.last_sign_in_at)) {
        await supabase.auth.signOut();
        router.push("/signin?error=session_expired");
        return;
      }

      setOfficerName(user.user_metadata?.full_name || user.user_metadata?.name || "Officer");
      setOfficerEmail(user.email || "");
      setLoading(false);
    }

    loadOfficer();
  }, [router]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/signin");
  }

  if (loading) {
    return (
      <main
        className={`${plusJakarta.className} flex min-h-screen items-center justify-center bg-[#F4F4F5]`}
      >
        <span className="text-sm font-medium text-[#71717A]">Loading your session...</span>
      </main>
    );
  }

  return (
    <main
      className={`${plusJakarta.className} flex min-h-screen flex-col items-center justify-center bg-[#F4F4F5] px-4 py-8 text-[#18181B]`}
    >
      <div className="w-full max-w-lg rounded-3xl border border-[#E4E4E7] bg-white p-6 sm:p-8 text-center shadow-[0_20px_50px_rgba(24,24,27,0.08)]">
        <Image
          src="/orgkit-logo.png"
          alt="OrgKit"
          width={72}
          height={46}
          className="mx-auto mb-4 select-none"
        />

        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-[#059669] mb-4">
          <span className="h-2 w-2 rounded-full bg-[#059669]" />
          Authenticated Session Active
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-[#18181B]">
          Welcome, {officerName}!
        </h1>
        <p className="mt-1 text-sm text-[#71717A]">{officerEmail}</p>

        <div className="mt-6 rounded-2xl border border-[#E4E4E7] bg-[#FAFAFA] p-5 text-left text-sm text-[#3F3F46]">
          <p className="font-semibold text-[#18181B] mb-1">Ticket A1 Completed:</p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-[#71717A]">
            <li>Officer authenticated via Google OAuth with minimum scopes (`openid`, `email`, `profile`).</li>
            <li>Officer account verified in Supabase database with privacy consent recorded.</li>
            <li>Ready for <strong>EP-1: Org Setup</strong>.</li>
          </ul>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          className="mt-6 inline-flex h-11 items-center justify-center rounded-full border border-[#E4E4E7] px-6 text-sm font-semibold text-[#18181B] hover:bg-[#FAFAFA] transition-colors"
        >
          Sign out
        </button>
      </div>
    </main>
  );
}

