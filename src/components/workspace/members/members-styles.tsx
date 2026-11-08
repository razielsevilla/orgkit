export function MembersStyles() {
  return (
    <style>{`
      /* Floating icons hide below 1200px to avoid overlapping cards */
      @media (max-width: 1200px) {
        .orgkit-floating-decor {
          display: none !important;
        }
      }

      /* Desktop table is default; mobile cards are hidden on desktop */
      .orgkit-members-desktop {
        display: block;
        width: 100%;
      }
      .orgkit-members-mobile {
        display: none;
        width: 100%;
      }

      /* Mobile layout <= 640px (optimized for 360px phones) */
      @media (max-width: 640px) {
        .orgkit-members-desktop {
          display: none !important;
        }
        .orgkit-members-mobile {
          display: flex !important;
          flex-direction: column !important;
          gap: 12px !important;
        }
        .orgkit-search-filter-row {
          flex-direction: column !important;
          align-items: stretch !important;
          gap: 12px !important;
        }
        .orgkit-search-bar {
          max-width: 100% !important;
          width: 100% !important;
        }
        .orgkit-status-tabs {
          width: 100% !important;
          overflow-x: auto !important;
          justify-content: flex-start !important;
          -webkit-overflow-scrolling: touch;
        }
      }

      /* Micro-interactions & OrgKit button palette */
      .orgkit-btn-accent:hover:not(:disabled) {
        background-color: var(--color-accent-strong) !important;
        box-shadow: 0 4px 14px color-mix(in srgb, var(--color-accent) 28%, transparent) !important;
        transform: translateY(-1px);
      }
      .orgkit-btn-accent:active:not(:disabled) {
        transform: translateY(0.5px) scale(0.995);
        box-shadow: 0 1px 3px color-mix(in srgb, var(--color-accent) 20%, transparent) !important;
      }
      .orgkit-btn-accent:focus-visible {
        outline: none;
        box-shadow: 0 0 0 2px var(--color-surface), 0 0 0 4px var(--color-accent) !important;
      }

      .orgkit-btn-secondary:hover:not(:disabled) {
        background-color: var(--color-base-soft) !important;
        border-color: var(--color-line-strong) !important;
        transform: translateY(-1px);
      }
      .orgkit-btn-secondary:active:not(:disabled) {
        transform: translateY(0.5px) scale(0.995);
      }
      .orgkit-btn-secondary:focus-visible {
        outline: none;
        box-shadow: 0 0 0 2px var(--color-surface), 0 0 0 4px var(--color-accent) !important;
      }

      /* Row hover highlight */
      .orgkit-member-row {
        transition: background-color 0.15s ease;
      }
      .orgkit-member-row:hover {
        background-color: color-mix(in srgb, var(--color-base) 50%, transparent) !important;
      }
    `}</style>
  );
}

