import type { Metadata } from "next";
import { Suspense } from "react";
import Image from "next/image";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Link2Off } from "lucide-react";
import { Card, CardBadge, CardTitle, CardDescription } from "@/src/components/card";
import { FloatingIconsDecor } from "@/src/components/floating-decor";
import { JOIN_MESSAGES } from "@/src/lib/member-join";
import { getJoinOrgName } from "@/src/lib/member-join-server";
import { JoinForm } from "./join-form";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

// The link is a secret: keep it out of search results
export const metadata: Metadata = {
  title: "Join your org · OrgKit",
  robots: { index: false, follow: false },
};

export default function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  return (
    <main
      className={`${plusJakarta.className} orgkit-join-page`}
      style={{
        position: "relative",
        minHeight: "100vh",
        backgroundColor: "#F4F4F5",
        color: "#18181B",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "clamp(24px, 4vh, 48px) 16px",
        boxSizing: "border-box",
        overflowX: "hidden",
      }}
    >
      <style>{`
        @keyframes cardPopout {
          0% {
            opacity: 0;
            transform: scale(0.92) translateY(12px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes burstTL {
          0% { opacity: 0; transform: translate(140px, 90px) scale(0.2) rotate(0deg); }
          65% { opacity: 1; transform: translate(-4px, -4px) scale(1.08) rotate(-9deg); }
          100% { opacity: 1; transform: translate(0, 0) scale(1) rotate(-7deg); }
        }
        @keyframes burstFL {
          0% { opacity: 0; transform: translate(170px, 0) scale(0.2) rotate(0deg); }
          65% { opacity: 1; transform: translate(-5px, 0) scale(1.08) rotate(-7deg); }
          100% { opacity: 1; transform: translate(0, 0) scale(1) rotate(-5deg); }
        }
        @keyframes burstBL {
          0% { opacity: 0; transform: translate(140px, -90px) scale(0.2) rotate(0deg); }
          65% { opacity: 1; transform: translate(-4px, 4px) scale(1.08) rotate(9deg); }
          100% { opacity: 1; transform: translate(0, 0) scale(1) rotate(7deg); }
        }
        @keyframes burstTR {
          0% { opacity: 0; transform: translate(-140px, 90px) scale(0.2) rotate(0deg); }
          65% { opacity: 1; transform: translate(4px, -4px) scale(1.08) rotate(9deg); }
          100% { opacity: 1; transform: translate(0, 0) scale(1) rotate(7deg); }
        }
        @keyframes burstFR {
          0% { opacity: 0; transform: translate(-170px, 0) scale(0.2) rotate(0deg); }
          65% { opacity: 1; transform: translate(5px, 0) scale(1.08) rotate(7deg); }
          100% { opacity: 1; transform: translate(0, 0) scale(1) rotate(5deg); }
        }
        @keyframes burstBR {
          0% { opacity: 0; transform: translate(-150px, -90px) scale(0.2) rotate(0deg); }
          65% { opacity: 1; transform: translate(5px, 4px) scale(1.08) rotate(-7.5deg); }
          100% { opacity: 1; transform: translate(0, 0) scale(1) rotate(-6deg); }
        }
        @keyframes burstDot {
          0% { opacity: 0; transform: scale(0); }
          100% { opacity: 1; transform: scale(1); }
        }
        .orgkit-burst-tl { animation: burstTL 0.52s cubic-bezier(0.16, 1.25, 0.38, 1) 0.04s both; }
        .orgkit-burst-fl { animation: burstFL 0.52s cubic-bezier(0.16, 1.25, 0.38, 1) 0.08s both; }
        .orgkit-burst-bl { animation: burstBL 0.52s cubic-bezier(0.16, 1.25, 0.38, 1) 0.12s both; }
        .orgkit-burst-tr { animation: burstTR 0.52s cubic-bezier(0.16, 1.25, 0.38, 1) 0.06s both; }
        .orgkit-burst-fr { animation: burstFR 0.52s cubic-bezier(0.16, 1.25, 0.38, 1) 0.1s both; }
        .orgkit-burst-br { animation: burstBR 0.52s cubic-bezier(0.16, 1.25, 0.38, 1) 0.14s both; }
        .orgkit-burst-dot { animation: burstDot 0.4s ease 0.2s both; }

        @keyframes ambientFloatA {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes ambientFloatB {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(4px); }
        }
        .orgkit-float-a { animation: ambientFloatA 3.4s ease-in-out infinite; }
        .orgkit-float-b { animation: ambientFloatB 3.8s ease-in-out infinite; }

        @media (max-width: 639px) {
          .orgkit-floating-decor {
            display: none !important;
          }
        }
      `}</style>

      {/* ── Background Concentric SVG Circles: Top-Left ── */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 320,
          height: 320,
          pointerEvents: "none",
          zIndex: 1,
        }}
      >
        <svg
          viewBox="0 0 320 320"
          style={{ width: "100%", height: "100%", display: "block" }}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="0" cy="0" r="220" fill="#059669" fillOpacity="0.04" />
          <circle
            cx="0"
            cy="0"
            r="260"
            stroke="#059669"
            strokeWidth="1.2"
            strokeOpacity="0.22"
          />
          <circle
            cx="0"
            cy="0"
            r="160"
            stroke="#059669"
            strokeWidth="1.2"
            strokeOpacity="0.14"
          />
        </svg>
      </div>

      {/* ── Background Concentric SVG Circles: Bottom-Right ── */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          bottom: 0,
          right: 0,
          width: 320,
          height: 320,
          pointerEvents: "none",
          zIndex: 1,
        }}
      >
        <svg
          viewBox="0 0 320 320"
          style={{ width: "100%", height: "100%", display: "block" }}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="320" cy="320" r="200" fill="#059669" fillOpacity="0.05" />
          <circle
            cx="320"
            cy="320"
            r="270"
            stroke="#059669"
            strokeWidth="1.2"
            strokeOpacity="0.26"
          />
        </svg>
      </div>

      {/* ── Centered Card with Floating Icons Decor ── */}
      <div
        className="orgkit-card-wrapper"
        style={{
          position: "relative",
          zIndex: 10,
          width: "100%",
          maxWidth: 460,
          boxSizing: "border-box",
          animation: "cardPopout 0.45s cubic-bezier(0.16, 1.25, 0.38, 1) both",
        }}
      >
        <FloatingIconsDecor />

        <Suspense fallback={<JoinLoadingCard />}>
          <JoinContent params={params} />
        </Suspense>
      </div>
    </main>
  );
}

function JoinLoadingCard() {
  return (
    <Card maxWidth={460} padding="48px 36px">
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            border: "3px solid rgba(5, 150, 105, 0.2)",
            borderTopColor: "#059669",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <p style={{ margin: 0, fontSize: 14, color: "#71717A" }}>Loading join page…</p>
      </div>
    </Card>
  );
}

// Reads the link from the URL and the database, so it streams in behind Suspense
async function JoinContent({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const orgName = await getJoinOrgName(token);

  if (!orgName) {
    return (
      <Card maxWidth={460} padding="clamp(32px, 4vw, 44px) clamp(24px, 3vw, 36px)">
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
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
          <CardBadge size={68} style={{ backgroundColor: "rgba(220, 38, 38, 0.08)", marginBottom: 18 }}>
            <Link2Off size={30} color="#DC2626" strokeWidth={2.2} />
          </CardBadge>
          <CardTitle style={{ fontSize: 24, marginBottom: 10 }}>
            Link isn't active
          </CardTitle>
          <CardDescription style={{ fontSize: 15, lineHeight: 1.55, color: "#52525B", maxWidth: 360 }}>
            {JOIN_MESSAGES.inactiveLink}
          </CardDescription>
        </div>
      </Card>
    );
  }

  return (
    <JoinForm
      token={token}
      orgName={orgName}
      contactEmail={process.env.PRIVACY_CONTACT_EMAIL?.trim() || "[privacy contact email]"}
    />
  );
}
