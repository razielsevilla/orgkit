"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGoogleSignIn } from "@/src/lib/use-google-sign-in";
import { AuthLayout } from "@/src/components/auth/auth-layout";
import { GoogleAuthButton } from "@/src/components/auth/google-auth-button";
import { AuthErrorAlert } from "@/src/components/auth/auth-error-alert";

export default function SignInPage() {
  const router = useRouter();
  // Sign out any existing session first so a different Google account
  // isn't linked to the previous officer's record.
  const { loading, error: manualError, start } = useGoogleSignIn({ signOutFirst: true });

  useEffect(() => {
    router.prefetch("/register");
  }, [router]);

  return (
    <AuthLayout>
      <div
        className="orgkit-card"
        role="region"
        aria-label="Welcome back"
        style={{
          width: "clamp(380px, 33.85vw, 566px)",
          maxWidth: 566,
          backgroundColor: "var(--color-surface)",
          borderRadius: "clamp(20px, 1.67vw, 28px)",
          padding: "clamp(24px, 4.25vh, 40px) clamp(24px, 2.69vw, 45px)",
          boxShadow: "0 20px 50px color-mix(in srgb, var(--color-ink) 8%, transparent)",
          border: "1px solid color-mix(in srgb, var(--color-line) 60%, transparent)",
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
            color: "var(--color-ink)",
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
            color: "var(--color-muted)",
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
            <GoogleAuthButton
              verb="Sign in"
              loading={loading}
              hasError={hasError}
              onClick={start}
            />
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
              color: "var(--color-muted-strong)",
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
              color: "var(--color-muted-strong)",
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
