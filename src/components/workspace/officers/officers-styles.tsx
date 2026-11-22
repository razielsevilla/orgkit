export function OfficersStyles() {
  return (
    <style>{`
      .orgkit-role-option:hover {
        background-color: var(--color-base) !important;
      }
      .orgkit-officer-pill-trigger:hover:not(:disabled) {
        filter: brightness(0.96);
      }
      @media (max-width: 1200px) {
        .orgkit-floating-decor {
          display: none !important;
        }
      }
      @media (max-width: 640px) {
        .orgkit-officer-row {
          flex-direction: column !important;
          align-items: flex-start !important;
          gap: 12px !important;
        }
        .orgkit-officer-row { width: 100%; box-sizing: border-box; }
        .orgkit-officer-controls {
          width: 100% !important;
          justify-content: space-between !important;
          margin-top: 4px !important;
        }
        /* The select sits in a wrapper div: the wrapper is the flex child, so it is the one that stretches */
        .orgkit-officer-controls > div:first-child {
          flex: 1 1 0;
          min-width: 0;
        }
        .orgkit-officer-select {
          width: 100% !important;
        }
        .orgkit-header-actions {
          width: 100% !important;
          margin-top: 12px !important;
        }
        .orgkit-header-actions button {
          width: 100% !important;
          justify-content: center !important;
        }
      }
    `}</style>
  );
}
