"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ChevronDown, LogOut } from "lucide-react";
import { signOut } from "@/src/app/auth/actions";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

interface OfficerProps {
  id?: string;
  email?: string;
  full_name?: string;
}

export function WorkspaceView({ officer }: { officer?: OfficerProps }) {
  // view: "empty" corresponds to Image 2 ("We can't find that page.")
  // view: "create" corresponds to Image 3 ("Set up your org" card)
  const [view, setView] = useState<"empty" | "create">("empty");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Form field state for the workspace card
  const [orgName, setOrgName] = useState("");
  const [school, setSchool] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lock scrollbars on desktop viewports to guarantee 100% viewport-fit
  useEffect(() => {
    function enforceZeroScroll() {
      if (window.innerWidth >= 1024) {
        document.documentElement.style.overflow = "hidden";
        document.body.style.overflow = "hidden";
      } else {
        document.documentElement.style.overflow = "";
        document.body.style.overflow = "";
      }
    }
    enforceZeroScroll();
    window.addEventListener("resize", enforceZeroScroll);
    return () => {
      window.removeEventListener("resize", enforceZeroScroll);
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, []);

  // Close dropdown menu on click outside or Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Compute officer initials and display name
  const displayName = officer?.full_name?.trim() || "Alex Reyes";
  const initials = (() => {
    if (!officer?.full_name) return "AR";
    const parts = officer.full_name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    if (parts.length === 1 && parts[0].length > 0) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return "AR";
  })();

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
    }, 1000);
  };

  return (
    <div
      className={`${plusJakarta.className} relative flex h-screen max-h-screen w-full flex-col overflow-hidden bg-[#F4F4F5] text-[#18181B] selection:bg-[#059669]/20`}
    >
      {/* ── Background Curved Corner Decorations (Exact Proportions from Mockup) ── */}
      {/* Top-Left Arcs */}
      <div
        className="pointer-events-none absolute -top-8 -left-8 z-0 h-[260px] w-[260px] overflow-hidden"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 260 260"
          className="h-full w-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Pale green filled circular sector */}
          <circle cx="32" cy="32" r="140" fill="#059669" fillOpacity="0.06" />
          {/* Concentric thin outline arc */}
          <circle
            cx="32"
            cy="32"
            r="190"
            stroke="#059669"
            strokeWidth="1.2"
            strokeOpacity="0.32"
          />
        </svg>
      </div>

      {/* Bottom-Right Arcs */}
      <div
        className="pointer-events-none absolute -bottom-10 -right-10 z-0 h-[300px] w-[300px] overflow-hidden"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 300 300"
          className="h-full w-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Pale green filled circular sector */}
          <circle cx="260" cy="260" r="165" fill="#059669" fillOpacity="0.06" />
          {/* Concentric thin outline arc */}
          <circle
            cx="260"
            cy="260"
            r="225"
            stroke="#059669"
            strokeWidth="1.2"
            strokeOpacity="0.32"
          />
        </svg>
      </div>

      {/* ── Top Navigation Bar (Compact Height & Padding) ── */}
      <header className="relative z-20 flex h-14 w-full flex-shrink-0 items-center justify-between px-6 sm:px-10 lg:px-12">
        {/* OrgKit Logo */}
        <Link
          href="/workspace"
          className="inline-flex items-center transition-opacity hover:opacity-90"
        >
          <Image
            src="/orgkit-text-logo.png"
            alt="OrgKit"
            width={96}
            height={32}
            priority
            className="h-6 w-auto select-none object-contain"
          />
        </Link>

        {/* Officer Profile Badge & Dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-expanded={menuOpen}
            aria-haspopup="true"
            className="flex items-center gap-2 rounded-full p-1 pl-1.5 pr-2 transition-colors hover:bg-black/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#059669]"
          >
            {/* Avatar Circle with initials */}
            <div className="flex h-7 w-7 select-none items-center justify-center rounded-full bg-[#D1FAE5] text-[11px] font-bold tracking-tight text-[#059669]">
              {initials}
            </div>

            {/* Officer Name */}
            <span className="text-[13px] font-semibold tracking-tight text-[#18181B]">
              {displayName}
            </span>

            {/* Down Chevron */}
            <ChevronDown
              className={`h-3.5 w-3.5 text-[#71717A] transition-transform duration-200 ${
                menuOpen ? "rotate-180" : ""
              }`}
              strokeWidth={2}
            />
          </button>

          {/* Dropdown Menu */}
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-2xl border border-[#E4E4E7] bg-white p-1.5 shadow-xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150 z-50">
              <div className="border-b border-[#E4E4E7] px-3 py-2">
                <p className="text-xs font-semibold text-[#18181B]">
                  {displayName}
                </p>
                <p className="truncate text-[11px] text-[#71717A]">
                  {officer?.email || "alex.reyes@example.com"}
                </p>
              </div>

              <div className="p-1">
                <form action={signOut}>
                  <button
                    type="submit"
                    className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-xs font-medium text-[#DC2626] transition-colors hover:bg-red-50"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign out
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ── Main Viewport Content (Centered vertically & horizontally, no scroll) ── */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 pb-8 -mt-6">
        {view === "empty" ? (
          /* ═════════════════════════════════════════════════════════════════
             IMAGE 2: Empty State ("We can't find that page.")
             ═════════════════════════════════════════════════════════════════ */
          <div className="flex w-full max-w-sm flex-col items-center text-center animate-in fade-in duration-150">
            {/* Circular Document Search Badge */}
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#059669]/10">
              <svg
                className="h-6 w-6 text-[#059669]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.85"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <circle cx="11.5" cy="14" r="2.25" />
                <path d="m13.2 15.7 2.3 2.3" />
              </svg>
            </div>

            {/* Heading */}
            <h1 className="text-2xl font-extrabold tracking-tight text-[#18181B] sm:text-[26px]">
              We can’t find that page.
            </h1>

            {/* Subtitle */}
            <p className="mt-1.5 max-w-[280px] text-xs font-normal leading-relaxed text-[#71717A] sm:text-[13px]">
              It may not exist, or you may not have access to it.
            </p>

            {/* "Go to my workspace" CTA */}
            <button
              type="button"
              onClick={() => setView("create")}
              className="mt-5 inline-flex h-10 items-center justify-center rounded-full bg-[#059669] px-6 text-[13px] font-semibold tracking-wide text-white shadow-sm transition-all hover:bg-[#047857] active:scale-[0.98]"
            >
              Go to my workspace
            </button>
          </div>
        ) : (
          /* ═════════════════════════════════════════════════════════════════
             IMAGE 3: Workspace Creation Card ("Set up your org")
             ═════════════════════════════════════════════════════════════════ */
          <div className="w-full max-w-[380px] animate-in fade-in zoom-in-95 duration-150">
            {/* Main Card */}
            <div className="w-full rounded-2xl border border-[#E4E4E7] bg-white p-6 shadow-[0_16px_40px_rgba(24,24,27,0.06)] sm:p-7">
              {/* Card Header */}
              <div className="text-center">
                <h1 className="text-xl font-bold tracking-tight text-[#18181B] sm:text-[22px]">
                  Set up your org
                </h1>
                <p className="mt-1 text-xs text-[#71717A] sm:text-[13px]">
                  Start by giving your organization a name.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleCreateSubmit} className="mt-6 space-y-4">
                {/* Field 1: Org name */}
                <div>
                  <label
                    htmlFor="org-name"
                    className="mb-1.5 block text-xs font-semibold text-[#18181B] sm:text-[13px]"
                  >
                    Org name
                  </label>
                  <input
                    id="org-name"
                    type="text"
                    required
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="e.g. Junior Marketing Association"
                    className="h-10 w-full rounded-lg border border-[#E4E4E7] bg-white px-3.5 text-xs text-[#18181B] placeholder-[#A1A1AA] transition-all focus:border-[#059669] focus:outline-none focus:ring-2 focus:ring-[#059669]/15 sm:text-[13px]"
                  />
                </div>

                {/* Field 2: School or community (Optional) */}
                <div>
                  <div className="mb-1.5 flex items-center gap-2">
                    <label
                      htmlFor="school-community"
                      className="text-xs font-semibold text-[#18181B] sm:text-[13px]"
                    >
                      School or community
                    </label>
                    <span className="inline-flex items-center rounded-full bg-[#F4F4F5] px-2 py-0.5 text-[10px] font-medium text-[#71717A]">
                      Optional
                    </span>
                  </div>
                  <input
                    id="school-community"
                    type="text"
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                    placeholder="e.g. Your school or community"
                    className="h-10 w-full rounded-lg border border-[#E4E4E7] bg-white px-3.5 text-xs text-[#18181B] placeholder-[#A1A1AA] transition-all focus:border-[#059669] focus:outline-none focus:ring-2 focus:ring-[#059669]/15 sm:text-[13px]"
                  />
                  <p className="mt-1.5 text-[11px] text-[#71717A]">
                    Leave blank if your org isn't tied to one school.
                  </p>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-6 flex h-10 w-full items-center justify-center rounded-full bg-[#059669] text-xs font-semibold text-white shadow-sm transition-all hover:bg-[#047857] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-75 sm:text-[13px]"
                >
                  {isSubmitting ? "Creating…" : "Create workspace"}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
