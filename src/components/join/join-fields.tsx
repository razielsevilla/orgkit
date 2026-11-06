"use client";

import type { ConsentLanguage } from "@/src/lib/members/member-consent";
import { errorStyle, fieldStyle, inputStyle, labelStyle } from "./join-form-styles";

export function FullNameField({
  label,
  language,
  value,
  onChange,
  error,
}: {
  label: string;
  language: ConsentLanguage;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <div style={fieldStyle}>
      <label htmlFor="fullName" style={labelStyle}>
        {label}
      </label>
      <input
        id="fullName"
        name="fullName"
        type="text"
        autoComplete="name"
        placeholder={language === "fil" ? "Hal. Juan Dela Cruz" : "e.g. Juan Dela Cruz"}
        className="jf-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "fullName-error" : undefined}
        style={inputStyle(!!error)}
      />
      {error && (
        <p id="fullName-error" style={errorStyle}>
          {error}
        </p>
      )}
    </div>
  );
}

export function EmailField({
  label,
  language,
  value,
  onChange,
  error,
}: {
  label: string;
  language: ConsentLanguage;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <div style={fieldStyle}>
      <label htmlFor="email" style={labelStyle}>
        {label}
      </label>
      <input
        id="email"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder={language === "fil" ? "Hal. juan@pamantasan.edu.ph" : "e.g. juan@university.edu"}
        className="jf-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "email-error" : undefined}
        style={inputStyle(!!error)}
      />
      {error && (
        <p id="email-error" style={errorStyle}>
          {error}
        </p>
      )}
    </div>
  );
}
