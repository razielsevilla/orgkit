export function OfficersStyles() {
  return (
    <style>{`
      @media (max-width: 640px) {
        .orgkit-officer-row {
          flex-direction: column !important;
          align-items: flex-start !important;
          gap: 12px !important;
        }
        .orgkit-officer-controls {
          width: 100% !important;
          justifyContent: space-between !important;
          margin-top: 4px !important;
        }
        .orgkit-officer-select {
          flex: 1 !important;
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
