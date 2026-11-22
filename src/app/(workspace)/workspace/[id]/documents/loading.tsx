import React from "react";
import { DocumentsSkeleton } from "@/src/components/workspace/documents/documents-skeleton";

export default function DocumentsLoading() {
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
      <DocumentsSkeleton />
    </div>
  );
}
