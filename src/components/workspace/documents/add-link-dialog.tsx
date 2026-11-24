"use client";

import React, { useState, useTransition } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Dialog, DialogHeader, DialogBody, DialogFooter } from "@/src/components/ui/dialog";
import { Select } from "@/src/components/ui/select";
import {
  DOCUMENT_CATEGORIES,
  DOCUMENTS_ERROR_MESSAGES,
  isValidExternalUrl,
  type DocumentCategory,
} from "@/src/lib/documents/documents-validation";
import { addDocumentLinkAction, type WorkspaceDocument } from "@/src/app/(workspace)/documents-actions";

interface AddLinkDialogProps {
  orgId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (doc: WorkspaceDocument) => void;
}

export function AddLinkDialog({ orgId, isOpen, onClose, onSuccess }: AddLinkDialogProps) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<DocumentCategory>("Templates");
  const [url, setUrl] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanTitle = title.trim();
    if (cleanTitle.length < 2 || cleanTitle.length > 150) {
      setErrorMessage(DOCUMENTS_ERROR_MESSAGES.invalid_title);
      return;
    }

    const cleanUrl = url.trim();
    if (!isValidExternalUrl(cleanUrl)) {
      setErrorMessage(DOCUMENTS_ERROR_MESSAGES.invalid_url);
      return;
    }

    startTransition(async () => {
      const res = await addDocumentLinkAction(orgId, {
        title: cleanTitle,
        category,
        url: cleanUrl,
      });

      if (!res.success || !res.data) {
        setErrorMessage(res.errorMessage ?? DOCUMENTS_ERROR_MESSAGES.failed);
        return;
      }

      onSuccess(res.data);
      onClose();
    });
  };

  return (
    <Dialog onDismiss={onClose} labelledBy="add-link-dialog-title" maxWidth={480}>
      <DialogHeader
        titleId="add-link-dialog-title"
        title="Add External Link"
        description="Keep shared drives, folders, and resources accessible"
        onClose={onClose}
      />

      <form onSubmit={handleSubmit}>
        <DialogBody style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {errorMessage && (
            <div
              role="alert"
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "10px 14px",
                borderRadius: 12,
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#991b1b",
                fontSize: 13,
                lineHeight: 1.4,
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Title Input */}
          <div>
            <label
              htmlFor="document-link-title"
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--color-ink)",
                marginBottom: 6,
              }}
            >
              Title <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <input
              id="document-link-title"
              type="text"
              required
              disabled={isPending}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Org Google Drive Folder"
              maxLength={150}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid var(--color-line)",
                backgroundColor: "var(--color-surface)",
                fontSize: 13.5,
                color: "var(--color-ink)",
                boxSizing: "border-box",
                outline: "none",
              }}
            />
          </div>

          {/* URL Input */}
          <div>
            <label
              htmlFor="document-link-url"
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--color-ink)",
                marginBottom: 6,
              }}
            >
              External URL <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <input
              id="document-link-url"
              type="url"
              required
              disabled={isPending}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://drive.google.com/..."
              maxLength={2000}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid var(--color-line)",
                backgroundColor: "var(--color-surface)",
                fontSize: 13.5,
                color: "var(--color-ink)",
                boxSizing: "border-box",
                outline: "none",
              }}
            />
            <span style={{ fontSize: 11.5, color: "var(--color-muted-strong)", marginTop: 4, display: "block" }}>
              Must start with http:// or https://
            </span>
          </div>

          {/* Category Dropdown */}
          <div>
            <label
              htmlFor="document-link-category"
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--color-ink)",
                marginBottom: 6,
              }}
            >
              Category <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <Select
              id="document-link-category"
              disabled={isPending}
              value={category}
              onChange={(val) => setCategory(val as DocumentCategory)}
              options={DOCUMENT_CATEGORIES}
              placeholder="Select category..."
            />
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
            type="submit"
            disabled={isPending || !title.trim() || !url.trim()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "9px 18px",
              borderRadius: 10,
              border: "none",
              backgroundColor: "var(--color-accent)",
              color: "#ffffff",
              fontSize: 13.5,
              fontWeight: 600,
              cursor: isPending || !title.trim() || !url.trim() ? "not-allowed" : "pointer",
              opacity: isPending || !title.trim() || !url.trim() ? 0.6 : 1,
            }}
          >
            {isPending && <Loader2 size={16} className="animate-spin" />}
            <span>{isPending ? "Adding..." : "Add link"}</span>
          </button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
