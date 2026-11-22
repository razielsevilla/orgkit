export function DocumentsStyles() {
  return (
    <style>{`
      .orgkit-doc-card {
        transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
      }
      .orgkit-doc-card:hover {
        border-color: color-mix(in srgb, var(--color-accent) 25%, var(--color-line));
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
      }
      .orgkit-doc-row {
        transition: background-color 0.15s ease;
      }
      .orgkit-doc-row:hover {
        background-color: color-mix(in srgb, var(--color-base) 60%, transparent);
      }
      .orgkit-doc-action-btn {
        transition: all 0.15s ease;
      }
      .orgkit-doc-action-btn:hover {
        background-color: var(--color-base) !important;
        color: var(--color-ink) !important;
      }
      .orgkit-doc-delete-btn:hover {
        background-color: #fee2e2 !important;
        color: #dc2626 !important;
      }
      @media (max-width: 768px) {
        .orgkit-documents-table-wrapper {
          display: none !important;
        }
        .orgkit-documents-mobile-cards {
          display: flex !important;
        }
        .orgkit-documents-header-actions {
          width: 100% !important;
          display: flex !important;
          flex-direction: column !important;
          gap: 8px !important;
        }
        .orgkit-documents-header-actions button {
          width: 100% !important;
          justify-content: center !important;
        }
        .orgkit-documents-filter-bar {
          overflow-x: auto !important;
          padding-bottom: 6px !important;
          -webkit-overflow-scrolling: touch;
        }
      }
      @media (min-width: 769px) {
        .orgkit-documents-table-wrapper {
          display: block !important;
        }
        .orgkit-documents-mobile-cards {
          display: none !important;
        }
      }
    `}</style>
  );
}
