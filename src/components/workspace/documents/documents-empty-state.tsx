import React from "react";
import { FolderArchive, Link as LinkIcon, Upload } from "lucide-react";

interface DocumentsEmptyStateProps {
  onAddFile: () => void;
  onAddLink: () => void;
  isFiltered?: boolean;
  onClearFilter?: () => void;
}

export function DocumentsEmptyState({
  onAddFile,
  onAddLink,
  isFiltered = false,
  onClearFilter,
}: DocumentsEmptyStateProps) {
  if (isFiltered) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 24px",
          textAlign: "center",
          backgroundColor: "var(--color-surface)",
          borderRadius: 20,
          border: "1px dashed var(--color-line)",
          gap: 12,
        }}
      >
        <FolderArchive size={36} color="var(--color-muted)" strokeWidth={1.75} />
        <h3
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: "var(--color-ink)",
            margin: 0,
          }}
        >
          No matching documents found
        </h3>
        <p
          style={{
            fontSize: 13.5,
            color: "var(--color-muted-strong)",
            margin: 0,
            maxWidth: 380,
          }}
        >
          Try selecting a different category or clearing your search query.
        </p>
        {onClearFilter && (
          <button
            type="button"
            onClick={onClearFilter}
            style={{
              marginTop: 6,
              background: "none",
              border: "none",
              color: "var(--color-accent)",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              padding: "4px 8px",
            }}
          >
            Clear filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "clamp(48px, 6vw, 72px) clamp(24px, 4vw, 48px)",
        textAlign: "center",
        backgroundColor: "var(--color-surface)",
        borderRadius: 24,
        border: "1px solid var(--color-line)",
        boxShadow: "0 20px 50px rgba(24, 24, 27, 0.04)",
        width: "100%",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {/* Decorative Geometric Background Circles */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: -60,
          left: -60,
          width: 220,
          height: 220,
          borderRadius: "50%",
          backgroundColor: "color-mix(in srgb, var(--color-accent) 4%, transparent)",
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          bottom: -80,
          right: -80,
          width: 260,
          height: 260,
          borderRadius: "50%",
          backgroundColor: "color-mix(in srgb, var(--color-accent) 5%, transparent)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          backgroundColor: "color-mix(in srgb, var(--color-accent) 10%, transparent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--color-accent)",
          marginBottom: 18,
          boxShadow: "0 4px 16px color-mix(in srgb, var(--color-accent) 15%, transparent)",
        }}
      >
        <FolderArchive size={28} strokeWidth={2.2} />
      </div>

      <h2
        style={{
          fontSize: "clamp(18px, 2.5vw, 22px)",
          fontWeight: 800,
          color: "var(--color-ink)",
          margin: "0 0 10px 0",
          letterSpacing: "-0.015em",
        }}
      >
        Keep key documents and links in one place
      </h2>

      <p
        style={{
          fontSize: 14,
          lineHeight: 1.6,
          color: "var(--color-muted-strong)",
          maxWidth: 480,
          margin: "0 0 24px 0",
        }}
      >
        Store constitutions, bank forms, permits, templates, and shared Drive links here so the next
        leadership team doesn&apos;t have to hunt for them in personal accounts and chats.
      </p>

      {/* Categories guidance pills */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 8,
          marginBottom: 28,
        }}
      >
        {["Finance", "Legal", "Templates", "Contacts", "General"].map((cat) => (
          <span
            key={cat}
            style={{
              fontSize: 12,
              fontWeight: 500,
              padding: "4px 10px",
              borderRadius: 12,
              backgroundColor: "var(--color-base)",
              color: "var(--color-muted-strong)",
              border: "1px solid var(--color-line)",
            }}
          >
            {cat}
          </span>
        ))}
      </div>

      {/* Action buttons */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          justifyContent: "center",
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
            transition: "opacity 0.15s ease",
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
            transition: "background-color 0.15s ease",
          }}
        >
          <LinkIcon size={16} strokeWidth={2.2} />
          <span>Add link</span>
        </button>
      </div>
    </div>
  );
}
