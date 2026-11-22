import React from "react";
import { Upload, Link as LinkIcon, Files } from "lucide-react";

interface DocumentsHeaderProps {
  orgName?: string;
  totalDocuments: number;
  onAddFile: () => void;
  onAddLink: () => void;
}

export function DocumentsHeader({
  orgName,
  totalDocuments,
  onAddFile,
  onAddLink,
}: DocumentsHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1
              style={{
                fontSize: "clamp(22px, 3vw, 28px)",
                fontWeight: 800,
                color: "var(--color-ink)",
                margin: 0,
                letterSpacing: "-0.02em",
              }}
            >
              Documents
            </h1>
            <span
              style={{
                backgroundColor: "color-mix(in srgb, var(--color-accent) 12%, transparent)",
                color: "var(--color-accent-strong)",
                fontSize: 12,
                fontWeight: 700,
                padding: "2px 10px",
                borderRadius: 20,
              }}
            >
              {totalDocuments} {totalDocuments === 1 ? "item" : "items"}
            </span>
          </div>

          <p
            style={{
              fontSize: 14,
              color: "var(--color-muted-strong)",
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            {orgName
              ? `Key records, files, and shared links for ${orgName}.`
              : "Key records, files, and shared links."}
          </p>
        </div>

        {/* Action Buttons */}
        <div
          className="orgkit-documents-header-actions"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <button
            type="button"
            onClick={onAddFile}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              backgroundColor: "var(--color-accent)",
              color: "#ffffff",
              padding: "10px 20px",
              borderRadius: 9999,
              fontSize: 13.5,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              boxShadow: "0 2px 8px color-mix(in srgb, var(--color-accent) 25%, transparent)",
              transition: "all 0.15s ease",
            }}
          >
            <Upload size={16} strokeWidth={2.2} />
            <span>Add file</span>
          </button>

          <button
            type="button"
            onClick={onAddLink}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              backgroundColor: "var(--color-surface)",
              color: "var(--color-ink)",
              padding: "10px 20px",
              borderRadius: 9999,
              fontSize: 13.5,
              fontWeight: 600,
              border: "1px solid var(--color-line)",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <LinkIcon size={16} strokeWidth={2.2} />
            <span>Add link</span>
          </button>
        </div>
      </div>
    </div>
  );
}
