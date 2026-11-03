import { describe, expect, it } from "vitest";
import {
  ARC_FINISH_MS,
  ARC_PERCENT_AT_MIN,
  MIN_LOADER_MS,
  MIN_TOTAL_LOADER_MS,
  STALE_LOADER_MS,
  arcProgress,
  finishProgress,
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

  it("closes the arc after a positive time", () => {
    expect(ARC_FINISH_MS).toBeGreaterThan(0);
  });

  it("waits out the rest of the minimum, and never goes negative", () => {
    expect(remainingLoaderMs(0)).toBe(MIN_LOADER_MS);
    expect(remainingLoaderMs(500)).toBe(MIN_LOADER_MS - 500);
    expect(remainingLoaderMs(MIN_LOADER_MS)).toBe(0);
    expect(remainingLoaderMs(5000)).toBe(0);
    expect(remainingLoaderMs(-100)).toBe(MIN_LOADER_MS);
  });
});

describe("arc progress", () => {
  it("starts at one end with nothing drawn", () => {
    expect(arcProgress(0)).toBe(0);
    expect(arcProgress(-50)).toBe(0);
  });

  it("travels at one steady speed until the minimum time", () => {
    const quarter = arcProgress(MIN_LOADER_MS / 4);
    const half = arcProgress(MIN_LOADER_MS / 2);
    expect(half).toBeCloseTo(quarter * 2, 5);
    expect(arcProgress(MIN_LOADER_MS)).toBe(ARC_PERCENT_AT_MIN);
  });

  it("keeps the same speed while closing, so the whole run is one steady pace", () => {
    const loadingSpeed = ARC_PERCENT_AT_MIN / MIN_LOADER_MS;
    const closingSpeed = (100 - ARC_PERCENT_AT_MIN) / ARC_FINISH_MS;
    expect(closingSpeed).toBeCloseTo(loadingSpeed, 1);
  });

  it("never moves backwards and never closes on its own while a page is slow", () => {
    let last = -1;
    for (let t = 0; t <= 30000; t += 250) {
      const p = arcProgress(t);
      expect(p).toBeGreaterThanOrEqual(last);
      expect(p).toBeLessThan(100);
      last = p;
    }
    // Still moving after the minimum, so a long wait doesn't look frozen
    expect(arcProgress(MIN_LOADER_MS + 2000)).toBeGreaterThan(arcProgress(MIN_LOADER_MS + 500));
  });

  it("closes into a full circle from wherever it got to", () => {
    for (const from of [ARC_PERCENT_AT_MIN, 90, 93]) {
      expect(finishProgress(from, 0)).toBe(from);
      expect(finishProgress(from, ARC_FINISH_MS / 2)).toBeCloseTo(from + (100 - from) / 2, 5);
      expect(finishProgress(from, ARC_FINISH_MS)).toBe(100);
      expect(finishProgress(from, ARC_FINISH_MS * 3)).toBe(100);
    }
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
