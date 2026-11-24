"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, Check, Info, Lock } from "lucide-react";
import type { SectionDefinition } from "@/src/lib/handover/handover-types";

interface HandoverSectionCardProps {
  definition: SectionDefinition;
  content: string;
  isReadOnly: boolean;
  onChange: (value: string) => void;
  defaultExpanded?: boolean;
}

export function HandoverSectionCard({
  definition,
  content,
  isReadOnly,
  onChange,
  defaultExpanded = false,
}: HandoverSectionCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const isFilled = Boolean(content && content.trim().length >= 10);

  return (
    <div
      className="orgkit-handover-accordion"
      style={{
        borderRadius: 20,
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-line)",
        overflow: "hidden",
        boxShadow: "0 2px 10px rgba(24, 24, 27, 0.02)",
      }}
    >
      {/* Accordion Header / Trigger */}
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        aria-expanded={isExpanded}
        style={{
          width: "100%",
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          backgroundColor: "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          outline: "none",
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "var(--color-ink)",
                letterSpacing: "-0.01em",
              }}
            >
              {definition.title}
            </span>

            {/* Filled / Empty indicator badge */}
            {isFilled ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: "var(--color-accent)",
                  backgroundColor: "color-mix(in srgb, var(--color-accent) 10%, transparent)",
                  padding: "2px 8px",
                  borderRadius: 9999,
                }}
              >
                <Check size={12} strokeWidth={2.4} />
                <span>Complete</span>
              </span>
            ) : (
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 500,
                  color: "var(--color-muted)",
                  backgroundColor: "var(--color-base)",
                  padding: "2px 8px",
                  borderRadius: 9999,
                }}
              >
                To fill
              </span>
            )}

            {isReadOnly && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                  fontSize: 11,
                  color: "var(--color-muted)",
                }}
                title="Locked for editing"
              >
                <Lock size={12} />
                <span>Locked</span>
              </span>
            )}
          </div>

          <span
            style={{
              fontSize: 13,
              color: "var(--color-muted)",
              lineHeight: 1.35,
            }}
          >
            {definition.subtitle}
          </span>
        </div>

        {/* Accordion Chevron */}
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            backgroundColor: "var(--color-base)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            color: "var(--color-ink)",
          }}
        >
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* Accordion Body */}
      {isExpanded && (
        <div
          style={{
            padding: "0 20px 20px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 14,
            borderTop: "1px solid var(--color-line)",
            paddingTop: 16,
            boxSizing: "border-box",
          }}
        >
          {/* Prompts Guide */}
          {!isReadOnly && definition.promptList.length > 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                padding: "10px 14px",
                borderRadius: 12,
                backgroundColor: "var(--color-base)",
                fontSize: 12.5,
                color: "var(--color-muted)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, color: "var(--color-ink)" }}>
                <Info size={14} color="var(--color-accent)" />
                <span>Key questions to cover:</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.5 }}>
                {definition.promptList.map((prompt, idx) => (
                  <li key={idx}>{prompt}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Text Area or Read-Only Render */}
          {isReadOnly ? (
            <div
              style={{
                padding: "12px 16px",
                borderRadius: 12,
                backgroundColor: "var(--color-base)",
                border: "1px solid var(--color-line)",
                minHeight: 80,
                fontSize: 14,
                lineHeight: 1.6,
                color: content.trim() ? "var(--color-ink)" : "var(--color-muted)",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {content.trim() || "No notes were provided for this section."}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <textarea
                value={content}
                onChange={(e) => onChange(e.target.value)}
                placeholder={definition.placeholder}
                rows={5}
                maxLength={5000}
                className="orgkit-textarea-field"
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "1px solid var(--color-line)",
                  backgroundColor: "var(--color-surface)",
                  color: "var(--color-ink)",
                  fontSize: 14,
                  lineHeight: 1.5,
                  outline: "none",
                  resize: "vertical",
                  boxSizing: "border-box",
                }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", fontSize: 11.5, color: "var(--color-muted)" }}>
                <span>{content.length} / 5000 characters</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
