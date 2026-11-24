import React from "react";

export function HandoverStyles() {
  return (
    <style>{`
      @keyframes cardPopout {
        from {
          opacity: 0;
          transform: translateY(4px) scale(0.98);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      @keyframes shimmerWave {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }

      .handover-shimmer {
        background: linear-gradient(90deg, #f4f4f5 25%, #e4e4e7 50%, #f4f4f5 75%);
        background-size: 200% 100%;
        animation: shimmerWave 1.8s infinite;
      }

      .orgkit-handover-scroll-container {
        scrollbar-width: thin;
        scrollbar-color: color-mix(in srgb, var(--color-ink) 20%, transparent) transparent;
        scroll-behavior: smooth;
      }
      .orgkit-handover-scroll-container::-webkit-scrollbar {
        width: 6px;
      }
      .orgkit-handover-scroll-container::-webkit-scrollbar-track {
        background: transparent;
      }
      .orgkit-handover-scroll-container::-webkit-scrollbar-thumb {
        background-color: color-mix(in srgb, var(--color-ink) 20%, transparent);
        border-radius: 9999px;
      }
      .orgkit-handover-scroll-container::-webkit-scrollbar-thumb:hover {
        background-color: var(--color-accent);
      }

      .orgkit-handover-accordion {
        transition: border-color 0.15s ease, box-shadow 0.15s ease;
      }

      .orgkit-handover-accordion:hover {
        border-color: color-mix(in srgb, var(--color-accent) 40%, var(--color-line));
      }

      .orgkit-textarea-field {
        transition: border-color 0.15s ease, box-shadow 0.15s ease;
      }

      .orgkit-textarea-field:focus {
        border-color: var(--color-accent) !important;
        box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-accent) 25%, transparent) !important;
      }

      @media (max-width: 768px) {
        .orgkit-handover-header-row {
          flex-direction: column !important;
          align-items: flex-start !important;
          gap: 12px !important;
        }

        .orgkit-handover-actions-group {
          width: 100% !important;
          flex-wrap: wrap !important;
        }

        .orgkit-handover-actions-group button {
          flex: 1 1 auto !important;
        }
      }
    `}</style>
  );
}
