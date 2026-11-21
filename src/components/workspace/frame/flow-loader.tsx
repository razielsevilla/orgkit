"use client";

import { useRef } from "react";
import { useLoaderOffset } from "./use-loader-offset";

/**
 * The "flow" loading animation: the OrgKit logo, drawn
 * as a faint ghost, with emerald flowing up through its shape again and again.
 * At any moment the lower part is colored and the top is clear, then the color
 * has travelled to the top and the bottom has emptied, and it carries on. When
 * the page is ready (`finishing`) the whole logo fills in solid, then the page
 * fades in.
 *
 * It is built from the logo's own silhouette (public/orgkit-logo-mask.png) used
 * as a mask, over a tall strip of gradient that slides upward. Only a transform
 * moves, so it stays smooth. The look lives in globals.css (.orgkit-flow*); the
 * speed is --flow-duration there.
 */
export function FlowLoader({ finishing = false }: { finishing?: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);
  useLoaderOffset(rootRef);

  return (
    <div
      ref={rootRef}
      className={`orgkit-loader orgkit-flow${finishing ? " is-finishing" : ""}`}
      role="status"
      aria-live="polite"
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div className="orgkit-flow-stage">
        <div className="orgkit-flow-glow" aria-hidden="true" />
        <div className="orgkit-flow-layer orgkit-flow-ghost" aria-hidden="true" />
        <div className="orgkit-flow-layer" aria-hidden="true">
          <div className="orgkit-flow-strip" />
        </div>
        <div className="orgkit-flow-layer orgkit-flow-solid" aria-hidden="true" />
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
