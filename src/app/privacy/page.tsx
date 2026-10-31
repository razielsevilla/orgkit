import Link from "next/link";
import Image from "next/image";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#F4F4F5] text-[#18181B] py-12 px-6">
      <div className="max-w-2xl mx-auto bg-white rounded-3xl p-8 sm:p-12 border border-[#E4E4E7] shadow-sm">
        <div className="flex items-center gap-3 mb-8">
          <Image src="/orgkit-logo.png" alt="OrgKit" width={48} height={30} />
          <span className="text-xl font-bold">OrgKit Privacy Notice</span>
        </div>

        <h1 className="text-2xl font-bold mb-4">Privacy Notice</h1>
        <p className="text-sm text-[#71717A] mb-6">Last updated: November 2026</p>

        <section className="space-y-4 text-sm leading-relaxed text-[#3F3F46]">
          <p>
            OrgKit respects your privacy. When you sign in with Google, we collect only the minimal information required to authenticate your officer account:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Google Account ID:</strong> Used solely to match your sign-in to your officer account.</li>
            <li><strong>Email address:</strong> Used for communication and organizational membership.</li>
            <li><strong>Full Name:</strong> Displayed to fellow officers within your student organization.</li>
          </ul>
          <p>
            We do <strong>not</strong> access your Google Drive, Gmail, or Google Sheets. Your personal sign-in is private to you and never shared.
          </p>
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

