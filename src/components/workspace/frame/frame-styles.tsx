/**
 * Layout rules for the workspace frame. They live in one <style> block, not in
 * inline styles, for two reasons: a media query can only change what is not
 * inline, and `100dvh` needs a `100vh` fallback for older browsers, which an
 * inline style cannot hold twice.
 *
 * At 1024px and up this is the desktop layout, unchanged: a sidebar beside the
 * content. Below 1024px (a phone or small tablet) the sidebar becomes a drawer
 * opened from a slim top bar, and the content gets the full width.
 *
 * `100dvh` is the visible height: on a phone `100vh` is taller than the screen
 * and hides the bottom under the browser's toolbar.
 */
export function FrameStyles() {
  return (
    <style>{`
      .orgkit-frame {
        height: 100vh;
        height: 100dvh;
        max-height: 100vh;
        max-height: 100dvh;
      }
      .orgkit-aside {
        height: 100vh;
        height: 100dvh;
      }
      .orgkit-main {
        height: 100vh;
        height: 100dvh;
      }
      .orgkit-topbar,
      .orgkit-scrim {
        display: none;
      }

      @media (max-width: 1023px) {
        .orgkit-frame {
          flex-direction: column;
        }

        /* The slim top bar: menu button, then where you are */
        .orgkit-topbar {
          display: flex;
          align-items: center;
          gap: 4px;
          flex: none;
          height: 56px;
          padding: 0 12px 0 6px;
          box-sizing: border-box;
          background-color: var(--color-surface);
          border-bottom: 1px solid var(--color-line);
          position: relative;
          z-index: 20;
        }
        .orgkit-topbar-menu {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          flex: none;
          padding: 0;
          border: none;
          border-radius: 12px;
          background-color: transparent;
          color: var(--color-ink);
          cursor: pointer;
        }
        .orgkit-topbar-menu:hover { background-color: var(--color-base); }
        .orgkit-topbar-text {
          min-width: 0;
          display: flex;
          flex-direction: column;
          line-height: 1.2;
        }
        .orgkit-topbar-section {
          font-size: 15px;
          font-weight: 700;
          color: var(--color-ink);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .orgkit-topbar-org {
          font-size: 12px;
          color: var(--color-muted);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* The content takes whatever is left under the top bar */
        .orgkit-main {
          flex: 1 1 0;
          height: auto;
          min-height: 0;
        }

        /* The sidebar, as a drawer that slides in over the content. !important is
           needed because the sidebar sets its own width and padding inline. */
        .orgkit-aside {
          position: fixed !important;
          top: 0;
          bottom: 0;
          left: 0;
          height: auto !important;
          width: min(256px, 85vw) !important;
          min-width: 0 !important;
          max-width: none !important;
          padding: 16px 14px 14px 14px !important;
          /* Above the Feedback button (900) and below dialogs (1000) */
          z-index: 960 !important;
          transform: translateX(-102%);
          /* Hidden drawers leave the tab order and the screen reader's view once they have slid away */
          visibility: hidden;
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), visibility 0s linear 0.25s !important;
          box-shadow: 0 20px 50px color-mix(in srgb, var(--color-ink) 18%, transparent);
        }
        .orgkit-aside.is-open {
          transform: none;
          visibility: visible;
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), visibility 0s !important;
        }
        .orgkit-scrim {
          display: block;
          position: fixed;
          inset: 0;
          z-index: 950;
          background-color: color-mix(in srgb, var(--color-ink) 45%, transparent);
          animation: orgkit-scrim-in 0.2s ease both;
        }
        @keyframes orgkit-scrim-in { from { opacity: 0; } to { opacity: 1; } }

        /* Nav links were about 36px tall: 44px is the smallest comfortable touch target */
        .orgkit-nav-item { min-height: 44px; box-sizing: border-box; }
      }

      @media (prefers-reduced-motion: reduce) {
        .orgkit-aside, .orgkit-aside.is-open { transition: none !important; }
        .orgkit-scrim { animation: none; }
      }
    `}</style>
  );
}
