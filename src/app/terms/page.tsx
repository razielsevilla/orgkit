import Link from "next/link";
import Image from "next/image";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#F4F4F5] text-[#18181B] py-12 px-6">
      <div className="max-w-2xl mx-auto bg-white rounded-3xl p-8 sm:p-12 border border-[#E4E4E7] shadow-sm">
        <div className="flex items-center gap-3 mb-8">
          <Image src="/orgkit-logo.png" alt="OrgKit" width={48} height={30} />
          <span className="text-xl font-bold">OrgKit Terms of Service</span>
        </div>

        <h1 className="text-2xl font-bold mb-4">Terms of Service</h1>
        <p className="text-sm text-[#71717A] mb-6">Last updated: November 2026</p>

        <section className="space-y-4 text-sm leading-relaxed text-[#3F3F46]">
          <p>
            By using OrgKit, you agree to access the platform responsibly as an authorized officer of your student organization.
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Each officer must sign in using their own personal account; shared accounts are prohibited.</li>
            <li>You agree to keep all student organizational data confidential.</li>
          </ul>
        </section>

        <div className="mt-8 pt-6 border-t border-[#E4E4E7]">
          <Link href="/register" className="text-sm font-semibold text-[#059669] hover:underline">
            ← Return to Sign-in
          </Link>
        </div>
      </div>
    </main>
  );
}

