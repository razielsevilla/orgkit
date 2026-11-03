import { plusJakarta } from "@/src/lib/fonts";
import { Navbar, type OfficerProfile } from "@/src/components/layout/navbar";
import { ZeroScrollLock } from "@/src/components/ui/zero-scroll-lock";

interface NewOrgScreenProps {
  officer: OfficerProfile | null;
  children: React.ReactNode;
}

/**
 * The frame around the "Set up your Organization" step: the page canvas with
 * its decorative circles, the top navigation bar, and a centered content area.
 */
export function NewOrgScreen({ officer, children }: NewOrgScreenProps) {
  return (
    <div
      className={plusJakarta.className}
      style={{
        position: "relative",
        height: "100vh",
        maxHeight: "100vh",
        width: "100%",
        overflow: "hidden",
        backgroundColor: "var(--color-base)",
        color: "var(--color-ink)",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
      }}
    >
      <ZeroScrollLock />

      {/* ── CSS Styles & Keyframe Animations ── */}
      <style>{`
        .orgkit-burst-tl { animation: burstTL 0.52s cubic-bezier(0.16, 1.25, 0.38, 1) 0.04s both; }
        .orgkit-burst-fl { animation: burstFL 0.52s cubic-bezier(0.16, 1.25, 0.38, 1) 0.08s both; }
        .orgkit-burst-bl { animation: burstBL 0.52s cubic-bezier(0.16, 1.25, 0.38, 1) 0.12s both; }
        .orgkit-burst-tr { animation: burstTR 0.52s cubic-bezier(0.16, 1.25, 0.38, 1) 0.06s both; }
        .orgkit-burst-fr { animation: burstFR 0.52s cubic-bezier(0.16, 1.25, 0.38, 1) 0.1s both; }
        .orgkit-burst-br { animation: burstBR 0.52s cubic-bezier(0.16, 1.25, 0.38, 1) 0.14s both; }
        .orgkit-burst-dot { animation: burstDot 0.4s ease 0.2s both; }

        .orgkit-float-a { animation: ambientFloatA 3.4s ease-in-out infinite; }
        .orgkit-float-b { animation: ambientFloatB 3.8s ease-in-out infinite; }

        .orgkit-workspace-input:focus {
          border-color: var(--color-accent) !important;
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent) 12%, transparent) !important;
        }
        .orgkit-workspace-btn:hover {
          background-color: var(--color-accent-strong) !important;
          box-shadow: 0 4px 14px color-mix(in srgb, var(--color-accent) 28%, transparent) !important;
        }
        @media (max-width: 639px) {
          .orgkit-floating-decor {
            display: none !important;
          }
        }
      `}</style>

      {/* ── Background Concentric SVG Circles ── */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 260,
          height: 260,
          pointerEvents: "none",
          zIndex: 1,
        }}
      >
        <svg
          viewBox="0 0 260 260"
          style={{ width: "100%", height: "100%", display: "block" }}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="0" cy="0" r="160" fill="var(--color-accent)" fillOpacity="0.04" />
          <circle
            cx="0"
            cy="0"
            r="200"
            stroke="var(--color-accent)"
            strokeWidth="1.2"
            strokeOpacity="0.25"
          />
        </svg>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 0,
          right: 0,
          width: 260,
          height: 260,
          pointerEvents: "none",
          zIndex: 1,
        }}
      >
        <svg
          viewBox="0 0 260 260"
          style={{ width: "100%", height: "100%", display: "block" }}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="260" cy="260" r="150" fill="var(--color-accent)" fillOpacity="0.06" />
          <circle
            cx="260"
            cy="260"
            r="205"
            stroke="var(--color-accent)"
            strokeWidth="1.2"
            strokeOpacity="0.32"
          />
        </svg>
      </div>

      {/* ── Reusable Standalone Top Navigation Bar ── */}
      <Navbar officer={officer} logoHref="/" />

      {/* ── Main Viewport Content ── */}
      <main
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: "20px clamp(24px, 4.5vw, 64px) 36px clamp(24px, 4.5vw, 64px)",
          marginTop: -12,
          boxSizing: "border-box",
        }}
      >
        {children}
      </main>
    </div>
  );
}
