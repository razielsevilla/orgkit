export const AUTH_LAYOUT_CSS = `
        /* ── Full-Bleed Global Baseline ── */
        html, body {
          background-color: var(--color-base) !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        /* ── Desktop View (>= 1024px): Zero Scroll, Edge-to-Edge Full Bleed ── */
        @media (min-width: 1024px) {
          html.orgkit-auth-active, body.orgkit-auth-active {
            overflow: hidden !important;
            height: 100vh !important;
            max-height: 100vh !important;
            width: 100vw !important;
          }

          .orgkit-page-root {
            width: 100vw !important;
            height: 100vh !important;
            max-height: 100vh !important;
            overflow: hidden !important;
            display: flex !important;
            align-items: center !important;
          }

          .orgkit-layout-body {
            display: flex !important;
            width: 100% !important;
            height: 100% !important;
            align-items: center !important;
            justify-content: space-between !important;
            padding-left: clamp(32px, 10.5vw, 175px) !important;
            padding-right: clamp(32px, 10.1vw, 170px) !important;
            box-sizing: border-box !important;
            position: relative !important;
            z-index: 10 !important;
          }

          .orgkit-left-pane {
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
            flex-shrink: 0 !important;
            max-width: clamp(480px, 46vw, 680px) !important;
          }

          .orgkit-marketing-content {
            display: block !important;
          }

          .orgkit-right-pane {
            display: flex !important;
            align-items: center !important;
            justify-content: flex-end !important;
            flex-shrink: 0 !important;
          }
        }

        /* ── Mobile View Fallback (< 1024px) ── */
        @media (max-width: 1023px) {
          html, body {
            overflow-y: auto !important;
            overflow-x: hidden !important;
            height: auto !important;
            max-height: none !important;
          }

          .orgkit-page-root {
            height: auto !important;
            min-height: 100vh !important;
            max-height: none !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: flex-start !important;
            width: 100% !important;
            padding: 32px 16px 48px 16px !important;
          }

          .orgkit-bg-decor {
            display: none !important;
          }

          .orgkit-layout-body {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            width: 100% !important;
            max-width: 440px !important;
            box-sizing: border-box !important;
          }

          .orgkit-left-pane {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            width: 100% !important;
            margin-bottom: 24px !important;
          }

          .orgkit-marketing-content {
            display: none !important;
          }

          .orgkit-right-pane {
            width: 100% !important;
            display: flex !important;
            justify-content: center !important;
          }
        }

        /* ── Interactive Button & Links UX Styling ── */
        @keyframes orgkitCardFadeIn {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .orgkit-card {
          animation: orgkitCardFadeIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) both;
          transition: box-shadow 0.25s ease, border-color 0.25s ease;
        }

        .orgkit-google-btn {
          width: 100%;
          border-radius: 9999px;
          background-color: var(--color-surface);
          border: 2px solid var(--color-line);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
          outline: none;
          box-sizing: border-box;
          user-select: none;
          box-shadow: 0 1px 3px color-mix(in srgb, var(--color-ink) 4%, transparent);
        }

        .orgkit-google-btn:hover:not(:disabled) {
          background-color: var(--color-base-soft);
          border-color: var(--color-line-strong);
          box-shadow: 0 6px 18px color-mix(in srgb, var(--color-ink) 8%, transparent);
          transform: translateY(-1px);
        }

        .orgkit-google-btn:active:not(:disabled) {
          transform: translateY(0.5px) scale(0.995);
          box-shadow: 0 1px 2px color-mix(in srgb, var(--color-ink) 5%, transparent);
          background-color: var(--color-base);
        }

        .orgkit-google-btn[data-error="true"],
        .orgkit-google-btn[data-error="true"]:hover:not(:disabled) {
          border-color: var(--color-danger);
        }

        .orgkit-google-btn:focus-visible {
          box-shadow: 0 0 0 2px var(--color-surface), 0 0 0 4px var(--color-accent);
        }

        .orgkit-google-btn:disabled {
          opacity: 0.75;
          cursor: not-allowed;
          transform: none !important;
        }

        /* ── Feature Items Micro-interactions ── */
        .orgkit-feature-item {
          display: flex;
          align-items: center;
          cursor: default;
          transition: transform 0.2s ease;
          user-select: none;
        }

        .orgkit-feature-item:hover {
          transform: translateY(-1px);
        }

        .orgkit-feature-item:hover .orgkit-feature-icon {
          color: var(--color-accent) !important;
          transform: scale(1.08);
        }

        .orgkit-feature-item:hover .orgkit-feature-label {
          color: var(--color-ink) !important;
        }

        .orgkit-feature-icon {
          transition: color 0.2s ease, transform 0.2s ease;
        }

        .orgkit-feature-label {
          transition: color 0.2s ease;
        }

        /* ── Keyboard & Link Focus Accessibility ── */
        .orgkit-terms-link {
          color: var(--color-accent);
          text-decoration: none;
          font-weight: 600;
          border-radius: 2px;
          transition: color 0.15s ease, text-decoration 0.15s ease;
        }

        .orgkit-terms-link:hover {
          text-decoration: underline;
          color: var(--color-accent-strong);
        }

        .orgkit-terms-link:focus-visible {
          outline: 2px solid var(--color-accent);
          outline-offset: 2px;
          text-decoration: underline;
        }

        .orgkit-signin-link {
          color: var(--color-accent);
          text-decoration: none;
          font-weight: 700;
          border-radius: 2px;
          transition: color 0.15s ease, text-decoration 0.15s ease;
        }

        .orgkit-signin-link:hover {
          text-decoration: underline;
          color: var(--color-accent-strong);
        }

        .orgkit-signin-link:focus-visible {
          outline: 2px solid var(--color-accent);
          outline-offset: 2px;
          text-decoration: underline;
        }

        /* ── Smooth Loading Spinner ── */
        @keyframes orgkitSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .orgkit-spinner {
          animation: orgkitSpin 0.75s linear infinite;
        }

        /* ── Respect User Preferences: Reduced Motion ── */
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
            scroll-behavior: auto !important;
          }
          .orgkit-google-btn:hover,
          .orgkit-google-btn:active,
          .orgkit-feature-item:hover {
            transform: none !important;
          }
        }
      `;
