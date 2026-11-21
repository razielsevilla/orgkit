import { QrCode } from "lucide-react";
import { CardBadge, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card";

export function JoinPanelHeader({
  orgName,
  schoolName,
  token,
}: {
  orgName: string;
  schoolName: string | null;
  token: string | null;
}) {
  return (
    <CardHeader style={{ marginBottom: 0 }}>
      <CardBadge size={72} style={{ marginBottom: 20 }}>
        <QrCode size={32} color="var(--color-accent)" strokeWidth={2} />
      </CardBadge>
      <p style={{ margin: "0 0 6px 0", fontSize: 13.5, fontWeight: 600, color: "var(--color-accent)" }}>
        {schoolName ? `${orgName} · ${schoolName}` : orgName}
      </p>
      <CardTitle style={{ fontSize: 27, lineHeight: 1.2, margin: "0 0 8px 0" }}>
        Member join
      </CardTitle>
      <CardDescription
        style={{ fontSize: 14.5, color: "var(--color-muted)", lineHeight: 1.4, maxWidth: 320 }}
      >
        {token
          ? "Your join link is ready. Share it, or show the QR at your next event."
          : "The link is off. Anyone who opens an old link or QR sees that it isn't active."}
      </CardDescription>
      <span
        style={{
          marginTop: 14,
          borderRadius: 9999,
          padding: "4px 12px",
          fontSize: 12,
          fontWeight: 600,
          backgroundColor: token ? "color-mix(in srgb, var(--color-accent) 10%, transparent)" : "var(--color-base)",
          color: token ? "var(--color-accent-strong)" : "var(--color-muted)",
        }}
      >
        {token ? "Link is on" : "Link is off"}
      </span>
    </CardHeader>
  );
}
