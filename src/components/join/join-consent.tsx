"use client";

import type { ConsentLanguage } from "@/src/lib/members/member-consent";
import { checkRowStyle, checkStyle } from "./join-form-styles";

// Language Switcher Pill
export function LanguageSwitcher({
  language,
  onChange,
}: {
  language: ConsentLanguage;
  onChange: (code: ConsentLanguage) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        backgroundColor: "var(--color-base)",
        padding: 3,
        borderRadius: 9999,
        border: "1px solid var(--color-line)",
      }}
      role="group"
      aria-label="Language"
    >
      {(["en", "fil"] as const).map((code) => (
        <button
          key={code}
          type="button"
          className="jf-lang"
          onClick={() => onChange(code)}
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
            backgroundColor: language === code ? "var(--color-accent)" : "transparent",
            color: language === code ? "var(--color-surface)" : "var(--color-muted)",
            boxShadow: language === code ? "0 1px 3px color-mix(in srgb, var(--color-accent) 25%, transparent)" : "none",
            transition: "all 0.15s ease",
          }}
        >
          {code === "en" ? "English" : "Filipino"}
        </button>
      ))}
    </div>
  );
}

// Consent Box
export function ConsentBox({
  language,
  consentText,
}: {
  language: ConsentLanguage;
  consentText: React.ReactNode;
}) {
  return (
    <div
      lang={language === "fil" ? "fil" : "en"}
      style={{
        padding: "14px 16px",
        borderRadius: 16,
        border: "1px solid var(--color-line)",
        backgroundColor: "var(--color-base)",
        fontSize: 13,
        lineHeight: 1.6,
        color: "var(--color-ink-soft)",
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
          color: "var(--color-muted)",
          marginBottom: 8,
        }}
      >
        <span>{language === "fil" ? "Kasunduan sa Pagpapahintulot" : "Consent Agreement"}</span>
      </div>
      <div>{consentText}</div>
    </div>
  );
}

// Checkboxes
export function ConsentCheckboxes({
  agree,
  adult,
  onAgreeChange,
  onAdultChange,
  agreeLabel,
  adultLabel,
}: {
  agree: boolean;
  adult: boolean;
  onAgreeChange: (checked: boolean) => void;
  onAdultChange: (checked: boolean) => void;
  agreeLabel: string;
  adultLabel: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <label style={checkRowStyle}>
        <input
          type="checkbox"
          name="agree"
          checked={agree}
          onChange={(e) => onAgreeChange(e.target.checked)}
          style={checkStyle}
        />
        <span style={{ fontSize: 13.5, lineHeight: 1.45 }}>{agreeLabel}</span>
      </label>

      <label style={checkRowStyle}>
        <input
          type="checkbox"
          name="adult"
          checked={adult}
          onChange={(e) => onAdultChange(e.target.checked)}
          style={checkStyle}
        />
        <span style={{ fontSize: 13.5, lineHeight: 1.45 }}>{adultLabel}</span>
      </label>
    </div>
  );
}
