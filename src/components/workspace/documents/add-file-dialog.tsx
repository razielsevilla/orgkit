"use client";

import React, { useState, useTransition } from "react";
import { Upload, FileText, AlertCircle, Loader2 } from "lucide-react";
import { Dialog, DialogHeader, DialogBody, DialogFooter } from "@/src/components/ui/dialog";
import {
  DOCUMENT_CATEGORIES,
  DOCUMENTS_ERROR_MESSAGES,
  MAX_DOCUMENT_FILE_SIZE,
  isAllowedDocumentFileType,
  type DocumentCategory,
} from "@/src/lib/documents/documents-validation";
import { uploadDocumentFileAction, type WorkspaceDocument } from "@/src/app/(workspace)/documents-actions";

interface AddFileDialogProps {
  orgId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (doc: WorkspaceDocument) => void;
}

export function AddFileDialog({ orgId, isOpen, onClose, onSuccess }: AddFileDialogProps) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<DocumentCategory>("General");
  const [file, setFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.size > MAX_DOCUMENT_FILE_SIZE) {
      setErrorMessage(DOCUMENTS_ERROR_MESSAGES.file_too_large);
      setFile(null);
      return;
    }

    if (!isAllowedDocumentFileType(selected.name, selected.type)) {
      setErrorMessage(DOCUMENTS_ERROR_MESSAGES.disallowed_file_type);
      setFile(null);
      return;
    }

    setErrorMessage(null);
    setFile(selected);

    // Auto-populate title if empty
    if (!title.trim()) {
      const nameWithoutExt = selected.name.replace(/\.[^/.]+$/, "");
      setTitle(nameWithoutExt);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanTitle = title.trim();
    if (cleanTitle.length < 2 || cleanTitle.length > 150) {
      setErrorMessage(DOCUMENTS_ERROR_MESSAGES.invalid_title);
      return;
    }

    if (!file) {
      setErrorMessage(DOCUMENTS_ERROR_MESSAGES.file_required);
      return;
    }

    const formData = new FormData();
    formData.append("title", cleanTitle);
    formData.append("category", category);
    formData.append("file", file);

    startTransition(async () => {
      const res = await uploadDocumentFileAction(orgId, formData);
      if (!res.success || !res.data) {
        setErrorMessage(res.errorMessage ?? DOCUMENTS_ERROR_MESSAGES.failed);
        return;
      }
      onSuccess(res.data);
      onClose();
    });
  };

  return (
    <Dialog onDismiss={onClose} labelledBy="add-file-dialog-title" maxWidth={480}>
      <DialogHeader
        titleId="add-file-dialog-title"
        title="Upload Document"
        description="Keep constitutions, permits, and forms organized"
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

          {/* File Picker Area */}
          <div>
            <label
              htmlFor="document-file-input"
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--color-ink)",
                marginBottom: 6,
              }}
            >
              File <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <div
              style={{
                border: "2px dashed var(--color-line)",
                borderRadius: 12,
                padding: "18px 16px",
                textAlign: "center",
                backgroundColor: "var(--color-base)",
                cursor: "pointer",
              }}
            >
              <input
                id="document-file-input"
                type="file"
                disabled={isPending}
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.png,.jpg,.jpeg,.webp"
                style={{ display: "none" }}
              />
              <label
                htmlFor="document-file-input"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                }}
              >
                {file ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--color-ink)" }}>
                    <FileText size={22} color="var(--color-accent)" />
                    <span style={{ fontSize: 13.5, fontWeight: 600 }}>{file.name}</span>
                    <span style={{ fontSize: 12, color: "var(--color-muted-strong)" }}>
                      ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                ) : (
                  <>
                    <Upload size={24} color="var(--color-muted)" />
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--color-accent)" }}>
                      Click to choose a file
                    </span>
                    <span style={{ fontSize: 11.5, color: "var(--color-muted-strong)" }}>
                      PDF, Word, Excel, PowerPoint, CSV, PNG, JPG (up to 15 MB)
                    </span>
                  </>
                )}
              </label>
            </div>
          </div>

          {/* Title Input */}
          <div>
            <label
              htmlFor="document-file-title"
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
              id="document-file-title"
              type="text"
              required
              disabled={isPending}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Org Constitution 2026"
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

          {/* Category Dropdown */}
          <div>
            <label
              htmlFor="document-file-category"
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
            <select
              id="document-file-category"
              disabled={isPending}
              value={category}
              onChange={(e) => setCategory(e.target.value as DocumentCategory)}
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
            >
              {DOCUMENT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
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
            disabled={isPending || !file}
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
              cursor: isPending || !file ? "not-allowed" : "pointer",
              opacity: isPending || !file ? 0.6 : 1,
            }}
          >
            {isPending && <Loader2 size={16} className="animate-spin" />}
            <span>{isPending ? "Uploading..." : "Upload file"}</span>
          </button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
