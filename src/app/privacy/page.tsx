import Link from "next/link";
import Image from "next/image";

export default function PrivacyPage() {
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
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-[#71717A]">
            Last updated: November 1, 2026
          </p>
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#E4E4E7] p-8 sm:p-12 shadow-sm space-y-6">
          <p className="text-[15px] sm:text-base leading-relaxed text-[#3F3F46]">
            OrgKit is a modern management platform for student organizations to connect,
            manage, and grow together. This policy applies to our website and application.
          </p>

          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#18181B] mb-3">
              What we collect
            </h2>
            <ul className="space-y-3 text-[14.5px] sm:text-[15px] leading-relaxed text-[#3F3F46]">
              <li className="flex items-start gap-2">
                <span className="text-[#18181B] font-bold select-none">•</span>
                <span>
                  <strong className="font-semibold text-[#18181B]">Account data.</strong>{" "}
                  Google sign-in provides your name, email address, and permanent Google account
                  identifier (<code className="text-xs bg-[#F4F4F5] px-1.5 py-0.5 rounded text-[#18181B]">google_sub</code>).
                  Google may also provide your profile photo. We never receive your Google password.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#18181B] font-bold select-none">•</span>
                <span>
                  <strong className="font-semibold text-[#18181B]">Organizational data.</strong>{" "}
                  Student organization rosters, assigned officer positions, events, and campus activities
                  are stored within your organization&apos;s workspace.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#18181B] font-bold select-none">•</span>
                <span>
                  <strong className="font-semibold text-[#18181B]">Minimal permissions.</strong>{" "}
                  OrgKit requests only the minimal <code className="text-xs bg-[#F4F4F5] px-1.5 py-0.5 rounded text-[#18181B]">openid</code>,{" "}
                  <code className="text-xs bg-[#F4F4F5] px-1.5 py-0.5 rounded text-[#18181B]">email</code>, and{" "}
                  <code className="text-xs bg-[#F4F4F5] px-1.5 py-0.5 rounded text-[#18181B]">profile</code> scopes.
                  We never request or access your Gmail, Google Drive, or Google Sheets.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#18181B] font-bold select-none">•</span>
                <span>
                  <strong className="font-semibold text-[#18181B]">Safety & audit logs.</strong>{" "}
                  Sign-in records and consent agreement timestamps are recorded to verify officer identities
                  and protect student organizational data from unauthorized access.
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#18181B] mb-3">
              How we use your information
            </h2>
            <ul className="space-y-3 text-[14.5px] sm:text-[15px] leading-relaxed text-[#3F3F46]">
              <li className="flex items-start gap-2">
                <span className="text-[#18181B] font-bold select-none">•</span>
                <span>
                  <strong className="font-semibold text-[#18181B]">Authentication & session management.</strong>{" "}
                  We match your sign-in to your officer account using Google&apos;s permanent account identifier,
                  ensuring your access is preserved even if your university email changes.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#18181B] font-bold select-none">•</span>
                <span>
                  <strong className="font-semibold text-[#18181B]">Team collaboration.</strong>{" "}
                  Your name and contact email are visible only to fellow officers and authorized members
                  of your own student organization.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#18181B] font-bold select-none">•</span>
                <span>
                  <strong className="font-semibold text-[#18181B]">No data selling.</strong>{" "}
                  We do not sell, rent, or monetize your personal or organization information.
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#18181B] mb-3">
              Your rights & control
            </h2>
            <ul className="space-y-3 text-[14.5px] sm:text-[15px] leading-relaxed text-[#3F3F46]">
              <li className="flex items-start gap-2">
                <span className="text-[#18181B] font-bold select-none">•</span>
                <span>
                  You can revoke OrgKit&apos;s access to your Google account at any time through your Google
                  Security settings.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#18181B] font-bold select-none">•</span>
                <span>
                  You may request deletion of your officer profile and records by contacting your organization
                  lead administrator.
                </span>
              </li>
            </ul>
          </div>

          <div className="pt-6 border-t border-[#E4E4E7] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#71717A]">
            <span>© {new Date().getFullYear()} OrgKit. All rights reserved.</span>
            <div className="flex items-center gap-4">
              <Link href="/terms" className="hover:text-[#18181B] hover:underline">
                Terms of Service
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
