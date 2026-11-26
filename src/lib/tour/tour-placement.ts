/**
 * Geometry for the officer tour: where the dim panels go around the thing being
 * pointed at, and where the card goes beside it. Pure numbers in, numbers out
 * (no DOM), so it can be tested. All coordinates are viewport pixels, the same
 * space as getBoundingClientRect() and `position: fixed`.
 */

export interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface Size {
  width: number;
  height: number;
}

export type Side = "right" | "left" | "bottom" | "top";

/** How far the spotlight reaches beyond the element, so its edge is not cut off */
export const SPOTLIGHT_PAD = 8;

export function expandRect(rect: Rect, pad: number): Rect {
  return { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 };
}

export function rectsEqual(a: Rect | null, b: Rect | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    Math.abs(a.top - b.top) < 0.5 &&
    Math.abs(a.left - b.left) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5 &&
    Math.abs(a.height - b.height) < 0.5
  );
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));

/**
 * The four dim panels around a hole: top, bottom, left, right. Always four, in
 * that order, so each one can animate from where it was. With no hole, the top
 * panel covers the whole screen and the others are empty.
 */
export function dimPanels(hole: Rect | null, viewport: Size): [Rect, Rect, Rect, Rect] {
  if (!hole) {
    const empty = (top: number, left: number): Rect => ({ top, left, width: 0, height: 0 });
    return [{ top: 0, left: 0, width: viewport.width, height: viewport.height }, empty(viewport.height, 0), empty(0, 0), empty(0, viewport.width)];
  }
  // Keep the hole inside the screen, so a target that is partly scrolled out cannot make a negative panel
  const top = clamp(hole.top, 0, viewport.height);
  const bottom = clamp(hole.top + hole.height, 0, viewport.height);
  const left = clamp(hole.left, 0, viewport.width);
  const right = clamp(hole.left + hole.width, 0, viewport.width);
  return [
    { top: 0, left: 0, width: viewport.width, height: top },
    { top: bottom, left: 0, width: viewport.width, height: viewport.height - bottom },
    { top, left: 0, width: left, height: bottom - top },
    { top, left: right, width: viewport.width - right, height: bottom - top },
  ];
}

export interface CardPlacement {
  top: number;
  left: number;
  /** Where it ended up. "inside" means the target is too big to sit beside, so the card overlays it */
  side: Side | "inside";
}

const OPPOSITE: Record<Side, Side> = { right: "left", left: "right", top: "bottom", bottom: "top" };

/**
 * Where to put the card for a target. It tries the preferred side first, then
 * the opposite side, then the other two, and takes the first where the whole
 * card fits on screen. If none fits (a target as big as the page), the card
 * overlays the bottom of the target.
 */
export function placeCard({
  target,
  card,
  viewport,
  preferred = "bottom",
  gap = 16,
  margin = 12,
}: {
  target: Rect;
  card: Size;
  viewport: Size;
  preferred?: Side;
  gap?: number;
  margin?: number;
}): CardPlacement {
  const targetRight = target.left + target.width;
  const targetBottom = target.top + target.height;
  const centerX = target.left + target.width / 2;
  const centerY = target.top + target.height / 2;

  const maxLeft = viewport.width - card.width - margin;
  const maxTop = viewport.height - card.height - margin;

  const at: Record<Side, () => { top: number; left: number; fits: boolean }> = {
    right: () => ({
      left: targetRight + gap,
      top: clamp(centerY - card.height / 2, margin, maxTop),
      fits: targetRight + gap + card.width <= viewport.width - margin,
    }),
    left: () => ({
      left: target.left - gap - card.width,
      top: clamp(centerY - card.height / 2, margin, maxTop),
      fits: target.left - gap - card.width >= margin,
    }),
    bottom: () => ({
      left: clamp(centerX - card.width / 2, margin, maxLeft),
      top: targetBottom + gap,
      fits: targetBottom + gap + card.height <= viewport.height - margin,
    }),
    top: () => ({
      left: clamp(centerX - card.width / 2, margin, maxLeft),
      top: target.top - gap - card.height,
      fits: target.top - gap - card.height >= margin,
    }),
  };

  const sides = Array.from(new Set<Side>([preferred, OPPOSITE[preferred], "bottom", "top", "right", "left"]));
  for (const side of sides) {
    const spot = at[side]();
    if (spot.fits) return { top: spot.top, left: spot.left, side };
  }

  // Nowhere beside it: sit over the bottom of the target, kept on screen
  const visibleLeft = Math.max(target.left, 0);
  const visibleRight = Math.min(targetRight, viewport.width);
  const visibleBottom = Math.min(targetBottom, viewport.height);
  return {
    left: clamp((visibleLeft + visibleRight) / 2 - card.width / 2, margin, maxLeft),
    top: clamp(visibleBottom - card.height - 24, margin, maxTop),
    side: "inside",
  };
}
