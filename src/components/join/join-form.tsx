"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/src/components/ui/card";
import {
  CURRENT_MEMBER_CONSENT,
  JOIN_COPY,
  fillConsentText,
  type ConsentLanguage,
} from "@/src/lib/members/member-consent";
import { submitJoin, type JoinState } from "@/src/app/join/[token]/actions";
import { EmailField, FullNameField } from "./join-fields";
import { ConsentBox, ConsentCheckboxes, LanguageSwitcher } from "./join-consent";
import { JoinSubmit } from "./join-submit";
import { JoinInactiveView, JoinSuccessView } from "./join-results";
import { ROUTES } from "@/src/lib/routes";

const INITIAL: JoinState = { status: "idle" };

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
    return <JoinInactiveView />;
  }

  if (state.status === "success") {
    return <JoinSuccessView language={language} orgName={orgName} thanks={copy.thanks(orgName)} />;
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
            border-color: var(--color-accent) !important;
            box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent) 12%, transparent) !important;
          }
          .jf-btn:focus-visible, .jf-lang:focus-visible {
            outline: none;
            box-shadow: 0 0 0 2px var(--color-surface), 0 0 0 4px var(--color-accent);
          }
          .jf-link:hover {
            color: var(--color-accent-strong) !important;
            text-decoration: underline !important;
          }
          .jf-submit:hover:not(:disabled) {
            background-color: var(--color-accent-strong) !important;
            box-shadow: 0 4px 14px color-mix(in srgb, var(--color-accent) 30%, transparent) !important;
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

          <LanguageSwitcher language={language} onChange={setLanguage} />
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
              color: "var(--color-muted)",
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
          <FullNameField
            label={copy.fullName}
            language={language}
            value={fullName}
            onChange={setFullName}
            error={state.nameError}
          />

          {/* Field 2: Email */}
          <EmailField
            label={copy.email}
            language={language}
            value={email}
            onChange={setEmail}
            error={state.emailError}
          />

          <ConsentBox language={language} consentText={consentText} />

          <ConsentCheckboxes
            agree={agree}
            adult={adult}
            onAgreeChange={setAgree}
            onAdultChange={setAdult}
            agreeLabel={copy.agree}
            adultLabel={copy.adult}
          />

          {/* Privacy Notice Link */}
          <div>
            <a
              href={`${ROUTES.privacy}#members`}
              target="_blank"
              rel="noopener"
              className="jf-link"
              style={{
                fontSize: 13,
                color: "var(--color-accent)",
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

          <JoinSubmit
            formError={state.formError}
            pending={pending}
            joiningLabel={copy.joining}
            joinLabel={copy.join}
          />
        </CardContent>
      </form>
    </Card>
  );
}
