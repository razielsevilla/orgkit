"use client";

import React, { useState } from "react";
import { ExternalLink, FileText, Download, Plus, X, Loader2 } from "lucide-react";
import type { LinkedDocumentItem } from "@/src/lib/handover/handover-types";
import { getDocumentDownloadUrlAction } from "@/src/app/(workspace)/documents-actions";
import { Dialog, DialogHeader, DialogBody, DialogFooter } from "@/src/components/ui/dialog";

interface HandoverLinkedDocumentsProps {
  orgId: string;
  linkedDocuments: LinkedDocumentItem[];
  availableDocuments: LinkedDocumentItem[];
  isReadOnly: boolean;
  onAttachDocument: (docId: string) => void;
  onDetachDocument: (docId: string) => void;
}

export function HandoverLinkedDocuments({
  orgId,
  linkedDocuments,
  availableDocuments,
  isReadOnly,
  onAttachDocument,
  onDetachDocument,
}: HandoverLinkedDocumentsProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleOpenDocument = async (doc: LinkedDocumentItem) => {
    if (doc.kind === "link" && doc.url) {
      window.open(doc.url, "_blank", "noopener,noreferrer");
      return;
    }

    if (doc.kind === "file") {
      setDownloadingId(doc.id);
      try {
        const res = await getDocumentDownloadUrlAction(orgId, doc.id);
        if (res.success && res.data?.signedUrl) {
          window.open(res.data.signedUrl, "_blank", "noopener,noreferrer");
        }
      } finally {
        setDownloadingId(null);
      }
    }
  };

  const attachedIds = new Set(linkedDocuments.map((d) => d.id));
  const unattached = availableDocuments.filter((d) => !attachedIds.has(d.id));

  return (
    <div
      style={{
        borderRadius: 20,
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-line)",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
        boxShadow: "0 2px 10px rgba(24, 24, 27, 0.02)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h2
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "var(--color-ink)",
              margin: 0,
              letterSpacing: "-0.01em",
            }}
          >
            Attached Documents &amp; Shared Links
          </h2>
          <p style={{ fontSize: 13, color: "var(--color-muted)", margin: "3px 0 0 0" }}>
            Key constitutions, templates, bank files, or spreadsheets from the org's document repository.
          </p>
        </div>

        {!isReadOnly && availableDocuments.length > 0 && (
          <button
            type="button"
            onClick={() => setIsPickerOpen(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 14px",
              borderRadius: 9999,
              border: "1px solid var(--color-line)",
              backgroundColor: "var(--color-base)",
              color: "var(--color-ink)",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <Plus size={14} />
            <span>Attach record</span>
          </button>
        )}
      </div>

      {/* Linked Documents List */}
      {linkedDocuments.length === 0 ? (
        <div
          style={{
            padding: "18px",
            textAlign: "center",
            borderRadius: 14,
            border: "1px dashed var(--color-line)",
            backgroundColor: "var(--color-base)",
            fontSize: 13,
            color: "var(--color-muted)",
          }}
        >
          No documents attached yet. {!isReadOnly && "Attach key forms, folders, or permits for quick access."}
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(min(280px, 100%), 1fr))",
            gap: 10,
          }}
        >
          {linkedDocuments.map((doc) => {
            const isBusy = downloadingId === doc.id;

            return (
              <div
                key={doc.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  padding: "10px 14px",
                  borderRadius: 14,
                  border: "1px solid var(--color-line)",
                  backgroundColor: "var(--color-base)",
                  transition: "all 0.15s ease",
                }}
              >
                <button
                  type="button"
                  onClick={() => handleOpenDocument(doc)}
                  disabled={isBusy}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    minWidth: 0,
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    textAlign: "left",
                    color: "inherit",
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      backgroundColor: "var(--color-surface)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--color-accent)",
                      flexShrink: 0,
                    }}
                  >
                    {isBusy ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : doc.kind === "file" ? (
                      <FileText size={16} />
                    ) : (
                      <ExternalLink size={16} />
                    )}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--color-ink)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {doc.title}
                    </span>
                    <span style={{ fontSize: 11.5, color: "var(--color-muted)" }}>
                      {doc.category} &bull; {doc.kind === "file" ? "File" : "External link"}
                    </span>
                  </div>
                </button>

                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => handleOpenDocument(doc)}
                    disabled={isBusy}
                    title={doc.kind === "file" ? "Download file" : "Open external link"}
                    style={{
                      padding: 6,
                      borderRadius: 8,
                      border: "none",
                      backgroundColor: "transparent",
                      color: "var(--color-muted)",
                      cursor: "pointer",
                    }}
                  >
                    {doc.kind === "file" ? <Download size={15} /> : <ExternalLink size={15} />}
                  </button>

                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={() => onDetachDocument(doc.id)}
                      title="Detach from guide"
                      style={{
                        padding: 6,
                        borderRadius: 8,
                        border: "none",
                        backgroundColor: "transparent",
                        color: "var(--color-muted)",
                        cursor: "pointer",
                      }}
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Document Picker Dialog */}
      {isPickerOpen && (
        <Dialog onDismiss={() => setIsPickerOpen(false)} maxWidth={500}>
          <DialogHeader
            title="Attach Stored Document"
            description="Select records from your organization repository to include in this handover guide."
            onClose={() => setIsPickerOpen(false)}
          />

          <DialogBody style={{ maxHeight: 360, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
            {unattached.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--color-muted)", textAlign: "center", padding: "16px 0" }}>
                All available documents in your repository are already attached.
              </p>
            ) : (
              unattached.map((doc) => (
                <div
                  key={doc.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1px solid var(--color-line)",
                    backgroundColor: "var(--color-base)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    {doc.kind === "file" ? <FileText size={16} /> : <ExternalLink size={16} />}
                    <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-ink)" }}>
                        {doc.title}
                      </span>
                      <span style={{ fontSize: 11.5, color: "var(--color-muted)" }}>
                        {doc.category}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onAttachDocument(doc.id);
                      setIsPickerOpen(false);
                    }}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 8,
                      border: "none",
                      backgroundColor: "var(--color-accent)",
                      color: "#ffffff",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    Attach
                  </button>
                </div>
              ))
            )}
          </DialogBody>

          <DialogFooter>
            <button
              type="button"
              onClick={() => setIsPickerOpen(false)}
              style={{
                padding: "8px 16px",
                borderRadius: 9999,
                border: "1px solid var(--color-line)",
                backgroundColor: "var(--color-surface)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  );
}
