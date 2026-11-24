import React from "react";
import { EventsLogSkeleton } from "@/src/components/workspace/events-log/events-log-skeleton";

export default function EventsLogLoading() {
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
      <EventsLogSkeleton />
    </div>
  );
}
