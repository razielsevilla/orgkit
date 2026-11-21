"use client";

import { Check, Copy, Download } from "lucide-react";
import { secondaryBtn } from "./join-panel-styles";

export function JoinLinkInput({ joinUrl }: { joinUrl: string }) {
  return (
    <input
      readOnly
      value={joinUrl}
      aria-label="Join link"
      className="mj-link-input"
      onFocus={(e) => e.currentTarget.select()}
      style={{
        width: "100%",
        height: 46,
        padding: "0 14px",
        borderRadius: 12,
        border: "1px solid var(--color-line)",
        backgroundColor: "var(--color-base)",
        fontSize: 14,
        fontFamily: "inherit",
        color: "var(--color-ink)",
        boxSizing: "border-box",
      }}
    />
  );
}

export function JoinQrPreview({ qrUrl, orgName }: { qrUrl: string | null; orgName: string }) {
  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        justifyContent: "center",
        padding: 14,
        borderRadius: 18,
        border: "1px solid var(--color-line)",
        backgroundColor: "var(--color-surface)",
        boxSizing: "border-box",
      }}
    >
      {qrUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={qrUrl}
          alt={`QR code to join ${orgName}`}
          width={176}
          height={176}
          style={{ width: 176, height: 176, display: "block" }}
        />
      ) : (
        <div
          aria-hidden
          style={{ width: 176, height: 176, borderRadius: 12, backgroundColor: "var(--color-base)" }}
        />
      )}
    </div>
  );
}

export function JoinCopyAndSave({
  copied,
  onCopy,
  qrUrl,
  qrFileName,
}: {
  copied: boolean;
  onCopy: () => void;
  qrUrl: string | null;
  qrFileName: string;
}) {
  return (
    <div style={{ width: "100%", display: "flex", gap: 8 }}>
      <button
        type="button"
        onClick={onCopy}
        className="mj-btn"
        style={{ ...secondaryBtn, flex: 1, padding: "0 12px" }}
      >
        {copied ? <Check size={16} /> : <Copy size={16} />}
        {copied ? "Copied" : "Copy link"}
      </button>
      {qrUrl ? (
        <a
          href={qrUrl}
          download={qrFileName}
          className="mj-btn"
          style={{ ...secondaryBtn, flex: 1, padding: "0 12px" }}
        >
          <Download size={16} /> Save QR
        </a>
      ) : (
        <span style={{ flex: 1 }} />
      )}
    </div>
  );
}
