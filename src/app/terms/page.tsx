import Link from "next/link";
import Image from "next/image";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#F4F4F5] text-[#18181B] py-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        {/* Navigation / Header Brand */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/signin" className="flex items-center group">
            <Image
              src="/orgkit-text-logo.png"
              alt="OrgKit"
              width={135}
              height={45}
              priority
              className="h-8 w-auto object-contain select-none transition-opacity group-hover:opacity-85"
            />
          </Link>
          <Link
            href="/signin"
            className="text-sm font-semibold text-[#059669] hover:underline"
          >
            ← Back to Sign in
          </Link>
        </div>

        {/* Page Title & Date outside the card */}
        <div className="mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#18181B]">
            Terms of Service
          </h1>
          <p className="mt-2 text-sm text-[#71717A]">
            Last updated: November 1, 2026
          </p>
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#E4E4E7] p-8 sm:p-12 shadow-sm space-y-6">
          <p className="text-[15px] sm:text-base leading-relaxed text-[#3F3F46]">
            Welcome to OrgKit — a modern platform for student organizations to connect,
            manage, and grow together. By using the website or mobile web application you agree
            to these terms.
          </p>

          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#18181B] mb-3">
              Your account
            </h2>
            <ul className="space-y-3 text-[14.5px] sm:text-[15px] leading-relaxed text-[#3F3F46]">
              <li className="flex items-start gap-2">
                <span className="text-[#18181B] font-bold select-none">•</span>
                <span>
                  You are responsible for your account and activity under it when you sign in with
                  Google.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#18181B] font-bold select-none">•</span>
                <span>
                  <strong className="font-semibold text-[#18181B]">One account per person.</strong>{" "}
                  Each officer must sign in using their own personal Google account. Sharing a single
                  Google login among multiple officers is strictly prohibited.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#18181B] font-bold select-none">•</span>
                <span>
                  You must be an authorized officer or student leader of your organization to access
                  administrative tools and student rosters.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#18181B] font-bold select-none">•</span>
                <span>
                  You can delete or deactivate your officer account anytime through your organization
                  administration settings.
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#18181B] mb-3">
              Your content & organization data
            </h2>
            <ul className="space-y-3 text-[14.5px] sm:text-[15px] leading-relaxed text-[#3F3F46]">
              <li className="flex items-start gap-2">
                <span className="text-[#18181B] font-bold select-none">•</span>
                <span>
                  Student organizations retain full ownership of all materials they publish — member
                  directories, event calendars, announcements, and documentation.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#18181B] font-bold select-none">•</span>
                <span>
                  By using OrgKit, you give us permission to store, display, and process this information
                  solely to operate the organization management platform for your team.
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#18181B] mb-3">
              Acceptable use
            </h2>
            <ul className="space-y-3 text-[14.5px] sm:text-[15px] leading-relaxed text-[#3F3F46]">
              <li className="flex items-start gap-2">
                <span className="text-[#18181B] font-bold select-none">•</span>
                <span>
                  Do not impersonate other student officers, organizations, or university administrators.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#18181B] font-bold select-none">•</span>
                <span>
                  Do not extract, scrape, or misuse student contact information for unauthorized commercial,
                  promotional, or harassment purposes.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#18181B] font-bold select-none">•</span>
                <span>
                  Do not attempt to disrupt or tamper with the platform&apos;s infrastructure or security controls.
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#18181B] mb-3">
              Service changes & termination
            </h2>
            <ul className="space-y-3 text-[14.5px] sm:text-[15px] leading-relaxed text-[#3F3F46]">
              <li className="flex items-start gap-2">
                <span className="text-[#18181B] font-bold select-none">•</span>
                <span>
                  We continuously improve OrgKit features. While we aim for maximum availability, occasional
                  maintenance or updates may take place.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#18181B] font-bold select-none">•</span>
                <span>
                  We reserve the right to suspend or terminate accounts that violate these terms or compromise
                  the safety of the student community.
                </span>
              </li>
            </ul>
          </div>

          <div className="pt-6 border-t border-[#E4E4E7] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#71717A]">
            <span>© {new Date().getFullYear()} OrgKit. All rights reserved.</span>
            <div className="flex items-center gap-4">
              <Link href="/privacy" className="hover:text-[#18181B] hover:underline">
                Privacy Policy
              </Link>
              <span>•</span>
              <Link href="/signin" className="hover:text-[#18181B] hover:underline">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
