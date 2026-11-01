"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ChevronDown, LogOut, ArrowLeft } from "lucide-react";
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
  // view: "empty" corresponds to Image 1 ("We can't find that page.")
  // view: "create" corresponds to Image 2 ("Set up your org" card)
  const [view, setView] = useState<"empty" | "create">("empty");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Form field state for the workspace card
  const [orgName, setOrgName] = useState("");
  const [school, setSchool] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Compute officer initials (fallback to "AR" matching the design mockup)
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
    // UI phase - simulated action
    setTimeout(() => {
      setIsSubmitting(false);
    }, 1000);
  };

  return (
    <div
      className={`${plusJakarta.className} relative flex min-h-screen w-full flex-col overflow-x-hidden bg-[#F4F4F5] text-[#18181B] selection:bg-[#059669]/20`}
    >
      {/* ── Background Curved Corner Decorations (Matching Figma Mockup) ── */}
      <div
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
        aria-hidden="true"
      >
        {/* Top-Left Arcs */}
        <div className="absolute -top-[160px] -left-[160px] h-[460px] w-[460px]">
          <svg
            viewBox="0 0 460 460"
            className="h-full w-full"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Pale green filled circular sector */}
            <circle
              cx="160"
              cy="160"
              r="220"
              fill="#059669"
              fillOpacity="0.06"
            />
            {/* Concentric thin outline arc */}
            <circle
              cx="160"
              cy="160"
              r="270"
              stroke="#059669"
              strokeWidth="1.25"
              strokeOpacity="0.32"
            />
          </svg>
        </div>

        {/* Bottom-Right Arcs */}
        <div className="absolute -bottom-[180px] -right-[180px] h-[540px] w-[540px]">
          <svg
            viewBox="0 0 540 540"
            className="h-full w-full"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Pale green filled circular sector */}
            <circle
              cx="380"
              cy="380"
              r="250"
              fill="#059669"
              fillOpacity="0.06"
            />
            {/* Concentric thin outline arc */}
            <circle
              cx="380"
              cy="380"
              r="315"
              stroke="#059669"
              strokeWidth="1.25"
              strokeOpacity="0.32"
            />
          </svg>
        </div>
      </div>

      {/* ── Top Navigation Bar ── */}
      <header className="relative z-20 flex h-20 w-full items-center justify-between px-6 sm:px-10 lg:px-16">
        {/* Logo */}
        <Link
          href="/workspace"
          className="inline-flex items-center transition-opacity hover:opacity-90"
        >
          <Image
            src="/orgkit-text-logo.png"
            alt="OrgKit"
            width={128}
            height={42}
            priority
            className="h-8 w-auto select-none object-contain"
          />
        </Link>

        {/* Officer Profile Badge & Dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-expanded={menuOpen}
            aria-haspopup="true"
            className="flex items-center gap-2.5 rounded-full p-1 pl-1.5 pr-2 transition-colors hover:bg-black/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#059669]"
          >
            {/* Avatar Circle with initials */}
            <div className="flex h-[34px] w-[34px] select-none items-center justify-center rounded-full bg-[#D1FAE5] text-xs font-bold tracking-tight text-[#059669]">
              {initials}
            </div>

            {/* Officer Name */}
            <span className="text-sm font-semibold tracking-tight text-[#18181B]">
              {displayName}
            </span>

            {/* Down Chevron */}
            <ChevronDown
              className={`h-4 w-4 text-[#71717A] transition-transform duration-200 ${
                menuOpen ? "rotate-180" : ""
              }`}
              strokeWidth={2}
            />
          </button>

          {/* Dropdown Menu */}
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-64 origin-top-right rounded-2xl border border-[#E4E4E7] bg-white p-2 shadow-xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150 z-50">
              <div className="border-b border-[#E4E4E7] px-3 py-2.5">
                <p className="text-sm font-semibold text-[#18181B]">
                  {displayName}
                </p>
                <p className="truncate text-xs text-[#71717A]">
                  {officer?.email || "alex.reyes@example.com"}
                </p>
              </div>

              <div className="p-1">
                <form action={signOut}>
                  <button
                    type="submit"
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-[#DC2626] transition-colors hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ── Main Viewport Content ── */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 pb-16 pt-4 sm:pb-24">
        {view === "empty" ? (
          /* ═════════════════════════════════════════════════════════════════
             IMAGE 1: Empty State ("We can't find that page.")
             ═════════════════════════════════════════════════════════════════ */
          <div className="flex w-full max-w-md flex-col items-center text-center animate-in fade-in duration-200">
            {/* Circular Document Search Badge */}
            <div className="mb-6 flex h-[76px] w-[76px] items-center justify-center rounded-full bg-[#059669]/10">
              {/* Folded document with magnifying glass icon */}
              <svg
                className="h-8 w-8 text-[#059669]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.85"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {/* Document shape with folded corner */}
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                {/* Magnifying glass in center */}
                <circle cx="11.5" cy="14" r="2.5" />
                <path d="m13.3 15.8 2.5 2.5" />
              </svg>
            </div>

            {/* Heading */}
            <h1 className="text-3xl font-extrabold tracking-tight text-[#18181B] sm:text-4xl">
              We can’t find that page.
            </h1>

            {/* Subtitle */}
            <p className="mt-2.5 max-w-xs text-sm font-normal leading-relaxed text-[#71717A] sm:text-[15px]">
              It may not exist, or you may not have access to it.
            </p>

            {/* "Go to my workspace" CTA */}
            <button
              type="button"
              onClick={() => setView("create")}
              className="mt-7 inline-flex h-12 items-center justify-center rounded-full bg-[#059669] px-8 text-sm font-semibold tracking-wide text-white shadow-[0_4px_14px_rgba(5,150,105,0.25)] transition-all hover:bg-[#047857] hover:shadow-[0_6px_20px_rgba(5,150,105,0.35)] active:scale-[0.98]"
            >
              Go to my workspace
            </button>
          </div>
        ) : (
          /* ═════════════════════════════════════════════════════════════════
             IMAGE 2: Workspace Creation Card ("Set up your org")
             ═════════════════════════════════════════════════════════════════ */
          <div className="w-full max-w-[480px] animate-in fade-in zoom-in-95 duration-200">
            {/* Subtle Back toggle to easily switch between states */}
            <div className="mb-3 flex items-center">
              <button
                type="button"
                onClick={() => setView("empty")}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#71717A] transition-colors hover:text-[#18181B]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </button>
            </div>

            {/* Main Card */}
            <div className="w-full rounded-[28px] border border-[#E4E4E7] bg-white p-8 shadow-[0_20px_50px_rgba(24,24,27,0.06)] sm:p-10">
              {/* Card Header */}
              <div className="text-center">
                <h1 className="text-2xl font-bold tracking-tight text-[#18181B] sm:text-[28px]">
                  Set up your org
                </h1>
                <p className="mt-1.5 text-sm font-normal text-[#71717A]">
                  Start by giving your organization a name.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleCreateSubmit} className="mt-8 space-y-5">
                {/* Field 1: Org name */}
                <div>
                  <label
                    htmlFor="org-name"
                    className="mb-2 block text-sm font-semibold text-[#18181B]"
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
                    className="h-12 w-full rounded-xl border border-[#E4E4E7] bg-white px-4 text-sm text-[#18181B] placeholder-[#A1A1AA] transition-all focus:border-[#059669] focus:outline-none focus:ring-2 focus:ring-[#059669]/20"
                  />
                </div>

                {/* Field 2: School or community (Optional) */}
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <label
                      htmlFor="school-community"
                      className="text-sm font-semibold text-[#18181B]"
                    >
                      School or community
                    </label>
                    <span className="inline-flex items-center rounded-full bg-[#F4F4F5] px-2 py-0.5 text-xs font-medium text-[#71717A]">
                      Optional
                    </span>
                  </div>
                  <input
                    id="school-community"
                    type="text"
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                    placeholder="e.g. Your school or community"
                    className="h-12 w-full rounded-xl border border-[#E4E4E7] bg-white px-4 text-sm text-[#18181B] placeholder-[#A1A1AA] transition-all focus:border-[#059669] focus:outline-none focus:ring-2 focus:ring-[#059669]/20"
                  />
                  <p className="mt-2 text-xs text-[#71717A]">
                    Leave blank if your org isn't tied to one school.
                  </p>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-8 flex h-12 w-full items-center justify-center rounded-full bg-[#059669] text-[15px] font-semibold text-white shadow-[0_4px_14px_rgba(5,150,105,0.25)] transition-all hover:bg-[#047857] hover:shadow-[0_6px_20px_rgba(5,150,105,0.35)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-75"
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

