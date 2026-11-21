"use client";

import { useEffect, useState } from "react";
import { takeLoaderElapsed } from "./loader-clock";
import { FINISH_MS, REVEAL_FADE_MS, remainingLoaderMs } from "./loader-timing";
import { WorkspaceContentLoader } from "./workspace-content-loader";

type Phase = "covering" | "finishing" | "revealing" | "done";

/**
 * Wraps a workspace screen's content. When the content arrives it is held back
 * behind the loading animation until the animation has shown for its minimum
 * time (see loader-timing.ts), then the logo fills in solid and the
 * content fades in. The animation carries on from the loader that was showing
 * while the data loaded, so it doesn't restart.
 *
 * If scripts fail to run, a CSS timeout (.orgkit-reveal-*) shows the content
 * anyway, so a page is never left hidden.
 */
export function PageReveal({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<Phase>("covering");

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Read the clock in a timer, not during render, so it is read exactly once
    timers.push(
      setTimeout(() => {
        const wait = remainingLoaderMs(takeLoaderElapsed());
        timers.push(setTimeout(() => setPhase("finishing"), wait));
        timers.push(setTimeout(() => setPhase("revealing"), wait + FINISH_MS));
        timers.push(setTimeout(() => setPhase("done"), wait + FINISH_MS + REVEAL_FADE_MS));
      }, 0)
    );

    return () => timers.forEach(clearTimeout);
  }, []);

  const held = phase === "covering" || phase === "finishing";

  return (
    <div style={{ position: "relative", height: "100%" }}>
      <div
        className={held ? "orgkit-reveal-content" : undefined}
        style={{
          height: "100%",
          visibility: held ? "hidden" : "visible",
          opacity: held ? 0 : 1,
          transition: `opacity ${REVEAL_FADE_MS}ms ease`,
        }}
      >
        {children}
      </div>

      {phase !== "done" && (
        <div
          className="orgkit-reveal-overlay"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 5,
            pointerEvents: "none",
            opacity: phase === "revealing" ? 0 : 1,
            transition: `opacity ${REVEAL_FADE_MS}ms ease`,
          }}
        >
          <WorkspaceContentLoader finishing={phase !== "covering"} />
        </div>
      )}
    </div>
  );
}
