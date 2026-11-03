"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import { Check, Link2Off, AlertCircle } from "lucide-react";
import {
  Card,
  CardHeader,
  CardBadge,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/src/components/card";
import {
  CURRENT_MEMBER_CONSENT,
  JOIN_COPY,
  fillConsentText,
  type ConsentLanguage,
} from "@/src/lib/member-consent";
import { JOIN_MESSAGES } from "@/src/lib/member-join";
import { submitJoin, type JoinState } from "./actions";

const INITIAL: JoinState = { status: "idle" };

const labelStyle: React.CSSProperties = {
  fontSize: 13.5,
  fontWeight: 600,
  color: "#18181B",
  marginBottom: 2,
};
const errorStyle: React.CSSProperties = {
  margin: "4px 0 0 0",
  fontSize: 13,
  color: "#DC2626",
  fontWeight: 500,
};
const fieldStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
};
const checkRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 10,
  fontSize: 13.5,
  color: "#18181B",
  cursor: "pointer",
};
const checkStyle: React.CSSProperties = {
  width: 18,
  height: 18,
  marginTop: 2,
  flexShrink: 0,
  accentColor: "#059669",
};

function inputStyle(invalid: boolean): React.CSSProperties {
  return {
    width: "100%",
    height: 46,
    padding: "0 14px",
    borderRadius: 12,
    border: `1px solid ${invalid ? "#DC2626" : "#E4E4E7"}`,
    backgroundColor: "#FFFFFF",
    fontSize: 15,
    fontFamily: "inherit",
    color: "#18181B",
    boxSizing: "border-box",
    transition: "border-color 0.15s ease, box-shadow 0.15s ease",
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
      <Card maxWidth={460} padding="clamp(32px, 4vw, 44px) clamp(24px, 3vw, 36px)">
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
            <Image
              src="/orgkit-text-logo.png"
              alt="OrgKit"
              width={112}
              height={34}
              priority
              style={{
                height: 28,
                width: "auto",
                display: "block",
                userSelect: "none",
              }}
            />
          </div>
          <CardBadge size={68} style={{ backgroundColor: "rgba(220, 38, 38, 0.08)", marginBottom: 18 }}>
            <Link2Off size={30} color="#DC2626" strokeWidth={2.2} />
          </CardBadge>
          <CardTitle style={{ fontSize: 24, marginBottom: 10 }}>
            Link isn't active
          </CardTitle>
          <CardDescription style={{ fontSize: 15, lineHeight: 1.55, color: "#52525B", maxWidth: 360 }}>
            {JOIN_MESSAGES.inactiveLink}
          </CardDescription>
        </div>
      </Card>
    );
  }

  if (state.status === "success") {
    return (
      <Card maxWidth={460} padding="clamp(32px, 4vw, 44px) clamp(24px, 3.5vw, 36px)">
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <Image
            src="/orgkit-text-logo.png"
            alt="OrgKit"
            width={112}
            height={34}
            priority
            style={{
              height: 28,
              width: "auto",
              display: "block",
              userSelect: "none",
            }}
          />
        </div>

        <CardHeader style={{ marginBottom: 0 }}>
          <CardBadge size={72} style={{ marginBottom: 20 }}>
            <Check size={36} color="#059669" strokeWidth={2.8} />
          </CardBadge>
          <CardTitle style={{ fontSize: "clamp(24px, 2.4vw, 28px)", marginBottom: 12 }}>
            {language === "fil" ? "Nasa listahan ka na!" : "You're on the list!"}
          </CardTitle>
          <CardDescription
            role="status"
            style={{
              fontSize: 15.5,
              lineHeight: 1.6,
              color: "#52525B",
              maxWidth: 380,
              marginBottom: 20,
            }}
          >
            {copy.thanks(orgName)}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Org Pill Badge */}
          <div
            style={{
              width: "100%",
              boxSizing: "border-box",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              padding: "12px 18px",
              borderRadius: 16,
              backgroundColor: "#F4F4F5",
              border: "1px solid #E4E4E7",
              marginBottom: 22,
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 28,
                height: 28,
                borderRadius: "50%",
                backgroundColor: "#059669",
                color: "#FFFFFF",
                fontSize: 12,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {orgName.slice(0, 2).toUpperCase()}
            </span>
            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#18181B",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {orgName}
            </span>
          </div>

          <p
            style={{
              margin: 0,
              fontSize: 13,
              lineHeight: 1.5,
              color: "#71717A",
              textAlign: "center",
            }}
          >
            {language === "fil"
              ? "Maaari mo nang isara ang page na ito. Makikipag-ugnayan ang iyong mga opisyal sa lalong madaling panahon."
              : "You can safely close this page. Your org officers will review your details."}
          </p>
        </CardContent>
      </Card>
    );
  }

  const consentText = fillConsentText(CURRENT_MEMBER_CONSENT.text[language], {
    orgName,
    contactEmail,
  });

  return (
    <Card
      maxWidth={460}
      padding="clamp(26px, 3.8vw, 36px) clamp(22px, 3vw, 32px)"
    >
      <form
        action={formAction}
        noValidate
        style={{ display: "flex", flexDirection: "column", gap: 18 }}
      >
        <style>{`
          .jf-input:focus {
            outline: none;
            border-color: #059669 !important;
            box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.12) !important;
          }
          .jf-btn:focus-visible, .jf-lang:focus-visible {
            outline: none;
            box-shadow: 0 0 0 2px #FFFFFF, 0 0 0 4px #059669;
          }
          .jf-link:hover {
            color: #047857 !important;
            text-decoration: underline !important;
          }
          .jf-submit:hover:not(:disabled) {
            background-color: #047857 !important;
            box-shadow: 0 4px 14px rgba(5, 150, 105, 0.3) !important;
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>

        {/* Top Header: Brand Text Logo + Language Pill Switcher */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 2,
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <Image
              src="/orgkit-text-logo.png"
              alt="OrgKit"
              width={112}
              height={34}
              priority
              style={{
                height: 28,
                width: "auto",
                display: "block",
                userSelect: "none",
              }}
            />
          </div>

          {/* Language Switcher Pill */}
          <div
            style={{
              display: "flex",
              backgroundColor: "#F4F4F5",
              padding: 3,
              borderRadius: 9999,
              border: "1px solid #E4E4E7",
            }}
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
                  height: 28,
                  padding: "0 12px",
                  borderRadius: 9999,
                  border: "none",
                  fontSize: 12.5,
                  fontWeight: 600,
                  fontFamily: "inherit",
                  cursor: "pointer",
                  backgroundColor: language === code ? "#059669" : "transparent",
                  color: language === code ? "#FFFFFF" : "#71717A",
                  boxShadow: language === code ? "0 1px 3px rgba(5, 150, 105, 0.25)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                {code === "en" ? "English" : "Filipino"}
              </button>
            ))}
          </div>
        </div>

        {/* Heading & Subtitle using CardHeader, CardTitle, CardDescription */}
        <CardHeader style={{ textAlign: "left", alignItems: "flex-start", marginBottom: 0 }}>
          <CardTitle
            style={{
              fontSize: "clamp(22px, 2.2vw, 26px)",
              textAlign: "left",
              marginBottom: 6,
            }}
          >
            {copy.heading(orgName)}
          </CardTitle>
          <CardDescription
            style={{
              fontSize: 13.5,
              lineHeight: 1.45,
              textAlign: "left",
              color: "#71717A",
              maxWidth: "100%",
            }}
          >
            {language === "fil"
              ? "Punan ang iyong impormasyon upang magsumite ng pagsali."
              : "Fill in your details to submit your membership request."}
          </CardDescription>
        </CardHeader>

        <CardContent style={{ display: "flex", flexDirection: "column", gap: 18, padding: 0 }}>
          {/* Field 1: Full name */}
          <div style={fieldStyle}>
            <label htmlFor="fullName" style={labelStyle}>
              {copy.fullName}
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              autoComplete="name"
              placeholder={language === "fil" ? "Hal. Juan Dela Cruz" : "e.g. Juan Dela Cruz"}
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

          {/* Field 2: Email */}
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
              placeholder={language === "fil" ? "Hal. juan@pamantasan.edu.ph" : "e.g. juan@university.edu"}
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

          {/* Consent Box */}
          <div
            lang={language === "fil" ? "fil" : "en"}
            style={{
              padding: "14px 16px",
              borderRadius: 16,
              border: "1px solid #E4E4E7",
              backgroundColor: "#F4F4F5",
              fontSize: 13,
              lineHeight: 1.6,
              color: "#3F3F46",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 11.5,
                fontWeight: 700,
                letterSpacing: "0.03em",
                textTransform: "uppercase",
                color: "#71717A",
                marginBottom: 8,
              }}
            >
              <span>{language === "fil" ? "Kasunduan sa Pagpapahintulot" : "Consent Agreement"}</span>
            </div>
            <div>{consentText}</div>
          </div>

          {/* Checkboxes */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <label style={checkRowStyle}>
              <input
                type="checkbox"
                name="agree"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                style={checkStyle}
              />
              <span style={{ fontSize: 13.5, lineHeight: 1.45 }}>{copy.agree}</span>
            </label>

            <label style={checkRowStyle}>
              <input
                type="checkbox"
                name="adult"
                checked={adult}
                onChange={(e) => setAdult(e.target.checked)}
                style={checkStyle}
              />
              <span style={{ fontSize: 13.5, lineHeight: 1.45 }}>{copy.adult}</span>
            </label>
          </div>

          {/* Privacy Notice Link */}
          <div>
            <a
              href="/privacy"
              target="_blank"
              rel="noopener"
              className="jf-link"
              style={{
                fontSize: 13,
                color: "#059669",
                fontWeight: 600,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span>{copy.privacyLink}</span>
              <span aria-hidden>→</span>
            </a>
          </div>

          <input type="hidden" name="language" value={language} />
          <input type="hidden" name="consentVersion" value={CURRENT_MEMBER_CONSENT.version} />

          {/* Form Error and Submit Button */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
            {state.formError && (
              <div
                role="alert"
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  padding: "10px 14px",
                  borderRadius: 12,
                  backgroundColor: "rgba(220, 38, 38, 0.08)",
                  border: "1px solid rgba(220, 38, 38, 0.2)",
                  color: "#DC2626",
                  fontSize: 13.5,
                  lineHeight: 1.4,
                }}
              >
                <AlertCircle size={17} color="#DC2626" style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{state.formError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={pending}
              className="jf-btn jf-submit"
              style={{
                height: 48,
                borderRadius: 9999,
                border: "none",
                backgroundColor: "#059669",
                color: "#FFFFFF",
                fontSize: 15,
                fontWeight: 600,
                fontFamily: "inherit",
                cursor: pending ? "default" : "pointer",
                opacity: pending ? 0.7 : 1,
                boxShadow: "0 2px 8px rgba(5, 150, 105, 0.22)",
                transition: "all 0.15s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              {pending ? (
                <>
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      border: "2.5px solid rgba(255, 255, 255, 0.35)",
                      borderTopColor: "#FFFFFF",
                      animation: "spin 0.8s linear infinite",
                    }}
                  />
                  <span>{copy.joining}</span>
                </>
              ) : (
                <span>{copy.join}</span>
              )}
            </button>
          </div>
        </CardContent>
      </form>
    </Card>
  );
}
