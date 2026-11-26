"use client";

import { useLayoutEffect, useState } from "react";
import { rectsEqual, type Rect } from "@/src/lib/tour/tour-placement";

/** What the tour knows about the thing it is pointing at */
export type TourTarget =
  | { status: "none" }
  /** Looking for it: the page may still be loading */
  | { status: "searching" }
  /** Not on screen after waiting: an empty page, a role without it, a hidden control */
  | { status: "missing" }
  | { status: "found"; rect: Rect; radius: number };

/** How long to wait for a page to draw its controls before saying they are missing */
const SEARCH_MS = 3000;

/** The first element with this tour name that is actually on screen (a hidden desktop/phone twin does not count) */
function findVisible(names: readonly string[]): HTMLElement | null {
  for (const name of names) {
    for (const el of document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`)) {
      const box = el.getBoundingClientRect();
      if (box.width > 0 && box.height > 0 && getComputedStyle(el).visibility !== "hidden") return el;
    }
  }
  return null;
}

function scrollParent(el: HTMLElement): HTMLElement | null {
  for (let node = el.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if ((overflowY === "auto" || overflowY === "scroll") && node.scrollHeight > node.clientHeight + 1) return node;
  }
  return null;
}

/**
 * Brings the element into the part of the screen the card does not cover. The
 * pages scroll inside their own containers, so this scrolls the nearest one.
 */
function scrollIntoBand(el: HTMLElement, reserveBottom: number) {
  const top = 72; // clear of the phone's top bar
  const bottom = window.innerHeight - reserveBottom - 16;
  const box = el.getBoundingClientRect();
  if (box.top >= top && box.bottom <= bottom) return;

  const container = scrollParent(el);
  if (!container) return;
  const room = bottom - top;
  // A tall element lines up with the top; a short one is centred in the free band
  const wanted = box.height >= room ? top : top + (room - box.height) / 2;
  container.scrollTop += box.top - wanted;
}

/**
 * Finds the element(s) named by `data-tour` and follows them: it waits for a page
 * to draw them, scrolls them into view once, then keeps their position up to date
 * as the page scrolls, resizes or changes. `key` identifies the beat, so a new
 * beat starts a new search. `reserveBottom` is how much of the bottom of the screen the card covers
 * (on a phone), so the target is scrolled above it.
 */
export function useTourTarget(names: readonly string[] | undefined, key: string, reserveBottom: number): TourTarget {
  // The result is stored with the key it belongs to, so a new beat reads "searching"
  // until its own result arrives, without setting state when the beat changes
  const [result, setResult] = useState<{ key: string; target: TourTarget } | null>(null);
  const nameList = names?.join("|") ?? "";

  // A layout effect, not a plain one: it runs before the browser paints, so a target that is already
  // on the page is found and the card is placed in the same frame as the click, with no flash and no wait
  useLayoutEffect(() => {
    if (!nameList) return;
    const list = nameList.split("|");
    const started = performance.now();
    let el: HTMLElement | null = null;
    let radius = 12;
    let last: Rect | null = null;
    let frame = 0;
    let observer: ResizeObserver | null = null;
    let stopped = false;
    // "searching" and "missing" carry no data, so say each only once until something changes
    let waiting: "searching" | "missing" | null = null;

    const publish = (target: TourTarget) => setResult({ key, target });

    const measure = () => {
      if (!el) return;
      const box = el.getBoundingClientRect();
      const rect: Rect = { top: box.top, left: box.left, width: box.width, height: box.height };
      if (rectsEqual(rect, last)) return;
      last = rect;
      waiting = null;
      publish({ status: "found", rect, radius });
    };

    const search = () => {
      frame = 0;
      if (stopped) return;
      const found = findVisible(list);
      if (found && found.isConnected) {
        if (found !== el) {
          el = found;
          last = null;
          const parsed = parseFloat(getComputedStyle(found).borderTopLeftRadius);
          radius = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 0), 28) : 12;
          scrollIntoBand(found, reserveBottom);
          observer?.disconnect();
          observer = new ResizeObserver(measure);
          observer.observe(found);
        }
        measure();
      } else {
        if (el) {
          el = null;
          last = null;
          observer?.disconnect();
        }
        const status = performance.now() - started > SEARCH_MS ? "missing" : "searching";
        if (waiting !== status) {
          waiting = status;
          publish({ status });
        }
      }
    };
    const schedule = () => {
      if (!frame && !stopped) frame = requestAnimationFrame(search);
    };

    // The page draws in and out (suspense, tabs, empty states): look again when it changes,
    // and again at the deadline so "missing" is said even if nothing changes
    const mutations = new MutationObserver(schedule);
    mutations.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);
    const deadline = window.setTimeout(schedule, SEARCH_MS + 50);
    // First look right now (the page is usually already there), then keep watching
    search();

    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      window.clearTimeout(deadline);
      mutations.disconnect();
      observer?.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
    };
  }, [nameList, key, reserveBottom]);

  if (!nameList) return { status: "none" };
  return result?.key === key ? result.target : { status: "searching" };
}
