"use client";

import React from "react";
import { Download, ExternalLink, FileText, Link as LinkIcon, Trash2 } from "lucide-react";
import type { WorkspaceDocument } from "@/src/app/(workspace)/documents-actions";

interface DocumentTableProps {
  documents: WorkspaceDocument[];
  onDownload: (doc: WorkspaceDocument) => void;
  onDelete: (doc: WorkspaceDocument) => void;
  downloadingId?: string | null;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  Finance: { bg: "#ecfdf5", text: "#065f46" },
  Legal: { bg: "#eff6ff", text: "#1e40af" },
  Templates: { bg: "#fef3c7", text: "#92400e" },
  Contacts: { bg: "#f3e8ff", text: "#6b21a8" },
  General: { bg: "var(--color-base)", text: "var(--color-muted-strong)" },
};

function formatFileSize(bytes: number | null): string {
  if (!bytes || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return iso;
  }
}

export function DocumentTable({
  documents,
  onDownload,
  onDelete,
  downloadingId,
}: DocumentTableProps) {
  return (
    <div
      className="orgkit-documents-table-wrapper"
      style={{
        width: "100%",
        backgroundColor: "var(--color-surface)",
        borderRadius: 20,
        border: "1px solid var(--color-line)",
        overflow: "hidden",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.02)",
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          textAlign: "left",
          fontSize: 13.5,
        }}
      >
        <thead>
          <tr
            style={{
              borderBottom: "1px solid var(--color-line)",
              backgroundColor: "var(--color-base)",
              color: "var(--color-muted-strong)",
              fontSize: 12,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            <th style={{ padding: "14px 20px" }}>Document</th>
            <th style={{ padding: "14px 16px" }}>Category</th>
            <th style={{ padding: "14px 16px" }}>Kind</th>
            <th style={{ padding: "14px 16px" }}>Size / Target</th>
            <th style={{ padding: "14px 16px" }}>Added</th>
            <th style={{ padding: "14px 20px", textAlign: "right" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc, idx) => {
            const catStyle = CATEGORY_COLORS[doc.category] || CATEGORY_COLORS.General;
            const isDownloading = downloadingId === doc.id;

            return (
              <tr
                key={doc.id}
                className="orgkit-doc-row"
                style={{
                  borderBottom: idx < documents.length - 1 ? "1px solid var(--color-line)" : "none",
                }}
              >
                {/* Title & Icon */}
                <td style={{ padding: "14px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        backgroundColor:
                          doc.kind === "file"
                            ? "color-mix(in srgb, var(--color-accent) 12%, transparent)"
                            : "color-mix(in srgb, #3b82f6 12%, transparent)",
                        color: doc.kind === "file" ? "var(--color-accent)" : "#2563eb",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {doc.kind === "file" ? <FileText size={18} /> : <LinkIcon size={18} />}
                    </div>
                    <span
                      style={{
                        fontWeight: 600,
                        color: "var(--color-ink)",
                        maxWidth: 280,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={doc.title}
                    >
                      {doc.title}
                    </span>
                  </div>
                </td>

                {/* Category */}
                <td style={{ padding: "14px 16px" }}>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: 10,
                      backgroundColor: catStyle.bg,
                      color: catStyle.text,
                    }}
                  >
                    {doc.category}
                  </span>
                </td>

                {/* Kind */}
                <td style={{ padding: "14px 16px", color: "var(--color-muted-strong)" }}>
                  {doc.kind === "file" ? "File" : "Link"}
                </td>

                {/* Size / Target */}
                <td style={{ padding: "14px 16px", color: "var(--color-muted-strong)" }}>
                  {doc.kind === "file" ? (
                    formatFileSize(doc.fileSize)
                  ) : (
                    <span
                      style={{
                        maxWidth: 160,
                        display: "block",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={doc.url || ""}
                    >
                      {doc.url ? new URL(doc.url).hostname : "—"}
                    </span>
                  )}
                </td>

                {/* Date Added */}
                <td style={{ padding: "14px 16px", color: "var(--color-muted-strong)" }}>
                  {formatDate(doc.createdAt)}
                </td>

                {/* Action Buttons */}
                <td style={{ padding: "14px 20px", textAlign: "right" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
                    {doc.kind === "file" ? (
                      <button
                        type="button"
                        disabled={isDownloading}
                        onClick={() => onDownload(doc)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "6px 12px",
                          borderRadius: 8,
                          border: "1px solid var(--color-line)",
                          backgroundColor: "var(--color-surface)",
                          color: "var(--color-ink)",
                          fontSize: 12.5,
                          fontWeight: 600,
                          cursor: isDownloading ? "wait" : "pointer",
                        }}
                        className="orgkit-doc-action-btn"
                      >
                        <Download size={14} />
                        <span>{isDownloading ? "..." : "Download"}</span>
                      </button>
                    ) : (
                      <a
                        href={doc.url || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "6px 12px",
                          borderRadius: 8,
                          border: "1px solid var(--color-line)",
                          backgroundColor: "var(--color-surface)",
                          color: "var(--color-ink)",
                          fontSize: 12.5,
                          fontWeight: 600,
                          textDecoration: "none",
                        }}
                        className="orgkit-doc-action-btn"
                      >
                        <ExternalLink size={14} />
                        <span>Open</span>
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => onDelete(doc)}
                      title="Delete document"
                      aria-label={`Delete ${doc.title}`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 30,
                        height: 30,
                        borderRadius: 8,
                        border: "none",
                        backgroundColor: "transparent",
                        color: "var(--color-muted)",
                        cursor: "pointer",
                      }}
                      className="orgkit-doc-delete-btn"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
