"use client";

import { useActionState, useState } from "react";
import {
  CURRENT_MEMBER_CONSENT,
  JOIN_COPY,
  fillConsentText,
  type ConsentLanguage,
} from "@/src/lib/member-consent";
import { JOIN_MESSAGES } from "@/src/lib/member-join";
import { submitJoin, type JoinState } from "./actions";

const INITIAL: JoinState = { status: "idle" };

const labelStyle: React.CSSProperties = { fontSize: 14, fontWeight: 600, color: "#18181B" };
const errorStyle: React.CSSProperties = { margin: 0, fontSize: 14, color: "#DC2626" };
const fieldStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6 };
const checkRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 12,
  fontSize: 14,
  color: "#18181B",
  cursor: "pointer",
};
const checkStyle: React.CSSProperties = {
  width: 20,
  height: 20,
  marginTop: 1,
  flexShrink: 0,
  accentColor: "#059669",
};

function inputStyle(invalid: boolean): React.CSSProperties {
  return {
    width: "100%",
    height: 48,
    padding: "0 14px",
    borderRadius: 12,
    border: `1px solid ${invalid ? "#DC2626" : "#E4E4E7"}`,
    backgroundColor: "#FFFFFF",
    // 16px stops iOS from zooming in on focus
    fontSize: 16,
    fontFamily: "inherit",
    color: "#18181B",
    boxSizing: "border-box",
  };
}

export function JoinForm({
  token,
  orgName,
  contactEmail,
}: {
  token: string;
  orgName: string;
  contactEmail: string;
}) {
  const [state, formAction, pending] = useActionState(submitJoin.bind(null, token), INITIAL);
  const [language, setLanguage] = useState<ConsentLanguage>("en");
  // Controlled, so typed values survive a failed submit
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [agree, setAgree] = useState(false);
  const [adult, setAdult] = useState(false);

  const copy = JOIN_COPY[language];

  if (state.status === "inactive") {
    return (
      <p style={{ margin: 0, textAlign: "center", fontSize: 15, lineHeight: 1.5 }}>
        {JOIN_MESSAGES.inactiveLink}
      </p>
    );
  }

  if (state.status === "success") {
    return (
      <p
        role="status"
        style={{
          margin: 0,
          textAlign: "center",
          fontSize: 18,
          fontWeight: 600,
          lineHeight: 1.45,
          color: "#18181B",
        }}
      >
        {copy.thanks(orgName)}
      </p>
    );
  }

  const consentText = fillConsentText(CURRENT_MEMBER_CONSENT.text[language], {
    orgName,
    contactEmail,
  });

  return (
    <form
      action={formAction}
      noValidate
      style={{ display: "flex", flexDirection: "column", gap: 20 }}
    >
      <style>{`
        .jf-input:focus-visible, .jf-btn:focus-visible, .jf-lang:focus-visible {
          outline: none;
          box-shadow: 0 0 0 2px #FFFFFF, 0 0 0 4px #059669;
        }
        .jf-link { color: #059669; font-weight: 600; font-size: 14px; text-decoration: none; }
        .jf-link:hover { color: #047857; text-decoration: underline; }
        .jf-submit:hover:not(:disabled) { background-color: #047857; }
      `}</style>

      <div
        style={{ display: "flex", justifyContent: "flex-end", gap: 4 }}
        role="group"
        aria-label="Language"
      >
        {(["en", "fil"] as const).map((code) => (
          <button
            key={code}
            type="button"
            className="jf-lang"
            onClick={() => setLanguage(code)}
            aria-pressed={language === code}
            style={{
              height: 36,
              padding: "0 14px",
              borderRadius: 9999,
              border: "none",
              fontSize: 14,
              fontWeight: 600,
              fontFamily: "inherit",
              cursor: "pointer",
              backgroundColor: language === code ? "#059669" : "transparent",
              color: language === code ? "#FFFFFF" : "#71717A",
            }}
          >
            {code === "en" ? "English" : "Filipino"}
          </button>
        ))}
      </div>

      <h1
        style={{
          margin: 0,
          fontSize: 26,
          fontWeight: 700,
          letterSpacing: "-0.015em",
          lineHeight: 1.2,
          color: "#18181B",
        }}
      >
        {copy.heading(orgName)}
      </h1>

      <div style={fieldStyle}>
        <label htmlFor="fullName" style={labelStyle}>
          {copy.fullName}
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          autoComplete="name"
          className="jf-input"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          aria-invalid={state.nameError ? true : undefined}
          aria-describedby={state.nameError ? "fullName-error" : undefined}
          style={inputStyle(!!state.nameError)}
        />
        {state.nameError && (
          <p id="fullName-error" style={errorStyle}>
            {state.nameError}
          </p>
        )}
      </div>

      <div style={fieldStyle}>
        <label htmlFor="email" style={labelStyle}>
          {copy.email}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          className="jf-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={state.emailError ? true : undefined}
          aria-describedby={state.emailError ? "email-error" : undefined}
          style={inputStyle(!!state.emailError)}
        />
        {state.emailError && (
          <p id="email-error" style={errorStyle}>
            {state.emailError}
          </p>
        )}
      </div>

      <div
        lang={language === "fil" ? "fil" : "en"}
        style={{
          padding: 16,
          borderRadius: 16,
          border: "1px solid #E4E4E7",
          backgroundColor: "#F4F4F5",
          fontSize: 14,
          lineHeight: 1.6,
          color: "#3F3F46",
        }}
      >
        {consentText}
      </div>

      <label style={checkRowStyle}>
        <input
          type="checkbox"
          name="agree"
          checked={agree}
          onChange={(e) => setAgree(e.target.checked)}
          style={checkStyle}
        />
        <span>{copy.agree}</span>
      </label>

      <label style={checkRowStyle}>
        <input
          type="checkbox"
          name="adult"
          checked={adult}
          onChange={(e) => setAdult(e.target.checked)}
          style={checkStyle}
        />
        <span>{copy.adult}</span>
      </label>

      <a href="/privacy" target="_blank" rel="noopener" className="jf-link">
        {copy.privacyLink}
      </a>

      <input type="hidden" name="language" value={language} />
      <input type="hidden" name="consentVersion" value={CURRENT_MEMBER_CONSENT.version} />

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {state.formError && (
          <p role="alert" style={errorStyle}>
            {state.formError}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="jf-btn jf-submit"
          style={{
            height: 50,
            borderRadius: 9999,
            border: "none",
            backgroundColor: "#059669",
            color: "#FFFFFF",
            fontSize: 16,
            fontWeight: 600,
            fontFamily: "inherit",
            cursor: pending ? "default" : "pointer",
            opacity: pending ? 0.6 : 1,
          }}
        >
          {pending ? copy.joining : copy.join}
        </button>
      </div>
    </form>
  );
}
