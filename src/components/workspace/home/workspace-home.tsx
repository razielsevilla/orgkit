import { Users } from "lucide-react";
import {
  Card,
  CardHeader,
  CardBadge,
  CardTitle,
  CardDescription,
} from "@/src/components/ui/card";
import { FloatingIconsDecor } from "@/src/components/decor/floating-decor";

interface WorkspaceHomeProps {
  orgName: string;
  schoolName: string | null;
}

/** The workspace landing card ("Your workspace is ready"), centred in the frame's canvas. */
export function WorkspaceHome({ orgName, schoolName }: WorkspaceHomeProps) {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        boxSizing: "border-box",
      }}
    >
      {/* Center Floating Card Wrapper */}
      <div
        className="orgkit-card-wrapper"
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 450,
          boxSizing: "border-box",
          animation: "cardPopout 0.45s cubic-bezier(0.16, 1.25, 0.38, 1) both",
        }}
      >
        <FloatingIconsDecor />

        <Card maxWidth={440} padding="44px 36px 40px 36px">
          <CardHeader style={{ marginBottom: 24 }}>
            <CardBadge size={72} style={{ marginBottom: 24 }}>
              <Users size={32} color="var(--color-accent)" strokeWidth={2} />
            </CardBadge>
            <p
              style={{
                margin: "0 0 6px 0",
                fontSize: 13.5,
                fontWeight: 600,
                color: "var(--color-accent)",
              }}
            >
              {schoolName ? `${orgName} · ${schoolName}` : orgName}
            </p>
            <CardTitle
              style={{
                fontSize: 27,
                lineHeight: 1.2,
                margin: "0 0 8px 0",
              }}
            >
              Your workspace is ready.
            </CardTitle>
            <CardDescription
              style={{
                fontSize: 14.5,
                color: "var(--color-muted)",
                lineHeight: 1.4,
              }}
            >
              Next: add your members.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
