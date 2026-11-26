"use client";

import React from "react";
import { Download, ExternalLink, FileText, Link as LinkIcon, Trash2 } from "lucide-react";
import type { WorkspaceDocument } from "@/src/app/(workspace)/documents-actions";

interface DocumentMobileCardProps {
  document: WorkspaceDocument;
  onDownload: (doc: WorkspaceDocument) => void;
  onDelete: (doc: WorkspaceDocument) => void;
  isDownloading?: boolean;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  Finance: { bg: "#ecfdf5", text: "#065f46" },
  Legal: { bg: "#eff6ff", text: "#1e40af" },
  Templates: { bg: "#fef3c7", text: "#92400e" },
  Contacts: { bg: "#f3e8ff", text: "#6b21a8" },
  General: { bg: "var(--color-base)", text: "var(--color-muted-strong)" },
};

function formatFileSize(bytes: number | null): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentMobileCard({
  document,
  onDownload,
  onDelete,
  isDownloading = false,
}: DocumentMobileCardProps) {
  const catStyle = CATEGORY_COLORS[document.category] || CATEGORY_COLORS.General;

  return (
    <div
      data-tour="documents-list"
      className="orgkit-doc-card"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: 16,
        backgroundColor: "var(--color-surface)",
        borderRadius: 16,
        border: "1px solid var(--color-line)",
        boxSizing: "border-box",
        width: "100%",
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, minWidth: 0 }}>
        {/* Kind Icon */}
        <div
          style={{
            flexShrink: 0,
            width: 38,
            height: 38,
            borderRadius: 10,
            backgroundColor:
              document.kind === "file"
                ? "color-mix(in srgb, var(--color-accent) 12%, transparent)"
                : "color-mix(in srgb, #3b82f6 12%, transparent)",
            color: document.kind === "file" ? "var(--color-accent)" : "#2563eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {document.kind === "file" ? (
            <FileText size={20} strokeWidth={2} />
          ) : (
            <LinkIcon size={20} strokeWidth={2} />
          )}
        </div>

        {/* Title and Metadata */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 0 }}>
          <h3
            style={{
              fontSize: 14.5,
              fontWeight: 700,
              color: "var(--color-ink)",
              margin: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={document.title}
          >
            {document.title}
          </h3>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: 10,
                backgroundColor: catStyle.bg,
                color: catStyle.text,
              }}
            >
              {document.category}
            </span>

            {document.kind === "file" && document.fileSize && (
              <span style={{ fontSize: 12, color: "var(--color-muted-strong)" }}>
                {formatFileSize(document.fileSize)}
              </span>
            )}

            {document.kind === "link" && (
              <span style={{ fontSize: 12, color: "var(--color-muted-strong)" }}>External link</span>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons Row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          borderTop: "1px solid var(--color-line)",
          paddingTop: 10,
          marginTop: 2,
        }}
      >
        {document.kind === "file" ? (
          <button
            type="button"
            disabled={isDownloading}
            onClick={() => onDownload(document)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 12px",
              borderRadius: 8,
              border: "1px solid var(--color-line)",
              backgroundColor: "var(--color-base)",
              color: "var(--color-ink)",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: isDownloading ? "wait" : "pointer",
            }}
          >
            <Download size={14} />
            <span>{isDownloading ? "Preparing..." : "Download"}</span>
          </button>
        ) : (
          <a
            href={document.url || "#"}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 12px",
              borderRadius: 8,
              border: "1px solid var(--color-line)",
              backgroundColor: "var(--color-base)",
              color: "var(--color-ink)",
              fontSize: 12.5,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            <ExternalLink size={14} />
            <span>Open link</span>
          </a>
        )}

        <button
          type="button"
          onClick={() => onDelete(document)}
          title="Delete document"
          aria-label={`Delete ${document.title}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 34,
            height: 34,
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
    </div>
  );
}
