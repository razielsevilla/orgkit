"use client";

import { useRouter } from "next/navigation";
import { Dialog, DialogBody, DialogButton, DialogFooter, DialogHeader } from "@/src/components/ui/dialog";
import { ROUTES } from "@/src/lib/routes";

export function AccessRevokedDialog() {
  const router = useRouter();

  return (
    <Dialog
      role="alertdialog"
      labelledBy="access-revoked-title"
      zIndex={120}
      backdropPercent={55}
      maxWidth={420}
    >
      <DialogHeader titleId="access-revoked-title" title="Access revoked" />
      <DialogBody>
        <p style={{ fontSize: 14, color: "var(--color-muted-strong)", margin: 0, lineHeight: 1.5 }}>
          You no longer have access to this org.
        </p>
      </DialogBody>
      <DialogFooter>
        <DialogButton variant="primary" onClick={() => router.push(ROUTES.home)}>
          Return home
        </DialogButton>
      </DialogFooter>
    </Dialog>
  );
}
