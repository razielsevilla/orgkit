"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { markLoaderStart, peekLoaderElapsed } from "./loader-clock";
import { ARC_FINISH_MS, arcProgress, finishProgress } from "./loader-timing";

/**
 * The "arc" loading animation (see loader-variant.ts). The OrgKit mark in a
 * soft emerald disc, with an emerald arc around it that is anchored at the top
 * and whose other end travels clockwise round the ring until the two ends meet
 * (it closes the circle when `finishing`), and rings spreading out like the
 * circles in the backdrop. It fills only the content area, so the sidebar stays
 * still. The look lives in globals.css (.orgkit-loader*); the arc's length comes
 * from loader-timing.ts, driven by elapsed time.
 *
 * Every instance carries on from where the last one stopped, so the animation
 * doesn't restart when one loader is swapped for another.
 */
export function ArcLoader({ finishing = false }: { finishing?: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const arcRef = useRef<SVGCircleElement>(null);
  const progressRef = useRef(0);
  const finishRef = useRef<{ from: number; at: number } | null>(null);

  // The arc closes from wherever it has got to when the page is ready
  useEffect(() => {
    if (finishing && !finishRef.current) {
      finishRef.current = { from: progressRef.current, at: performance.now() };
    }
  }, [finishing]);

  useEffect(() => {
    markLoaderStart();
    const base = peekLoaderElapsed();
    const mountedAt = performance.now();
    // A negative delay starts the rings and the fade-in part-way through
    rootRef.current?.style.setProperty("--loader-offset", `-${Math.round(base)}ms`);

    let frame = 0;
    const tick = (now: number) => {
      const closing = finishRef.current;
      const percent = closing
        ? finishProgress(closing.from, now - closing.at)
        : arcProgress(base + (now - mountedAt));
      progressRef.current = percent;
      // The arc is drawn on a path of length 100: the offset is how much is hidden
      arcRef.current?.setAttribute("stroke-dashoffset", String(100 - percent));
      if (!closing || now - closing.at < ARC_FINISH_MS) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      ref={rootRef}
      className={`orgkit-loader${finishing ? " is-finishing" : ""}`}
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
      <div style={{ position: "relative", width: 88, height: 88 }}>
        <span className="orgkit-loader-ring" aria-hidden="true" />
        <span className="orgkit-loader-ring" aria-hidden="true" />
        <span className="orgkit-loader-ring" aria-hidden="true" />

        {/* The arc: a faint full track, and a bright emerald arc drawn along it from the top, clockwise */}
        <svg
          aria-hidden="true"
          width={112}
          height={112}
          viewBox="0 0 112 112"
          fill="none"
          style={{ position: "absolute", top: -12, left: -12, transform: "rotate(-90deg)" }}
        >
          <circle cx="56" cy="56" r="54" stroke="color-mix(in srgb, var(--color-accent) 14%, transparent)" strokeWidth="3" />
          <circle
            ref={arcRef}
            cx="56"
            cy="56"
            r="54"
            pathLength="100"
            stroke="var(--color-accent)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="100 100"
            strokeDashoffset={100}
          />
        </svg>

        <div
          style={{
            position: "relative",
            width: 88,
            height: 88,
            borderRadius: "50%",
            backgroundColor: "var(--color-surface)",
            border: "1px solid color-mix(in srgb, var(--color-accent) 18%, transparent)",
            boxShadow: "0 12px 32px color-mix(in srgb, var(--color-accent) 14%, transparent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxSizing: "border-box",
          }}
        >
          <Image
            className="orgkit-loader-mark"
            src="/orgkit-logo.png"
            alt=""
            width={60}
            height={40}
            priority
            style={{ width: 56, height: "auto", display: "block" }}
          />
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
