"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Dialog } from "@/src/components/ui/dialog";
import { ROUTES } from "@/src/lib/routes";

export function AccessRevokedDialog() {
  const router = useRouter();

  return (
    <Dialog
      role="alertdialog"
      zIndex={120}
      backdropPercent={55}
      shadowPercent={15}
      maxWidth={420}
      padding="32px 28px"
      cardStyle={{ textAlign: "center" }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          backgroundColor: "color-mix(in srgb, var(--color-danger) 10%, transparent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 16px auto",
        }}
      >
        <LogOut size={26} color="var(--color-danger)" />
      </div>

      <h2
        style={{
          fontSize: 19,
          fontWeight: 700,
          color: "var(--color-ink)",
          margin: "0 0 8px 0",
        }}
      >
        Access Revoked
      </h2>

      <p style={{ fontSize: 13.5, color: "var(--color-muted-strong)", margin: "0 0 24px 0", lineHeight: 1.45 }}>
        You no longer have access to this org.
      </p>

      <button
        type="button"
        onClick={() => router.push(ROUTES.home)}
        style={{
          width: "100%",
          padding: "12px 20px",
          borderRadius: 9999,
          border: "none",
          backgroundColor: "var(--color-ink)",
          color: "var(--color-on-accent)",
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Return Home
      </button>
    </Dialog>
  );
}
