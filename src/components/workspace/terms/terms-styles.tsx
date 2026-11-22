export function TermsStyles() {
  return (
    <style>{`
      @keyframes cardPopout {
        0% { opacity: 0; transform: translateY(8px) scale(0.99); }
        100% { opacity: 1; transform: translateY(0) scale(1); }
      }
      @media (max-width: 1200px) {
        .orgkit-floating-decor {
          display: none !important;
        }
      }
      .orgkit-term-card {
        transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
      }
      .orgkit-term-card:hover {
        border-color: color-mix(in srgb, var(--color-accent) 25%, var(--color-line));
      }
      .orgkit-term-row:hover {
        background-color: color-mix(in srgb, var(--color-base) 60%, transparent);
      }
      .orgkit-term-action-btn:hover {
        background-color: var(--color-base) !important;
        color: var(--color-ink) !important;
      }
      .orgkit-term-delete-btn:hover {
        background-color: #fee2e2 !important;
        color: #dc2626 !important;
      }
      @media (max-width: 768px) {
        .orgkit-terms-table-wrapper {
          display: none !important;
        }
        .orgkit-terms-mobile-cards {
          display: flex !important;
        }
        .orgkit-terms-header-actions {
          width: 100% !important;
          margin-top: 12px !important;
        }
        .orgkit-terms-header-actions button {
          width: 100% !important;
          justify-content: center !important;
        }
      }
      @media (min-width: 769px) {
        .orgkit-terms-table-wrapper {
          display: block !important;
        }
        .orgkit-terms-mobile-cards {
          display: none !important;
        }
      }
    `}</style>
  );
}
