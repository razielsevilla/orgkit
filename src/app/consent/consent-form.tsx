"use client";

import Link from "next/link";
import { useState } from "react";
import { acceptConsent, declineConsent } from "./actions";
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
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          style={{ width: 20, height: 20, marginTop: 2, accentColor: "var(--color-accent)", flexShrink: 0 }}
        />
        <span>
          I agree to the{" "}
          <Link href={ROUTES.privacy} target="_blank" className="orgkit-terms-link">
            Privacy Notice
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
