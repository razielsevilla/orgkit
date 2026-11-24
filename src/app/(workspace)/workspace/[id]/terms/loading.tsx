import React from "react";
import { TermsSkeleton } from "@/src/components/workspace/terms/terms-skeleton";

export default function TermsLoading() {
  return (
    <div
      style={{
        height: "100%",
        overflowY: "auto",
        padding: "36px clamp(16px, 4vw, 36px) 60px clamp(16px, 4vw, 36px)",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
      }}
    >
      <TermsSkeleton />
    </div>
  );
}
