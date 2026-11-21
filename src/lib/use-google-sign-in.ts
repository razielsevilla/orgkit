"use client";

import { useState } from "react";
import { createClient } from "@/src/lib/supabase/client";

interface GoogleSignInOptions {
  /** Ask Google to show its account chooser instead of reusing the last account */
  selectAccount?: boolean;
}

/**
 * Starts the Google OAuth redirect. Returns Supabase's error message, or null
 * when the browser is being sent to Google (the page then unloads).
 */
export async function signInWithGoogle({
  selectAccount = false,
}: GoogleSignInOptions = {}): Promise<string | null> {
  const supabase = createClient();
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
      scopes: "openid email profile",
      ...(selectAccount ? { queryParams: { prompt: "select_account" } } : {}),
    },
  });
  return error ? error.message : null;
}

interface UseGoogleSignInOptions extends GoogleSignInOptions {
  /** Sign out any existing session first, so a different Google account isn't linked to the previous officer's record */
  signOutFirst?: boolean;
  /** Runs before the redirect, for example to remember an invite. Throwing stops the sign-in and shows the message. */
  prepare?: () => Promise<void>;
  /** Shown when something other than an Error is thrown */
  fallbackError?: string;
}

/** Loading and error state for a "Continue with Google" button. */
export function useGoogleSignIn({
  signOutFirst = false,
  prepare,
  fallbackError = "error",
  selectAccount,
}: UseGoogleSignInOptions = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setLoading(true);
    setError(null);
    try {
      await prepare?.();
      if (signOutFirst) {
        await createClient().auth.signOut();
      }
      const message = await signInWithGoogle({ selectAccount });
      if (message) {
        console.error("Google sign-in error:", message);
        setLoading(false);
        setError(message);
      }
    } catch (err: unknown) {
      console.error("Google sign-in unexpected error:", err);
      setLoading(false);
      setError(err instanceof Error ? err.message : fallbackError);
    }
  }

  return { loading, error, start };
}
