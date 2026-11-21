import Image from "next/image";
import { Check, Link2Off } from "lucide-react";
import {
  Card,
  CardHeader,
  CardBadge,
  CardTitle,
  CardDescription,
} from "@/src/components/ui/card";
import type { ConsentLanguage } from "@/src/lib/members/member-consent";
import { CHECKIN_COPY } from "@/src/lib/checkin/checkin-copy";

function Logo({ marginBottom }: { marginBottom: number }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", marginBottom }}>
      <Image
        src="/orgkit-text-logo.png"
        alt="OrgKit"
        width={112}
        height={34}
        priority
        style={{ height: 28, width: "auto", display: "block", userSelect: "none" }}
      />
    </div>
  );
}

/** Expired, tampered, closed or cancelled: one card, one message */
export function CheckinExpiredView({ language = "en" }: { language?: ConsentLanguage }) {
  const copy = CHECKIN_COPY[language];
  return (
    <Card maxWidth={460} padding="clamp(32px, 4vw, 44px) clamp(24px, 3vw, 36px)">
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Logo marginBottom={16} />
        <CardBadge
          size={68}
          style={{ backgroundColor: "color-mix(in srgb, var(--color-danger) 8%, transparent)", marginBottom: 18 }}
        >
          <Link2Off size={30} color="var(--color-danger)" strokeWidth={2.2} />
        </CardBadge>
        <CardTitle style={{ fontSize: 24, marginBottom: 10 }}>{copy.expiredTitle}</CardTitle>
        <CardDescription
          role="alert"
          style={{ fontSize: 15, lineHeight: 1.55, color: "var(--color-muted-strong)", maxWidth: 360 }}
        >
          {copy.expired}
        </CardDescription>
      </div>
    </Card>
  );
}

/** "You're checked in, <first name>" or "You're already checked in" */
export function CheckinSuccessView({
  language,
  orgName,
  eventTitle,
  firstName,
  already,
}: {
  language: ConsentLanguage;
  orgName: string;
  eventTitle: string;
  firstName: string;
  already: boolean;
}) {
  const copy = CHECKIN_COPY[language];
  return (
    <Card maxWidth={460} padding="clamp(32px, 4vw, 44px) clamp(24px, 3.5vw, 36px)">
      <Logo marginBottom={20} />
      <CardHeader style={{ marginBottom: 0 }}>
        <CardBadge size={72} style={{ marginBottom: 20 }}>
          <Check size={36} color="var(--color-accent)" strokeWidth={2.8} />
        </CardBadge>
        <CardTitle
          style={{ fontSize: "clamp(22px, 2.4vw, 28px)", marginBottom: 12, overflowWrap: "anywhere" }}
        >
          {already ? copy.alreadyTitle : copy.successTitle(firstName)}
        </CardTitle>
        <CardDescription
          role="status"
          style={{
            fontSize: 15.5,
            lineHeight: 1.6,
            color: "var(--color-muted-strong)",
            maxWidth: 380,
            marginBottom: 20,
          }}
        >
          {already ? copy.alreadyNote : copy.successNote}
        </CardDescription>
      </CardHeader>

      <div
        style={{
          width: "100%",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
          padding: "12px 18px",
          borderRadius: 16,
          backgroundColor: "var(--color-base)",
          border: "1px solid var(--color-line)",
          textAlign: "center",
          overflowWrap: "anywhere",
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-ink)" }}>{eventTitle}</span>
        <span style={{ fontSize: 13, color: "var(--color-muted)" }}>{orgName}</span>
      </div>
    </Card>
  );
}
