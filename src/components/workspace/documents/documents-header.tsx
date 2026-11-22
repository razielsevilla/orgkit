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
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1
              tabIndex={-1}
              style={{
                outline: "none",
                fontSize: "clamp(26px, 2.6vw, 34px)",
                fontWeight: 800,
                color: "var(--color-ink)",
                letterSpacing: "-0.025em",
                margin: 0,
                lineHeight: 1.15,
              }}
            >
              Documents
            </h1>
            <span
              style={{
                backgroundColor: "color-mix(in srgb, var(--color-accent) 12%, transparent)",
                color: "var(--color-accent-strong)",
                fontSize: 12.5,
                fontWeight: 700,
                padding: "2px 10px",
                borderRadius: 999,
              }}
            >
              {totalDocuments} {totalDocuments === 1 ? "item" : "items"}
            </span>
          </div>

          <p
            style={{
              margin: "6px 0 0 0",
              fontSize: 14,
              color: "var(--color-muted)",
              lineHeight: 1.4,
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
