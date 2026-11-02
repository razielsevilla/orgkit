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

const inputClass =
  "w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-base text-ink " +
  "outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 " +
  "aria-[invalid=true]:border-red-600";

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
    return <p className="text-center text-ink">{JOIN_MESSAGES.inactiveLink}</p>;
  }

  if (state.status === "success") {
    return (
      <p role="status" className="text-center text-lg font-semibold text-ink">
        {copy.thanks(orgName)}
      </p>
    );
  }

  const consentText = fillConsentText(CURRENT_MEMBER_CONSENT.text[language], {
    orgName,
    contactEmail,
  });

  return (
    <form action={formAction} noValidate className="flex flex-col gap-5">
      <div className="flex justify-end gap-1 text-sm" role="group" aria-label="Language">
        {(["en", "fil"] as const).map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => setLanguage(code)}
            aria-pressed={language === code}
            className={
              "min-h-9 rounded-full px-3 font-semibold " +
              (language === code ? "bg-accent text-white" : "text-muted hover:text-ink")
            }
          >
            {code === "en" ? "English" : "Filipino"}
          </button>
        ))}
      </div>

      <h1 className="text-2xl font-bold tracking-tight text-ink">{copy.heading(orgName)}</h1>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="fullName" className="text-sm font-semibold text-ink">
          {copy.fullName}
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          autoComplete="name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          aria-invalid={state.nameError ? true : undefined}
          aria-describedby={state.nameError ? "fullName-error" : undefined}
          className={inputClass}
        />
        {state.nameError && (
          <p id="fullName-error" className="text-sm text-red-600">
            {state.nameError}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-semibold text-ink">
          {copy.email}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={state.emailError ? true : undefined}
          aria-describedby={state.emailError ? "email-error" : undefined}
          className={inputClass}
        />
        {state.emailError && (
          <p id="email-error" className="text-sm text-red-600">
            {state.emailError}
          </p>
        )}
      </div>

      <div
        lang={language === "fil" ? "fil" : "en"}
        className="rounded-2xl border border-line bg-base p-4 text-sm leading-relaxed text-zinc-700"
      >
        {consentText}
      </div>

      <label className="flex items-start gap-3 text-sm text-ink">
        <input
          type="checkbox"
          name="agree"
          checked={agree}
          onChange={(e) => setAgree(e.target.checked)}
          className="mt-0.5 size-5 shrink-0 accent-emerald-600"
        />
        <span>{copy.agree}</span>
      </label>

      <label className="flex items-start gap-3 text-sm text-ink">
        <input
          type="checkbox"
          name="adult"
          checked={adult}
          onChange={(e) => setAdult(e.target.checked)}
          className="mt-0.5 size-5 shrink-0 accent-emerald-600"
        />
        <span>{copy.adult}</span>
      </label>

      <a
        href="/privacy"
        target="_blank"
        rel="noopener"
        className="text-sm font-semibold text-accent hover:text-accent-strong hover:underline"
      >
        {copy.privacyLink}
      </a>

      <input type="hidden" name="language" value={language} />
      <input type="hidden" name="consentVersion" value={CURRENT_MEMBER_CONSENT.version} />

      <div className="flex flex-col gap-2">
        {state.formError && (
          <p role="alert" className="text-sm text-red-600">
            {state.formError}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="min-h-12 rounded-full bg-accent px-6 text-base font-semibold text-white hover:bg-accent-strong disabled:opacity-60"
        >
          {pending ? copy.joining : copy.join}
        </button>
      </div>
    </form>
  );
}
