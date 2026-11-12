/**
 * Paging values arrive from the browser, so they are untrusted: anything that
 * is not a finite number is replaced, and the rest is made a whole number
 * inside the allowed range.
 */

/** A whole, non-negative row offset. Anything unusable becomes 0. */
export function normalizeOffset(value: number | undefined): number {
  return Number.isFinite(value) ? Math.max(Math.trunc(value!), 0) : 0;
}

/** A whole page size between 1 and `max`. Anything unusable becomes `fallback`. */
export function normalizeLimit(value: number | undefined, fallback: number, max: number): number {
  const limit = Number.isFinite(value) ? Math.trunc(value!) : fallback;
  return Math.min(Math.max(limit, 1), max);
}

/** How many pages `total` items make at `size` per page. An empty list is still one page. */
export function pageCount(total: number, size: number): number {
  return Math.max(1, Math.ceil(total / size));
}

/**
 * The page buttons to show: always the first and last page, the current page
 * with `around` neighbours on each side, and "gap" where pages are skipped.
 * A gap that would hide a single page shows that page instead.
 *
 *   pageNumbers(1, 3)   → [1, 2, 3]
 *   pageNumbers(6, 12)  → [1, "gap", 5, 6, 7, "gap", 12]
 */
export function pageNumbers(current: number, total: number, around = 1): (number | "gap")[] {
  const wanted = new Set([1, total]);
  for (let p = current - around; p <= current + around; p++) {
    if (p >= 1 && p <= total) wanted.add(p);
  }

  const pages = [...wanted].sort((a, b) => a - b);
  const result: (number | "gap")[] = [];
  pages.forEach((page, i) => {
    const previous = pages[i - 1];
    if (previous !== undefined && page - previous === 2) result.push(previous + 1);
    else if (previous !== undefined && page - previous > 2) result.push("gap");
    result.push(page);
  });
  return result;
}
