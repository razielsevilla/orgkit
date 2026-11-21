import { describe, expect, it } from "vitest";
import {
  FINISH_MS,
  MIN_LOADER_MS,
  MIN_TOTAL_LOADER_MS,
  STALE_LOADER_MS,
  remainingLoaderMs,
} from "@/src/components/workspace/frame/loader-timing";
import {
  markLoaderStart,
  peekLoaderElapsed,
  takeLoaderElapsed,
} from "@/src/components/workspace/frame/loader-clock";

describe("loader timing", () => {
  it("always shows the animation for 1.5 to 2 seconds, start to page shown", () => {
    expect(MIN_TOTAL_LOADER_MS).toBeGreaterThanOrEqual(1500);
    expect(MIN_TOTAL_LOADER_MS).toBeLessThanOrEqual(2100);
  });

  it("fills in the logo after a positive time", () => {
    expect(FINISH_MS).toBeGreaterThan(0);
  });

  it("waits out the rest of the minimum, and never goes negative", () => {
    expect(remainingLoaderMs(0)).toBe(MIN_LOADER_MS);
    expect(remainingLoaderMs(500)).toBe(MIN_LOADER_MS - 500);
    expect(remainingLoaderMs(MIN_LOADER_MS)).toBe(0);
    expect(remainingLoaderMs(5000)).toBe(0);
    expect(remainingLoaderMs(-100)).toBe(MIN_LOADER_MS);
  });
});

describe("loader clock", () => {
  it("measures from the first loader shown, and a second loader doesn't restart it", () => {
    takeLoaderElapsed(0);
    markLoaderStart(1000);
    markLoaderStart(1400);
    expect(peekLoaderElapsed(1700)).toBe(700);
    expect(takeLoaderElapsed(1700)).toBe(700);
  });

  it("starts fresh after a page change ends", () => {
    takeLoaderElapsed(0);
    markLoaderStart(1000);
    takeLoaderElapsed(2000);
    expect(peekLoaderElapsed(2100)).toBe(0);
    markLoaderStart(3000);
    expect(peekLoaderElapsed(3250)).toBe(250);
    takeLoaderElapsed(3250);
  });

  it("reports nothing when no loader was ever shown", () => {
    takeLoaderElapsed(0);
    expect(takeLoaderElapsed(9999)).toBe(0);
  });

  it("ignores a navigation that never finished", () => {
    takeLoaderElapsed(0);
    markLoaderStart(1000);
    expect(peekLoaderElapsed(1000 + STALE_LOADER_MS + 1)).toBe(0);
    markLoaderStart(1000 + STALE_LOADER_MS + 5000);
    expect(peekLoaderElapsed(1000 + STALE_LOADER_MS + 5100)).toBe(100);
    takeLoaderElapsed(0);
  });
});
