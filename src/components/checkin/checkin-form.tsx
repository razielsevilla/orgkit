"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/src/components/ui/card";
import type { ConsentLanguage } from "@/src/lib/members/member-consent";
import { CHECKIN_COPY } from "@/src/lib/checkin/checkin-copy";
import { submitCheckin, type CheckinState } from "@/src/app/checkin/[token]/actions";
import { EmailField } from "@/src/components/join/join-fields";
import { LanguageSwitcher } from "@/src/components/join/join-consent";
import { JoinSubmit } from "@/src/components/join/join-submit";
import { CheckinExpiredView, CheckinSuccessView } from "./checkin-results";

const INITIAL: CheckinState = { status: "idle" };

export function CheckinForm({
  token,
  orgName,
  eventTitle,
}: {
  token: string;
  orgName: string;
  eventTitle: string;
}) {
  const [state, formAction, pending] = useActionState(submitCheckin.bind(null, token), INITIAL);
  const [language, setLanguage] = useState<ConsentLanguage>("en");
  // Controlled, so the typed email survives a failed submit
  const [email, setEmail] = useState("");

  const copy = CHECKIN_COPY[language];

  if (state.status === "expired") {
    return <CheckinExpiredView language={language} />;
  }

  if (state.status === "success" || state.status === "already") {
    return (
      <CheckinSuccessView
        language={language}
        orgName={orgName}
        eventTitle={eventTitle}
        firstName={state.firstName ?? ""}
        already={state.status === "already"}
      />
    );
  }

  return (
    <Card maxWidth={460} padding="clamp(26px, 3.8vw, 36px) clamp(22px, 3vw, 32px)">
      <form action={formAction} noValidate style={{ display: "flex", flexDirection: "column", gap: 18 }}>
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
          .jf-submit:hover:not(:disabled) {
            background-color: var(--color-accent-strong) !important;
            box-shadow: 0 4px 14px color-mix(in srgb, var(--color-accent) 30%, transparent) !important;
          }
        `}</style>

        {/* Brand logo + language switcher, like the join page */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            marginBottom: 2,
          }}
        >
          <Image
            src="/orgkit-text-logo.png"
            alt="OrgKit"
            width={112}
            height={34}
            priority
            style={{ height: 28, width: "auto", display: "block", userSelect: "none" }}
          />
          <LanguageSwitcher language={language} onChange={setLanguage} />
        </div>

        <CardHeader style={{ textAlign: "left", alignItems: "flex-start", marginBottom: 0 }}>
          <CardTitle
            style={{
              fontSize: "clamp(22px, 2.2vw, 26px)",
              textAlign: "left",
              marginBottom: 6,
              overflowWrap: "anywhere",
            }}
          >
            {eventTitle}
          </CardTitle>
          <p
            style={{
              margin: "0 0 8px",
              fontSize: 14,
              fontWeight: 600,
              color: "var(--color-accent)",
              overflowWrap: "anywhere",
            }}
          >
            {orgName}
          </p>
          <CardDescription
            style={{
              fontSize: 13.5,
              lineHeight: 1.45,
              textAlign: "left",
              color: "var(--color-muted)",
              maxWidth: "100%",
            }}
          >
            {copy.subtitle}
          </CardDescription>
        </CardHeader>

        <CardContent style={{ display: "flex", flexDirection: "column", gap: 18, padding: 0 }}>
          <EmailField
            label={copy.email}
            language={language}
            value={email}
            onChange={setEmail}
            error={state.emailError}
          />

          <input type="hidden" name="language" value={language} />

          <JoinSubmit
            formError={state.formError}
            pending={pending}
            joiningLabel={copy.submitting}
            joinLabel={copy.submit}
          />
        </CardContent>
      </form>
    </Card>
  );
}
