"use client";

import { useRouter } from "next/navigation";

/** The "Go to my workspace" button on the not-found screen. */
export function GoToWorkspaceButton({ href }: { href: string }) {
  const router = useRouter();

  return (
    <>
      <style>{`
        .orgkit-cta-btn:hover {
          background-color: var(--color-accent-strong) !important;
          box-shadow: 0 4px 14px color-mix(in srgb, var(--color-accent) 28%, transparent) !important;
        }
      `}</style>
      <button
        type="button"
        onClick={() => router.push(href)}
        className="orgkit-cta-btn"
        style={{
          display: "inline-flex",
          height: 46,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 9999,
          backgroundColor: "var(--color-accent)",
          padding: "0 28px",
          fontSize: 14.5,
          fontWeight: 600,
          letterSpacing: "0.01em",
          color: "var(--color-on-accent)",
          border: "none",
          cursor: "pointer",
          boxShadow: "0 2px 8px color-mix(in srgb, var(--color-accent) 20%, transparent)",
          transition: "all 0.15s ease",
        }}
      >
        Go to my workspace
      </button>
    </>
  );
}
