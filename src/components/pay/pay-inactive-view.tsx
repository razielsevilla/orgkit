"use client";

import Image from "next/image";
import { Link2Off } from "lucide-react";
import {
  Card,
  CardBadge,
  CardTitle,
  CardDescription,
} from "@/src/components/ui/card";
import { DUES_PAY_MESSAGES, type DuesPayLanguage } from "@/src/lib/dues/dues-pay";

export function PayInactiveView({
  language = "en",
}: {
  language?: DuesPayLanguage;
}) {
  const copy = DUES_PAY_MESSAGES[language];

  return (
    <Card
      maxWidth={460}
      padding="clamp(32px, 4vw, 44px) clamp(24px, 3vw, 36px)"
    >
      <div
        style={{
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
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

        <CardBadge
          size={68}
          style={{
            backgroundColor:
              "color-mix(in srgb, var(--color-danger) 8%, transparent)",
            marginBottom: 18,
          }}
        >
          <Link2Off size={30} color="var(--color-danger)" strokeWidth={2.2} />
        </CardBadge>

        <CardTitle style={{ fontSize: 24, marginBottom: 10 }}>
          {copy.inactiveTitle}
        </CardTitle>

        <CardDescription
          style={{
            fontSize: 15,
            lineHeight: 1.55,
            color: "var(--color-muted-strong)",
            maxWidth: 360,
          }}
        >
          {copy.inactiveDescription}
        </CardDescription>
      </div>
    </Card>
  );
}
