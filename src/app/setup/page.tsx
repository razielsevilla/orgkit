import Image from "next/image";
import { Suspense } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import { requireOfficer } from "@/src/lib/officer";
import { signOut } from "@/src/app/auth/actions";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export default function SetupPage() {
  return (
    <main
      className={`${plusJakarta.className} flex min-h-screen flex-col items-center justify-center bg-[#F4F4F5] px-4 py-8 text-[#18181B]`}
    >
      <Suspense
        fallback={<span className="text-sm font-medium text-[#71717A]">Loading your session...</span>}
      >
        <SetupCard />
      </Suspense>
    </main>
  );
}

// Reads the session, so it streams in behind the Suspense boundary above
async function SetupCard() {
  const { officer } = await requireOfficer();

  return (
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
          Signed in
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-[#18181B]">
          Welcome, {officer.full_name || "Officer"}!
        </h1>
        <p className="mt-1 text-sm text-[#71717A] break-words">{officer.email}</p>

        <p className="mt-6 rounded-2xl border border-[#E4E4E7] bg-[#FAFAFA] p-5 text-sm text-[#52525B]">
          Org setup comes next. This page is a placeholder until then.
        </p>

        <form action={signOut}>
          <button
            type="submit"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-full border border-[#E4E4E7] px-6 text-sm font-semibold text-[#18181B] hover:bg-[#FAFAFA] transition-colors"
          >
            Sign out
          </button>
        </form>
    </div>
  );
}
