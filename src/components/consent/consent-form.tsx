"use client";

import Link from "next/link";
import { useState } from "react";
import { acceptConsent, declineConsent } from "@/src/app/consent/actions";
import { ROUTES } from "@/src/lib/routes";

export function ConsentForm() {
  const [agreed, setAgreed] = useState(false);

  return (
    <form action={acceptConsent} style={{ width: "100%", textAlign: "left" }}>
      <label
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          marginTop: 24,
          fontSize: 15,
          lineHeight: 1.5,
          color: "var(--color-ink-soft)",
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          name="agree"
          id="consent-agree"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          style={{ width: 20, height: 20, marginTop: 2, accentColor: "var(--color-accent)", flexShrink: 0 }}
        />
        <span style={{ userSelect: "none" }}>
          By continuing, I agree to the{" "}
          <Link
            href={ROUTES.terms}
            target="_blank"
            className="orgkit-terms-link"
            title="View OrgKit Terms of Service"
            style={{ fontWeight: 700 }}
          >
            Terms
          </Link>{" "}
          and{" "}
          <Link
            href={ROUTES.privacy}
            target="_blank"
            className="orgkit-terms-link"
            title="View OrgKit Privacy Policy"
            style={{ fontWeight: 700 }}
          >
            Privacy Policy
          </Link>
          .
        </span>
      </label>

      <button
        type="submit"
        disabled={!agreed}
        className="orgkit-google-btn"
        style={{
          height: 52,
          marginTop: 24,
          justifyContent: "center",
          fontSize: 16,
          fontWeight: 600,
          color: "var(--color-ink)",
        }}
      >
        Continue
      </button>

      <button
        type="submit"
        formAction={declineConsent}
        formNoValidate
        style={{
          width: "100%",
          marginTop: 12,
          padding: 8,
          background: "none",
          border: "none",
          fontSize: 14,
          color: "var(--color-muted)",
          cursor: "pointer",
        }}
      >
        Cancel and sign out
      </button>
    </form>
  );
}
