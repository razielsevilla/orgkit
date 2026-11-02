"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/src/lib/supabase/client";
import { AuthLayout } from "@/src/components/auth-layout";
import { GoogleLogo } from "@/src/components/google-logo";
import { AuthErrorAlert } from "@/src/components/auth-error-alert";

export default function SignInPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  useEffect(() => {
    router.prefetch("/register");
  }, [router]);

  async function handleGoogleSignIn() {
    setLoading(true);
    setManualError(null);
    try {
      const supabase = createClient();
      // Sign out any existing session so a different Google account
      // isn't linked to the previous officer's record.
      await supabase.auth.signOut();
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback`,
          scopes: "openid email profile",
        },
      });

      if (error) {
        console.error("Sign-in error:", error);
        setLoading(false);
        setManualError(error.message);
      }
    } catch (err: unknown) {
      console.error("Sign-in unexpected error:", err);
      setLoading(false);
      const msg = err instanceof Error ? err.message : "error";
      setManualError(msg);
    }
  }

  return (
    <AuthLayout>
      <div
        className="orgkit-card"
        role="region"
        aria-label="Welcome back"
        style={{
          width: "clamp(380px, 33.85vw, 566px)",
          maxWidth: 566,
          backgroundColor: "#FFFFFF",
          borderRadius: "clamp(20px, 1.67vw, 28px)",
          padding: "clamp(24px, 4.25vh, 40px) clamp(24px, 2.69vw, 45px)",
          boxShadow: "0 20px 50px rgba(24, 24, 27, 0.08)",
          border: "1px solid rgba(228, 228, 231, 0.6)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          boxSizing: "border-box",
        }}
      >
        {/* 1. OrgKit Logo at the center top */}
        <Image
          src="/orgkit-logo.png"
          alt="OrgKit Logo"
          width={92}
          height={58}
          priority
          draggable={false}
          className="object-contain select-none"
          style={{
            width: "clamp(64px, 5.5vw, 92px)",
            height: "auto",
            display: "block",
          }}
        />

        {/* 2. H2 "Welcome back" */}
        <h2
          style={{
            marginTop: "clamp(12px, 2.34vh, 22px)",
            fontSize: "clamp(26px, 2.39vw, 40px)",
            fontWeight: 700,
            color: "#18181B",
            lineHeight: 1.15,
            letterSpacing: "-0.015em",
            marginBottom: 0,
            whiteSpace: "nowrap",
          }}
        >
          Welcome back
        </h2>

        {/* 3. Subtitle */}
        <p
          style={{
            marginTop: "clamp(10px, 1.7vh, 16px)",
            fontSize: "clamp(14px, 1.26vw, 21px)",
            lineHeight: 1.38,
            color: "#71717A",
            maxWidth: 440,
            marginBottom: 0,
            fontWeight: 400,
          }}
        >
          <span style={{ whiteSpace: "nowrap" }}>
            Sign in with Google to access your organizations,
          </span>
          <br />
          <span>events, and campus community.</span>
        </p>

        {/* 4. Google Sign-in Button: "Sign in with Google" (red border on error, no text) */}
        <AuthErrorAlert manualError={manualError}>
          {(hasError) => (
            <div
              style={{
                width: "100%",
                marginTop: "clamp(20px, 4.25vh, 40px)",
              }}
            >
              <button
                type="button"
                disabled={loading}
                onClick={handleGoogleSignIn}
                className="orgkit-google-btn"
                data-error={hasError}
                aria-busy={loading}
                title={loading ? "Connecting to Google..." : "Sign in with Google"}
                style={{
                  height: "clamp(52px, 7.65vh, 72px)",
                  gap: "clamp(10px, 0.84vw, 14px)",
                }}
              >
                {loading ? (
                  <svg
                    className="orgkit-spinner"
                    width={26}
                    height={26}
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="#E4E4E7"
                      strokeWidth="3"
                    />
                    <path
                      fill="#059669"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                ) : (
                  <GoogleLogo size={36} />
                )}
                <span
                  style={{
                    fontSize: "clamp(17px, 1.44vw, 24px)",
                    fontWeight: 500,
                    color: "#18181B",
                  }}
                >
                  {loading ? "Signing in..." : "Sign in with Google"}
                </span>
              </button>
              <div className="sr-only" aria-live="polite">
                {loading ? "Connecting to Google, please wait..." : ""}
              </div>
            </div>
          )}
        </AuthErrorAlert>

        {/* 5. Terms & Sign Up Link */}
        <div
          style={{
            marginTop: "clamp(24px, 3.8vh, 36px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "clamp(12px, 1.8vh, 18px)",
          }}
        >
          <p
            style={{
              fontSize: "clamp(13px, 0.95vw, 15px)",
              lineHeight: 1.5,
              color: "#52525B",
              margin: 0,
              fontWeight: 400,
              whiteSpace: "nowrap",
            }}
          >
            By continuing, you agree to our{" "}
            <Link
              href="/terms"
              className="orgkit-terms-link"
              title="View OrgKit Terms of Service"
            >
              Terms
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              className="orgkit-terms-link"
              title="View OrgKit Privacy Policy"
            >
              Privacy Policy
            </Link>
            .
          </p>

          <p
            style={{
              fontSize: "clamp(13px, 0.95vw, 15px)",
              lineHeight: 1.5,
              color: "#52525B",
              margin: 0,
              fontWeight: 400,
            }}
          >
            New to OrgKit?{" "}
            <Link
              href="/register"
              prefetch={true}
              className="orgkit-signin-link"
              title="Create a new OrgKit account"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
