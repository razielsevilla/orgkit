"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/src/lib/supabase/client";
import { signInWithGoogle, useGoogleSignIn } from "@/src/lib/use-google-sign-in";
import { GoogleLogo } from "@/src/components/auth/google-logo";
import { LogOut, ArrowRight } from "lucide-react";
import { clearInviteCookie } from "@/src/app/invite/actions";
import { ErrorToast } from "@/src/components/error-toast";
import { ROUTES, invitePath, inviteStartPath, workspacePath } from "@/src/lib/routes";

/**
 * Remembers the invite across the Google round trip. Pages cannot set cookies
 * while they render, so this asks the start route to do it.
 */
async function rememberInvite(token: string) {
  const res = await fetch(inviteStartPath(encodeURIComponent(token)), {
    method: "POST",
    credentials: "same-origin",
  });
  if (!res.ok) throw new Error("Could not start sign-in. Please try again.");
}

/** Clears the pending-invite cookie once the invite can no longer be used. */
export function ClearInviteCookie() {
  useEffect(() => {
    clearInviteCookie().catch(() => {});
  }, []);
  return null;
}

interface InviteGuestButtonProps {
  token: string;
}

export function InviteGuestButton({ token }: InviteGuestButtonProps) {
  // Prompt account selection so the user picks the right Google account
  const { loading, error, start: handleGoogleSignIn } = useGoogleSignIn({
    selectAccount: true,
    prepare: () => rememberInvite(token),
    fallbackError: "Failed to sign in",
  });

  return (
    <div style={{ width: "100%", textAlign: "center" }}>
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={loading}
        style={{
          width: "100%",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          padding: "14px 20px",
          borderRadius: 9999,
          border: "1px solid var(--color-line)",
          backgroundColor: "var(--color-surface)",
          color: "var(--color-ink)",
          fontSize: 15,
          fontWeight: 600,
          cursor: loading ? "not-allowed" : "pointer",
          boxShadow: "0 2px 6px rgba(0, 0, 0, 0.04)",
          transition: "all 0.15s ease",
          opacity: loading ? 0.7 : 1,
        }}
        onMouseEnter={(e) => {
          if (!loading) e.currentTarget.style.backgroundColor = "var(--color-base)";
        }}
        onMouseLeave={(e) => {
          if (!loading) e.currentTarget.style.backgroundColor = "var(--color-surface)";
        }}
      >
        <GoogleLogo size={20} />
        <span>{loading ? "Redirecting to Google…" : "Continue with Google"}</span>
      </button>

      {/* Floating Error Toast */}
      <ErrorToast message={error} />
    </div>
  );
}

interface SwitchAccountButtonProps {
  token: string;
}

export function SwitchAccountButton({ token }: SwitchAccountButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSwitchAccount() {
    setLoading(true);
    try {
      await rememberInvite(token);
      await createClient().auth.signOut();
      await signInWithGoogle({ selectAccount: true });
    } catch {
      setLoading(false);
      router.push(invitePath(token));
    }
  }

  return (
    <button
      type="button"
      onClick={handleSwitchAccount}
      disabled={loading}
      style={{
        width: "100%",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        padding: "13px 20px",
        borderRadius: 9999,
        border: "1px solid var(--color-danger)",
        backgroundColor: "var(--color-surface)",
        color: "var(--color-danger)",
        fontSize: 14,
        fontWeight: 600,
        cursor: loading ? "not-allowed" : "pointer",
        transition: "all 0.15s ease",
        opacity: loading ? 0.7 : 1,
      }}
      onMouseEnter={(e) => {
        if (!loading) {
          e.currentTarget.style.backgroundColor = "var(--color-danger-soft)";
        }
      }}
      onMouseLeave={(e) => {
        if (!loading) {
          e.currentTarget.style.backgroundColor = "var(--color-surface)";
        }
      }}
    >
      <LogOut size={16} />
      <span>{loading ? "Signing out…" : "Sign out and use a different account"}</span>
    </button>
  );
}

interface GoToWorkspaceButtonProps {
  orgId?: string;
}

export function GoToWorkspaceButton({ orgId }: GoToWorkspaceButtonProps) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.push(orgId ? workspacePath(orgId) : ROUTES.home)}
      style={{
        width: "100%",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: "13px 20px",
        borderRadius: 9999,
        border: "none",
        backgroundColor: "var(--color-accent)",
        color: "var(--color-on-accent)",
        fontSize: 14.5,
        fontWeight: 600,
        cursor: "pointer",
        transition: "all 0.15s ease",
        boxShadow: "0 2px 8px color-mix(in srgb, var(--color-accent) 25%, transparent)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "var(--color-accent-strong)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "var(--color-accent)";
      }}
    >
      <span>Go to my workspace</span>
      <ArrowRight size={16} />
    </button>
  );
}
