// Decorative layer for the join page: animation styles and the background circles
export function JoinBackdrop() {
  return (
    <>
      <style>{`
        .orgkit-burst-tl { animation: burstTL 0.52s cubic-bezier(0.16, 1.25, 0.38, 1) 0.04s both; }
        .orgkit-burst-fl { animation: burstFL 0.52s cubic-bezier(0.16, 1.25, 0.38, 1) 0.08s both; }
        .orgkit-burst-bl { animation: burstBL 0.52s cubic-bezier(0.16, 1.25, 0.38, 1) 0.12s both; }
        .orgkit-burst-tr { animation: burstTR 0.52s cubic-bezier(0.16, 1.25, 0.38, 1) 0.06s both; }
        .orgkit-burst-fr { animation: burstFR 0.52s cubic-bezier(0.16, 1.25, 0.38, 1) 0.1s both; }
        .orgkit-burst-br { animation: burstBR 0.52s cubic-bezier(0.16, 1.25, 0.38, 1) 0.14s both; }
        .orgkit-burst-dot { animation: burstDot 0.4s ease 0.2s both; }

        .orgkit-float-a { animation: ambientFloatA 3.4s ease-in-out infinite; }
        .orgkit-float-b { animation: ambientFloatB 3.8s ease-in-out infinite; }

        @media (max-width: 639px) {
          .orgkit-floating-decor {
            display: none !important;
          }
        }
      `}</style>

      {/* ── Background Concentric SVG Circles: Top-Left ── */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 320,
          height: 320,
          pointerEvents: "none",
          zIndex: 1,
        }}
      >
        <svg
          viewBox="0 0 320 320"
          style={{ width: "100%", height: "100%", display: "block" }}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="0" cy="0" r="220" fill="var(--color-accent)" fillOpacity="0.04" />
          <circle
            cx="0"
            cy="0"
            r="260"
            stroke="var(--color-accent)"
            strokeWidth="1.2"
            strokeOpacity="0.22"
          />
          <circle
            cx="0"
            cy="0"
            r="160"
            stroke="var(--color-accent)"
            strokeWidth="1.2"
            strokeOpacity="0.14"
          />
        </svg>
      </div>

      {/* ── Background Concentric SVG Circles: Bottom-Right ── */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          bottom: 0,
          right: 0,
          width: 320,
          height: 320,
          pointerEvents: "none",
          zIndex: 1,
        }}
      >
        <svg
          viewBox="0 0 320 320"
          style={{ width: "100%", height: "100%", display: "block" }}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="320" cy="320" r="200" fill="var(--color-accent)" fillOpacity="0.05" />
          <circle
            cx="320"
            cy="320"
            r="270"
            stroke="var(--color-accent)"
            strokeWidth="1.2"
            strokeOpacity="0.26"
          />
        </svg>
      </div>
    </>
  );
}
