"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/src/lib/supabase/client";
import { GoogleLogo } from "@/src/components/google-logo";
import { LogOut, ArrowRight } from "lucide-react";
import { clearInviteCookie } from "@/src/app/invite/actions";

/**
 * Remembers the invite across the Google round trip. Pages cannot set cookies
 * while they render, so this asks the start route to do it.
 */
async function rememberInvite(token: string) {
  const res = await fetch(`/invite/${encodeURIComponent(token)}/start`, {
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogleSignIn() {
    setLoading(true);
    setError(null);
    try {
      await rememberInvite(token);
      const supabase = createClient();
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback`,
          scopes: "openid email profile",
          queryParams: {
            // Prompt account selection so user picks the right Google account
            prompt: "select_account",
          },
        },
      });

      if (signInError) {
        setLoading(false);
        setError(signInError.message);
      }
    } catch (err: unknown) {
      setLoading(false);
      setError(err instanceof Error ? err.message : "Failed to sign in");
    }
  }

  return (
    <div style={{ width: "100%", textAlign: "center" }}>
      {error && (
        <div
          role="alert"
          style={{
            marginBottom: 16,
            padding: "10px 14px",
            borderRadius: 12,
            backgroundColor: "#FEF2F2",
            border: "1px solid #FCA5A5",
            color: "#DC2626",
            fontSize: 13,
            lineHeight: 1.4,
          }}
        >
          {error}
        </div>
      )}

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
          border: "1px solid #E4E4E7",
          backgroundColor: "#FFFFFF",
          color: "#18181B",
          fontSize: 15,
          fontWeight: 600,
          cursor: loading ? "not-allowed" : "pointer",
          boxShadow: "0 2px 6px rgba(0, 0, 0, 0.04)",
          transition: "all 0.15s ease",
          opacity: loading ? 0.7 : 1,
        }}
        onMouseEnter={(e) => {
          if (!loading) e.currentTarget.style.backgroundColor = "#F4F4F5";
        }}
        onMouseLeave={(e) => {
          if (!loading) e.currentTarget.style.backgroundColor = "#FFFFFF";
        }}
      >
        <GoogleLogo size={20} />
        <span>{loading ? "Redirecting to Google…" : "Continue with Google"}</span>
      </button>
    </div>
  );
}

interface SwitchAccountButtonProps {
  token: string;
}

export function SwitchAccountButton({ token }: SwitchAccountButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleSwitchAccount() {
    setLoading(true);
    try {
      await rememberInvite(token);
      const supabase = createClient();
      await supabase.auth.signOut();
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback`,
          scopes: "openid email profile",
          queryParams: {
            prompt: "select_account",
          },
        },
      });
    } catch {
      setLoading(false);
      window.location.href = `/invite/${token}`;
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
        border: "1px solid #DC2626",
        backgroundColor: "#FFFFFF",
        color: "#DC2626",
        fontSize: 14,
        fontWeight: 600,
        cursor: loading ? "not-allowed" : "pointer",
        transition: "all 0.15s ease",
        opacity: loading ? 0.7 : 1,
      }}
      onMouseEnter={(e) => {
        if (!loading) {
          e.currentTarget.style.backgroundColor = "#FEF2F2";
        }
      }}
      onMouseLeave={(e) => {
        if (!loading) {
          e.currentTarget.style.backgroundColor = "#FFFFFF";
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
      onClick={() => router.push(orgId ? `/workspace/${orgId}` : "/")}
      style={{
        width: "100%",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: "13px 20px",
        borderRadius: 9999,
        border: "none",
        backgroundColor: "#059669",
        color: "#FFFFFF",
        fontSize: 14.5,
        fontWeight: 600,
        cursor: "pointer",
        transition: "all 0.15s ease",
        boxShadow: "0 2px 8px rgba(5, 150, 105, 0.25)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "#047857";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "#059669";
      }}
    >
      <span>Go to my workspace</span>
      <ArrowRight size={16} />
    </button>
  );
}

