import Image from "next/image";
import Link from "next/link";

function GoogleIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  );
}

function MembersIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function CalendarIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" />
    </svg>
  );
}

function ChartIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" x2="18" y1="20" y2="10" />
      <line x1="12" x2="12" y1="20" y2="4" />
      <line x1="6" x2="6" y1="20" y2="14" />
      <path d="M3 13l5-5 4 4 9-9" />
    </svg>
  );
}

export default function RegisterPage() {
  return (
    <main className="relative flex min-h-screen w-full flex-col justify-between overflow-hidden bg-base px-6 py-8 sm:px-10 sm:py-10 lg:px-20 lg:py-14">
      {/* Decorative Corner Waves */}
      <div className="pointer-events-none absolute top-0 left-0 z-0 select-none">
        <Image
          src="/decor-top-left.png"
          alt=""
          width={140}
          height={140}
          className="h-auto w-28 sm:w-36"
          priority
        />
      </div>

      <div className="pointer-events-none absolute top-0 right-0 z-0 select-none">
        <Image
          src="/decor-top-right.png"
          alt=""
          width={200}
          height={160}
          className="h-auto w-44 sm:w-56 md:w-64"
          priority
        />
      </div>

      <div className="pointer-events-none absolute bottom-0 right-0 z-0 select-none">
        <Image
          src="/decor-bottom-right.png"
          alt=""
          width={220}
          height={160}
          className="h-auto w-48 sm:w-60 md:w-72"
          priority
        />
      </div>

      {/* Campus Building Graphic (Bottom Left) */}
      <div className="pointer-events-none absolute bottom-0 left-0 z-0 select-none">
        <Image
          src="/campus-building.png"
          alt="Campus Architecture"
          width={540}
          height={260}
          className="h-auto w-72 sm:w-88 md:w-[460px] lg:w-[500px]"
          priority
        />
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col justify-between">
        {/* Top Branding */}
        <header className="flex items-center gap-3">
          <Image
            src="/orgkit-logo.png"
            alt="OrgKit Logo"
            width={48}
            height={36}
            className="h-9 w-auto object-contain"
            priority
          />
          <div className="h-6 w-[1.5px] bg-line" />
          <span className="text-2xl font-bold tracking-tight text-ink sm:text-[26px]">
            OrgKit
          </span>
        </header>

        {/* Center Section: Split Hero & Register Card */}
        <div className="my-auto grid grid-cols-1 items-center gap-12 py-10 lg:grid-cols-12 lg:gap-8">
          {/* Left Column: Hero Text */}
          <div className="flex flex-col items-start lg:col-span-7 xl:col-span-7">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/90 px-3.5 py-1 text-xs font-medium text-ink shadow-2xs backdrop-blur-xs">
              <span className="h-2 w-2 rounded-full bg-accent" />
              <span>Student Organization Management System</span>
            </div>

            {/* Headline */}
            <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-ink sm:text-5xl lg:text-[54px] lg:leading-[1.12]">
              Organize. Collaborate.
              <br />
              <span className="text-accent">Lead.</span>
            </h1>

            {/* Subtitle */}
            <p className="mt-4 max-w-lg text-base leading-relaxed text-muted sm:text-lg">
              A modern platform for student organizations
              <br className="hidden sm:inline" /> to connect, manage, and grow together.
            </p>

            {/* Features Row */}
            <div className="mt-8 flex flex-wrap items-center gap-4 text-xs font-medium text-ink sm:gap-6 sm:text-sm lg:mt-10">
              <div className="flex items-center gap-2">
                <MembersIcon className="h-4 w-4 text-ink" />
                <span>Manage Members</span>
              </div>
              <div className="h-4 w-px bg-line" />
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-ink" />
                <span>Organize Events</span>
              </div>
              <div className="h-4 w-px bg-line" />
              <div className="flex items-center gap-2">
                <ChartIcon className="h-4 w-4 text-ink" />
                <span>Track Activities</span>
              </div>
            </div>
          </div>

          {/* Right Column: Register Card */}
          <div className="flex justify-center lg:col-span-5 lg:justify-end xl:col-span-5">
            <div className="w-full max-w-[420px] rounded-3xl border border-line bg-surface p-8 shadow-[0_20px_50px_rgba(24,24,27,0.06)] sm:p-10">
              {/* Logo Icon inside card */}
              <div className="flex justify-center">
                <Image
                  src="/orgkit-logo.png"
                  alt="OrgKit Logo"
                  width={64}
                  height={48}
                  className="h-12 w-auto object-contain"
                />
              </div>

              {/* Card Title */}
              <h2 className="mt-5 text-center text-2xl font-bold tracking-tight text-ink">
                Create Your Account
              </h2>

              {/* Card Description */}
              <p className="mt-2 text-center text-xs text-muted sm:text-sm">
                Join OrgKit and be part of a more connected
                <br />
                student community.
              </p>

              {/* Sign up with Google Button */}
              <button
                type="button"
                className="group mt-7 flex w-full cursor-pointer items-center justify-center gap-3 rounded-full border border-line bg-surface px-5 py-3 text-sm font-semibold text-ink shadow-2xs transition-all duration-200 hover:border-zinc-300 hover:bg-zinc-50 active:scale-[0.99]"
              >
                <GoogleIcon className="h-5 w-5 transition-transform group-hover:scale-105" />
                <span>Sign up with Google</span>
              </button>

              {/* Or Divider */}
              <div className="relative my-6 flex items-center justify-center">
                <div className="w-full border-t border-line" />
                <span className="absolute bg-surface px-3 text-xs text-muted">
                  or
                </span>
              </div>

              {/* Terms & Privacy */}
              <p className="mx-auto max-w-[270px] text-center text-xs leading-relaxed text-muted">
                By continuing, you agree to our{" "}
                <Link
                  href="/terms"
                  className="font-medium text-accent hover:underline"
                >
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacy"
                  className="font-medium text-accent hover:underline"
                >
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
          </div>
        </div>

        {/* Empty bottom space to balance spacing above building graphic */}
        <div className="h-4 sm:h-8" />
      </div>
    </main>
  );
}

