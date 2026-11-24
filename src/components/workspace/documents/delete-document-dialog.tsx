"use client";

import React, { useTransition } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Dialog, DialogHeader, DialogBody, DialogFooter } from "@/src/components/ui/dialog";
import { deleteDocumentAction, type WorkspaceDocument } from "@/src/app/(workspace)/documents-actions";

interface DeleteDocumentDialogProps {
  orgId: string;
  document: WorkspaceDocument | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (deletedId: string) => void;
}

export function DeleteDocumentDialog({
  orgId,
  document,
  isOpen,
  onClose,
  onSuccess,
}: DeleteDocumentDialogProps) {
  const [isPending, startTransition] = useTransition();

  if (!isOpen || !document) return null;

  const handleDelete = () => {
    startTransition(async () => {
      const res = await deleteDocumentAction(orgId, document.id);
      if (res.success) {
        onSuccess(document.id);
        onClose();
      }
    });
  };

  return (
    <Dialog onDismiss={onClose} role="alertdialog" labelledBy="delete-doc-dialog-title" maxWidth={440}>
      <DialogHeader
        titleId="delete-doc-dialog-title"
        title="Delete Document"
        description="This action cannot be undone"
        onClose={onClose}
      />

      <DialogBody>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ margin: 0, fontSize: 13.5, color: "var(--color-ink)", lineHeight: 1.5 }}>
            Are you sure you want to remove{" "}
            <strong>&ldquo;{document.title}&rdquo;</strong>?
          </p>
          {document.kind === "file" && (
            <p style={{ margin: 0, fontSize: 12.5, color: "var(--color-muted-strong)" }}>
              The file will be permanently deleted from organization storage.
            </p>
          )}
        </div>
      </DialogBody>

      <DialogFooter>
        <button
          type="button"
          disabled={isPending}
          onClick={onClose}
          style={{
            padding: "9px 16px",
            borderRadius: 10,
            border: "1px solid var(--color-line)",
            backgroundColor: "transparent",
            color: "var(--color-ink)",
            fontSize: 13.5,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={handleDelete}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 18px",
            borderRadius: 10,
            border: "none",
            backgroundColor: "#dc2626",
            color: "#ffffff",
            fontSize: 13.5,
            fontWeight: 600,
            cursor: isPending ? "not-allowed" : "pointer",
            opacity: isPending ? 0.7 : 1,
          }}
        >
          {isPending && <Loader2 size={16} className="animate-spin" />}
          <span>{isPending ? "Deleting..." : "Delete"}</span>
        </button>
      </DialogFooter>
    </Dialog>
  );
}
