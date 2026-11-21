"use client";

import { plusJakarta } from "@/src/lib/fonts";
import { AuthBackgroundDecor } from "@/src/components/auth/auth-background-decor";
import { AUTH_LAYOUT_CSS } from "@/src/components/auth/auth-layout-styles";
import { AuthMarketingPane } from "@/src/components/auth/auth-marketing-pane";
import { useAuthScrollLock } from "@/src/components/auth/use-auth-scroll-lock";

export function AuthLayout({ children }: { children: React.ReactNode }) {
  useAuthScrollLock();

  return (
    <main
      className={`${plusJakarta.className} orgkit-page-root`}
      style={{
        backgroundColor: "var(--color-base)",
        color: "var(--color-ink)",
        position: "relative",
        width: "100vw",
        minWidth: "100%",
        height: "100vh",
        maxHeight: "100vh",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      <style>{AUTH_LAYOUT_CSS}</style>

      <AuthBackgroundDecor />

      {/* ═══════════════════════════════════════════════════════════════
          RESPONSIVE BODY: Left Marketing Stack + Right Card Slot
          ═══════════════════════════════════════════════════════════════ */}
      <div className="orgkit-layout-body">
        <AuthMarketingPane />

        {/* ── Right Pane: Dynamic Card Content ── */}
        <div className="orgkit-right-pane">
          {children}
        </div>
      </div>
    </main>
  );
}
