"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { PanelLeft } from "lucide-react";
import { workspacePath } from "@/src/lib/routes";

interface BrandHeaderProps {
  rawId: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function BrandHeader({ rawId, isCollapsed, onToggleCollapse }: BrandHeaderProps) {
  const [isBrandHovered, setIsBrandHovered] = useState(false);

  return !isCollapsed ? (
    /* Expanded: Logo on left, Toggle on right */
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 16,
        height: 36,
      }}
    >
      <Link
        href={workspacePath(rawId)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          textDecoration: "none",
        }}
        aria-label="OrgKit Home"
      >
        <Image
          src="/orgkit-text-logo.png"
          alt="OrgKit"
          width={132}
          height={32}
          priority
          style={{
            height: 30,
            width: "auto",
            objectFit: "contain",
            display: "block",
          }}
        />
      </Link>

      <button
        type="button"
        onClick={onToggleCollapse}
        className="orgkit-sidebar-toggle"
        title="Collapse sidebar"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 32,
          height: 32,
          borderRadius: 8,
          border: "none",
          backgroundColor: "transparent",
          color: "var(--color-muted)",
          cursor: "pointer",
          transition: "all 0.15s ease",
        }}
      >
        <PanelLeft size={18} strokeWidth={1.8} />
      </button>
    </div>
  ) : (
    /* Collapsed: Show OrgKit icon by default; switch to PanelLeft open icon ONLY when hovered */
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        marginBottom: 16,
        height: 36,
      }}
    >
      <button
        type="button"
        onClick={onToggleCollapse}
        onMouseEnter={() => setIsBrandHovered(true)}
        onMouseLeave={() => setIsBrandHovered(false)}
        className="orgkit-collapsed-brand-btn"
        title="Expand sidebar"
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          border: "none",
          backgroundColor: isBrandHovered ? "var(--color-base)" : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          padding: 0,
          transition: "background-color 0.15s ease",
        }}
      >
        {isBrandHovered ? (
          <PanelLeft size={19} strokeWidth={1.8} color="var(--color-muted)" />
        ) : (
          <Image
            src="/orgkit-logo.png"
            alt="OrgKit"
            width={26}
            height={26}
            style={{
              width: 24,
              height: 24,
              objectFit: "contain",
              display: "block",
            }}
          />
        )}
      </button>
    </div>
  );
}
