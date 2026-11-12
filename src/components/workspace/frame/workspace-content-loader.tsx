"use client";

import React from "react";
import { Card } from "@/src/components/ui/card";
import { FloatingIconsDecor } from "@/src/components/decor/floating-decor";
import { FlowLoader } from "./flow-loader";

/**
 * Main loading animation for workspace screens:
 * Centered white card with OrgKit flowing logo mark and floating icons decor.
 */
export function WorkspaceContentLoader({
  finishing = false,
}: {
  finishing?: boolean;
}) {
  return (
    <div
      style={{
        position: "relative",
        height: "100%",
        minHeight: "100%",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 16px",
        boxSizing: "border-box",
      }}
    >
      <div
        className="orgkit-card-wrapper"
        style={{
          position: "relative",
          zIndex: 10,
          width: "100%",
          maxWidth: 460,
          boxSizing: "border-box",
          animation: "cardPopout 0.45s cubic-bezier(0.16, 1.25, 0.38, 1) both",
        }}
      >
        <FloatingIconsDecor />

        <Card maxWidth={460} padding="48px 36px">
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 180,
            }}
          >
            <FlowLoader finishing={finishing} />
          </div>
        </Card>
      </div>
    </div>
  );
}
