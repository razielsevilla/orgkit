import Image from "next/image";
import { Check, Link2Off } from "lucide-react";
import {
  Card,
  CardHeader,
  CardBadge,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/src/components/ui/card";
import { JOIN_MESSAGES } from "@/src/lib/members/member-join";
import type { ConsentLanguage } from "@/src/lib/members/member-consent";

export function JoinInactiveView() {
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
        <CardBadge size={68} style={{ backgroundColor: "color-mix(in srgb, var(--color-danger) 8%, transparent)", marginBottom: 18 }}>
          <Link2Off size={30} color="var(--color-danger)" strokeWidth={2.2} />
        </CardBadge>
        <CardTitle style={{ fontSize: 24, marginBottom: 10 }}>
          Link isn&apos;t active
        </CardTitle>
        <CardDescription style={{ fontSize: 15, lineHeight: 1.55, color: "var(--color-muted-strong)", maxWidth: 360 }}>
          {JOIN_MESSAGES.inactiveLink}
        </CardDescription>
      </div>
    </Card>
  );
}

export function JoinSuccessView({
  language,
  orgName,
  thanks,
}: {
  language: ConsentLanguage;
  orgName: string;
  thanks: string;
}) {
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
          <Check size={36} color="var(--color-accent)" strokeWidth={2.8} />
        </CardBadge>
        <CardTitle style={{ fontSize: "clamp(24px, 2.4vw, 28px)", marginBottom: 12 }}>
          {language === "fil" ? "Nasa listahan ka na!" : "You're on the list!"}
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
          {thanks}
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
            backgroundColor: "var(--color-base)",
            border: "1px solid var(--color-line)",
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
              backgroundColor: "var(--color-accent)",
              color: "var(--color-on-accent)",
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
              color: "var(--color-ink)",
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
            color: "var(--color-muted)",
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
