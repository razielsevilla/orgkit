import Image from "next/image";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/src/lib/auth/session-user";
import { AuthLayout } from "@/src/components/auth-layout";
import { ConsentForm } from "./consent-form";

export default function ConsentPage() {
  return (
    <AuthLayout>
      <Suspense fallback={null}>
        <ConsentCard />
      </Suspense>
    </AuthLayout>
  );
}

// Reads the session, so it streams in behind the Suspense boundary above
async function ConsentCard() {
  const { supabase, user } = await getSessionUser();

  if (!user) redirect("/signin");

  // Already agreed on an earlier sign-in: nothing to show
  const { data: officer } = await supabase
    .from("officers")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (officer) redirect("/orgs/new");

  return (
    <div
        className="orgkit-card"
        role="region"
        aria-label="Before you continue"
        style={{
          width: "clamp(300px, 33.85vw, 566px)",
          maxWidth: "100%",
          backgroundColor: "#FFFFFF",
          borderRadius: 28,
          padding: "clamp(24px, 4.25vh, 40px) clamp(20px, 2.69vw, 45px)",
          boxShadow: "0 20px 50px rgba(24, 24, 27, 0.08)",
          border: "1px solid rgba(228, 228, 231, 0.6)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          boxSizing: "border-box",
        }}
      >
        <Image
          src="/orgkit-logo.png"
          alt="OrgKit Logo"
          width={92}
          height={58}
          priority
          draggable={false}
          style={{ width: 72, height: "auto" }}
        />
        <h2
          style={{
            marginTop: 20,
            marginBottom: 0,
            fontSize: "clamp(24px, 2.39vw, 32px)",
            fontWeight: 700,
            color: "#18181B",
            lineHeight: 1.15,
          }}
        >
          Before you continue
        </h2>
        <p style={{ marginTop: 14, marginBottom: 0, fontSize: 16, lineHeight: 1.5, color: "#52525B" }}>
          We use your name and email from Google to run OrgKit. Only the officers of your org can see them.
        </p>
        <ConsentForm />
    </div>
  );
}
