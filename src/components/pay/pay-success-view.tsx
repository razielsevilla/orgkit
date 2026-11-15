"use client";

import Image from "next/image";
import { Check, ShieldCheck } from "lucide-react";
import {
  Card,
  CardBadge,
  CardTitle,
  CardDescription,
} from "@/src/components/ui/card";
import { DUES_PAY_MESSAGES, type DuesPayLanguage } from "@/src/lib/dues/dues-pay";
import { formatPesos } from "@/src/components/workspace/dues/dues-table";

interface PaySuccessViewProps {
  language: DuesPayLanguage;
  referenceNo: string;
  amount: number;
  orgName: string;
  periodName: string;
}

export function PaySuccessView({
  language,
  referenceNo,
  amount,
  orgName,
  periodName,
}: PaySuccessViewProps) {
  const copy = DUES_PAY_MESSAGES[language];

  return (
    <Card
      maxWidth={460}
      padding="clamp(32px, 4vw, 44px) clamp(24px, 3.5vw, 36px)"
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

      <div
        style={{
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <CardBadge
          size={68}
          style={{
            backgroundColor:
              "color-mix(in srgb, var(--color-accent) 12%, transparent)",
            marginBottom: 18,
          }}
        >
          <Check size={32} color="var(--color-accent)" strokeWidth={2.4} />
        </CardBadge>

        <CardTitle style={{ fontSize: 24, marginBottom: 8 }}>
          {copy.successTitle}
        </CardTitle>

        <CardDescription
          style={{
            fontSize: 14.5,
            lineHeight: 1.5,
            color: "var(--color-muted-strong)",
            marginBottom: 20,
            maxWidth: 360,
          }}
        >
          {copy.successSubtitle}
        </CardDescription>

        {/* Receipt Details Card */}
        <div
          style={{
            width: "100%",
            borderRadius: 14,
            border: "1px solid var(--color-line)",
            backgroundColor: "var(--color-base)",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            boxSizing: "border-box",
            textAlign: "left",
            fontSize: 13,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              borderBottom: "1px solid var(--color-line)",
              paddingBottom: 10,
            }}
          >
            <span style={{ color: "var(--color-muted)", fontSize: 12 }}>
              {copy.amountLabel}
            </span>
            <span
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: "var(--color-ink)",
              }}
            >
              {formatPesos(amount)}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ color: "var(--color-muted)", fontSize: 12 }}>
              {copy.successReference}
            </span>
            <span
              style={{
                fontFamily: "monospace",
                fontWeight: 600,
                color: "var(--color-ink)",
                backgroundColor: "var(--color-surface)",
                padding: "3px 8px",
                borderRadius: 6,
                border: "1px solid var(--color-line)",
              }}
            >
              {referenceNo}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ color: "var(--color-muted)", fontSize: 12 }}>
              {copy.successOrg}
            </span>
            <span style={{ fontWeight: 600, color: "var(--color-ink)" }}>
              {orgName}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ color: "var(--color-muted)", fontSize: 12 }}>
              {copy.successPeriod}
            </span>
            <span style={{ color: "var(--color-muted-strong)" }}>
              {periodName}
            </span>
          </div>
        </div>

        {/* Security assurance */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            color: "var(--color-muted)",
          }}
        >
          <ShieldCheck size={15} color="var(--color-accent)" />
          <span>{copy.successDone}</span>
        </div>
      </div>
    </Card>
  );
}
