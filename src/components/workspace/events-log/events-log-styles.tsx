import React from "react";

export function EventsLogStyles() {
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
      .orgkit-log-row {
        transition: background-color 0.15s ease;
      }
      .orgkit-log-row:hover {
        background-color: color-mix(in srgb, var(--color-base) 60%, transparent);
      }
      .orgkit-log-card {
        transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
      }
      .orgkit-log-card:hover {
        border-color: color-mix(in srgb, var(--color-accent) 25%, var(--color-line));
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
      }
      @media (max-width: 768px) {
        .orgkit-log-desktop-table {
          display: none !important;
        }
        .orgkit-log-mobile-cards {
          display: flex !important;
        }
        .orgkit-log-filters {
          flex-direction: column !important;
          align-items: stretch !important;
        }
        .orgkit-log-date-inputs {
          flex-direction: column !important;
          width: 100% !important;
        }
      }
      @media (min-width: 769px) {
        .orgkit-log-desktop-table {
          display: block !important;
        }
        .orgkit-log-mobile-cards {
          display: none !important;
        }
      }
    `}</style>
  );
}
