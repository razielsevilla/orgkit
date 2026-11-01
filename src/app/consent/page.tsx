"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/src/lib/supabase/client";
import { AuthLayout } from "@/src/components/auth-layout";

export default function ConsentPage() {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialChecking, setInitialChecking] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [googleSub, setGoogleSub] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [userFullName, setUserFullName] = useState<string>("");
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/register");
        return;
      }

      const name =
        user.user_metadata?.full_name || user.user_metadata?.name || "Officer";
      setUserName(name);
      setUserFullName(name);
      setUserEmail(user.email || "");
      setUserId(user.id);

      const googleIdentity = user.identities?.find(
        (i: { provider: string }) => i.provider === "google"
      );
      const sub =
        user.user_metadata?.sub ||
        (googleIdentity?.identity_data as Record<string, unknown> | undefined)
          ?.sub ||
        user.user_metadata?.provider_id;

      if (sub) {
        setGoogleSub(sub as string);
        // If they already consented, skip straight to the app
        const { data: officer } = await supabase
          .from("officers")
          .select("consent_version")
          .eq("google_sub", sub as string)
          .maybeSingle();

        if (officer?.consent_version) {
          router.push("/setup");
          return;
        }
      }

      setInitialChecking(false);
    }

    checkAuth();
  }, [router]);

  async function handleAgree() {
    if (!agreed || loading) return;
    setLoading(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();
      const now = new Date().toISOString();

      const { error: upsertError } = await supabase.from("officers").upsert(
        {
          id: userId,
          google_sub: googleSub,
          email: userEmail,
          full_name: userFullName,
          consent_version: "v1",
          consent_at: now,
          created_at: now,
          last_sign_in_at: now,
        },
        { onConflict: "google_sub" }
      );

      if (upsertError) throw upsertError;

      router.push("/setup");
    } catch (err: unknown) {
      console.error("Consent error:", err);
      setErrorMessage("Unable to save your agreement. Please try again.");
      setLoading(false);
    }
  }

  async function handleCancel() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/signin?error=cancelled");
  }

  // Loading spinner while checking session
  if (initialChecking) {
    return (
      <AuthLayout>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
          }}
        >
          <svg
            style={{ color: "#059669" }}
            className="animate-spin"
            width={32}
            height={32}
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle cx="12" cy="12" r="10" stroke="#E4E4E7" strokeWidth="3" />
            <path
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: "#71717A",
            }}
          >
            Verifying account...
          </span>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div
        className="orgkit-card"
        role="region"
        aria-label="Privacy consent"
        style={{
          width: "clamp(340px, 33.85vw, 540px)",
          maxWidth: 540,
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
        {/* Logo */}
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

        {/* Title */}
        <h2
          style={{
            marginTop: "clamp(12px, 2.34vh, 22px)",
            fontSize: "clamp(24px, 2.2vw, 36px)",
            fontWeight: 700,
            color: "#18181B",
            lineHeight: 1.15,
            letterSpacing: "-0.015em",
            marginBottom: 0,
          }}
        >
          Welcome to OrgKit
        </h2>

        {/* Signed-in-as */}
        <p
          style={{
            marginTop: "clamp(8px, 1.4vh, 12px)",
            fontSize: "clamp(13px, 1.1vw, 17px)",
            color: "#71717A",
            marginBottom: 0,
            fontWeight: 400,
          }}
        >
          Signed in as{" "}
          <span style={{ fontWeight: 600, color: "#18181B" }}>{userName}</span>
        </p>

        {/* Privacy notice box */}
        <div
          style={{
            marginTop: "clamp(16px, 2.8vh, 28px)",
            width: "100%",
            backgroundColor: "#FAFAFA",
            border: "1px solid #E4E4E7",
            borderRadius: 16,
            padding: "clamp(14px, 2vh, 20px) clamp(16px, 1.5vw, 24px)",
            textAlign: "left",
            fontSize: "clamp(13px, 1vw, 15px)",
            lineHeight: 1.6,
            color: "#3F3F46",
            boxSizing: "border-box",
          }}
        >
          We use your <strong style={{ color: "#18181B" }}>name</strong> and{" "}
          <strong style={{ color: "#18181B" }}>email</strong> from Google to run{" "}
          <strong style={{ color: "#18181B" }}>OrgKit</strong>. Only the
          officers of your org can see them.
        </div>

        {/* Error */}
        {errorMessage && (
          <div
            role="alert"
            style={{
              width: "100%",
              marginTop: "clamp(12px, 2vh, 20px)",
              padding: "10px 16px",
              borderRadius: 14,
              backgroundColor: "#FEF2F2",
              border: "1px solid #FCA5A5",
              color: "#991B1B",
              fontSize: "clamp(12.5px, 0.92vw, 14.5px)",
              textAlign: "center",
              fontWeight: 500,
              boxSizing: "border-box",
            }}
          >
            {errorMessage}
          </div>
        )}

        {/* Checkbox */}
        <label
          style={{
            marginTop: "clamp(16px, 2.8vh, 28px)",
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            cursor: "pointer",
            width: "100%",
            textAlign: "left",
            userSelect: "none",
          }}
        >
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            style={{
              marginTop: 2,
              width: 20,
              height: 20,
              flexShrink: 0,
              accentColor: "#059669",
              cursor: "pointer",
            }}
          />
          <span
            style={{
              fontSize: "clamp(13px, 1vw, 15px)",
              lineHeight: 1.5,
              color: "#3F3F46",
            }}
          >
            I agree to the{" "}
            <Link
              href="/privacy"
              target="_blank"
              style={{
                color: "#059669",
                fontWeight: 600,
                textDecoration: "none",
              }}
              className="hover:underline"
            >
              Privacy Notice
            </Link>
            .
          </span>
        </label>

        {/* Buttons */}
        <div
          style={{
            marginTop: "clamp(20px, 3.8vh, 36px)",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <button
            type="button"
            disabled={!agreed || loading}
            onClick={handleAgree}
            style={{
              width: "100%",
              height: "clamp(48px, 6.5vh, 60px)",
              borderRadius: 9999,
              backgroundColor: agreed && !loading ? "#059669" : "#D1D5DB",
              color: "#FFFFFF",
              fontSize: "clamp(15px, 1.2vw, 18px)",
              fontWeight: 600,
              border: "none",
              cursor: agreed && !loading ? "pointer" : "not-allowed",
              transition: "background-color 0.15s",
            }}
          >
            {loading ? "Setting up your account..." : "Continue to OrgKit"}
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={handleCancel}
            style={{
              background: "none",
              border: "none",
              fontSize: "clamp(13px, 0.95vw, 15px)",
              fontWeight: 500,
              color: "#71717A",
              cursor: loading ? "not-allowed" : "pointer",
              padding: "8px 0",
              transition: "color 0.15s",
            }}
            className="hover:text-[#18181B]"
          >
            Cancel and return
          </button>
        </div>
      </div>
    </AuthLayout>
  );
}

