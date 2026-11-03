"use client";

import { Link2Off, RefreshCw } from "lucide-react";
import { primaryBtn, secondaryBtn } from "./join-panel-styles";

export type Confirming = "off" | "regenerate" | null;

// Confirm box, or the New link / Turn off buttons
export function JoinLinkControls({
  confirming,
  pending,
  onConfirm,
  onSetConfirming,
}: {
  confirming: Confirming;
  pending: boolean;
  onConfirm: (action: "off" | "regenerate") => void;
  onSetConfirming: (value: Confirming) => void;
}) {
  return confirming ? (
    <div
      style={{
        width: "100%",
        padding: 14,
        borderRadius: 16,
        border: "1px solid var(--color-line)",
        backgroundColor: "var(--color-base)",
        boxSizing: "border-box",
      }}
    >
      <p style={{ margin: "0 0 10px 0", fontSize: 14, color: "var(--color-ink)" }}>
        {confirming === "off"
          ? "Turn off the link? The current link and QR will stop working."
          : "Make a new link? The old link and QR will stop working."}
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={() => onConfirm(confirming)}
          disabled={pending}
          className="mj-btn mj-primary"
          style={{ ...primaryBtn, flex: 1, padding: "0 12px" }}
        >
          {confirming === "off" ? "Turn off" : "Make new link"}
        </button>
        <button
          type="button"
          onClick={() => onSetConfirming(null)}
          className="mj-btn"
          style={{ ...secondaryBtn, flex: 1, padding: "0 12px" }}
        >
          Cancel
        </button>
      </div>
    </div>
  ) : (
    <div style={{ width: "100%", display: "flex", gap: 8 }}>
      <button
        type="button"
        onClick={() => onSetConfirming("regenerate")}
        disabled={pending}
        className="mj-btn"
        style={{ ...secondaryBtn, flex: 1, padding: "0 12px" }}
      >
        <RefreshCw size={16} /> New link
      </button>
      <button
        type="button"
        onClick={() => onSetConfirming("off")}
        disabled={pending}
        className="mj-btn"
        style={{ ...secondaryBtn, flex: 1, padding: "0 12px" }}
      >
        <Link2Off size={16} /> Turn off
      </button>
    </div>
  );
}

export function JoinTurnOnButton({
  pending,
  siteUrl,
  onTurnOn,
}: {
  pending: boolean;
  siteUrl: string | null;
  onTurnOn: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onTurnOn}
      disabled={pending || !siteUrl}
      className="mj-btn mj-primary"
      style={primaryBtn}
    >
      {pending ? "Turning on…" : "Turn on link"}
    </button>
  );
}
