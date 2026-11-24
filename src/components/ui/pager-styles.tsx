/**
 * Shared by the Members and Dues pagers. On a phone (640px and below) the row of
 * numbered pages is replaced by "Page 2 of 5" between the two arrows: at 44px
 * each, seven page buttons plus two arrows are wider than a 360px screen.
 *
 * Add `orgkit-pager-num` to each numbered button and each gap, and render one
 * `<PagerStatus />` between the arrows. The numbers stay in the markup (for
 * tests and screen readers on wider screens); CSS decides which shows.
 */
export function PagerStyles() {
  return (
    <style>{`
      .orgkit-pager-status {
        display: none;
        padding: 0 8px;
        font-size: 13px;
        font-weight: 600;
        color: var(--color-muted-strong);
        white-space: nowrap;
      }
      @media (max-width: 640px) {
        .orgkit-pager-num { display: none !important; }
        .orgkit-pager-status { display: inline; }
      }
    `}</style>
  );
}

export function PagerStatus({ page, pageCount }: { page: number; pageCount: number }) {
  return (
    <span className="orgkit-pager-status" aria-live="polite">
      Page {page} of {pageCount}
    </span>
  );
}
