/**
 * Styles for the officer tour: the dim layer, the ring, and the card.
 *
 * Stacking (docs/design.md 5.4 lists the rest): the tour sits above everything,
 * including dialogs (1000), the drawer (960) and the Feedback button (900),
 * because while it runs nothing else on the page is meant to be used. Dim panels
 * and the click-blocker are 1010, the ring 1011, the card 1012.
 *
 * Breakpoints are the documented ones. At 640px and below the card is a sheet
 * pinned to the bottom of the screen and the target is scrolled above it.
 */
export function TourStyles() {
  return (
    <style>{`
      .orgkit-tour-dim {
        position: fixed;
        z-index: 1010;
        background-color: color-mix(in srgb, var(--color-ink) 58%, transparent);
        transition: top var(--t-fast, 180ms) var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1)),
          left var(--t-fast, 180ms) var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1)),
          width var(--t-fast, 180ms) var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1)),
          height var(--t-fast, 180ms) var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1));
      }

      /* A clear panel over the highlighted thing: it is for looking at, so a click does nothing */
      .orgkit-tour-hole {
        position: fixed;
        z-index: 1010;
        background: transparent;
      }

      .orgkit-tour-ring {
        position: fixed;
        z-index: 1011;
        box-sizing: border-box;
        pointer-events: none;
        border: 2px solid var(--color-accent);
        box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-accent) 24%, transparent);
        transition: top var(--t-fast, 180ms) var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1)),
          left var(--t-fast, 180ms) var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1)),
          width var(--t-fast, 180ms) var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1)),
          height var(--t-fast, 180ms) var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1));
      }
      /* A slow pulse draws the eye to it without flashing */
      .orgkit-tour-ring::after {
        content: "";
        position: absolute;
        inset: -2px;
        border-radius: inherit;
        border: 2px solid var(--color-accent);
        opacity: 0;
        animation: orgkitTourPulse 2s var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1)) infinite;
      }
      @keyframes orgkitTourPulse {
        0% { opacity: 0.55; transform: scale(1); }
        70%, 100% { opacity: 0; transform: scale(1.06); }
      }

      /* ── The card ─────────────────────────────────────────────── */
      .orgkit-tour-card {
        position: fixed;
        z-index: 1012;
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
        max-height: min(600px, calc(100dvh - 24px));
        overflow: hidden;
        border-radius: var(--radius-panel, 20px);
        border: 1px solid var(--color-line);
        background-color: var(--color-surface);
        box-shadow: var(--shadow-dialog, 0 20px 48px -12px rgba(24, 24, 27, 0.14));
        outline: none;
        animation: orgkitTourCard 0.2s var(--ease-spring, cubic-bezier(0.16, 1, 0.3, 1)) both;
      }
      @keyframes orgkitTourCard {
        from { opacity: 0; transform: translateY(8px) scale(0.985); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      .orgkit-tour-card.is-float,
      .orgkit-tour-card.is-center {
        width: min(400px, calc(100vw - 24px));
        /* The same card moves from step to step, so it glides there instead of popping in again */
        transition: top var(--t-fast, 180ms) var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1)),
          left var(--t-fast, 180ms) var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1));
      }
      .orgkit-tour-card.is-sheet {
        left: 8px;
        right: 8px;
        bottom: calc(8px + env(safe-area-inset-bottom, 0px));
        max-height: min(58dvh, 440px);
      }

      .orgkit-tour-card-head {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-shrink: 0;
        padding: 12px 12px 12px 16px;
        background-color: var(--color-brand-tint);
        border-bottom: 1px solid color-mix(in srgb, var(--color-accent) 18%, transparent);
      }
      .orgkit-tour-tile {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        flex-shrink: 0;
        border-radius: 10px;
        background-color: var(--color-surface);
        border: 1px solid color-mix(in srgb, var(--color-accent) 24%, transparent);
        color: var(--color-accent);
      }
      .orgkit-tour-tag {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 12.5px;
        font-weight: 600;
        letter-spacing: 0.01em;
        font-variant-numeric: tabular-nums;
        color: var(--color-brand-deep);
      }

      .orgkit-tour-card-body {
        flex: 1 1 auto;
        min-height: 0;
        overflow-x: hidden;
        overflow-y: auto;
        overflow-wrap: anywhere;
        padding: 16px 18px 4px;
      }
      .orgkit-tour-title {
        margin: 0 0 6px;
        font-size: 17px;
        font-weight: 600;
        line-height: 1.25;
        letter-spacing: -0.02em;
        color: var(--color-ink);
      }
      .orgkit-tour-text {
        margin: 0 0 12px;
        font-size: 14px;
        line-height: 1.5;
        color: var(--color-muted-strong);
      }

      /* Numbered how-to steps */
      .orgkit-tour-steps {
        margin: 0;
        padding: 0;
        list-style: none;
        counter-reset: tourstep;
        display: flex;
        flex-direction: column;
        gap: 9px;
      }
      .orgkit-tour-steps > li {
        position: relative;
        counter-increment: tourstep;
        padding-left: 30px;
        font-size: 14px;
        line-height: 1.45;
        color: var(--color-ink-soft);
      }
      .orgkit-tour-steps > li::before {
        content: counter(tourstep);
        position: absolute;
        left: 0;
        top: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 21px;
        height: 21px;
        border-radius: 50%;
        background-color: var(--color-accent-soft);
        color: var(--color-accent-strong);
        font-size: 11.5px;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
      }

      .orgkit-tour-note {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 4px 8px;
        margin: 12px 0 0;
        font-size: 13px;
        line-height: 1.45;
        color: var(--color-muted-strong);
      }
      .orgkit-tour-note.is-missing {
        padding: 10px 12px;
        border-radius: 12px;
        border: 1px solid var(--color-line);
        background-color: var(--color-base-soft);
      }
      .orgkit-tour-pill {
        display: inline-flex;
        align-items: center;
        padding: 3px 10px;
        border-radius: 9999px;
        background-color: var(--color-surface);
        border: 1px solid var(--color-line-strong);
        font-size: 11.5px;
        font-weight: 600;
        letter-spacing: 0.02em;
        color: var(--color-ink-soft);
      }
      .orgkit-tour-sample {
        margin: 12px 0 0;
        font-size: 12.5px;
        line-height: 1.4;
        color: var(--color-muted-strong);
      }
      .orgkit-tour-hint {
        margin: 12px 0 0;
        font-size: 13px;
        font-weight: 600;
        color: var(--color-accent-strong);
      }
      .orgkit-tour-role {
        margin: 0 0 12px;
        padding: 11px 13px;
        border-radius: 14px;
        border: 1px solid color-mix(in srgb, var(--color-accent) 24%, transparent);
        background-color: var(--color-brand-tint);
        font-size: 13px;
        line-height: 1.5;
        font-weight: 500;
        color: var(--color-brand-deep);
      }

      /* The first-week list on the last card */
      .orgkit-tour-first {
        margin: 0;
        padding: 0;
        list-style: none;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .orgkit-tour-start {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
        padding: 11px 14px;
        border-radius: 14px;
        border: 1px solid var(--color-line);
        background-color: var(--color-surface);
        color: var(--color-ink);
        font-size: 14px;
        font-weight: 600;
        text-decoration: none;
        box-shadow: var(--shadow-rest);
        transition: transform var(--t-fast, 180ms) var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1)),
          box-shadow var(--t-fast, 180ms) var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1)),
          border-color var(--t-fast, 180ms) var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1));
      }
      .orgkit-tour-start:active { transform: scale(0.97); box-shadow: var(--shadow-pressed); }
      .orgkit-tour-start:focus-visible {
        outline: none;
        box-shadow: 0 0 0 2px var(--color-surface), 0 0 0 4px var(--color-accent);
      }
      @media (hover: hover) {
        .orgkit-tour-start:hover {
          border-color: var(--color-ink);
          transform: translateY(-1px);
          box-shadow: var(--shadow-hover);
        }
      }
      .orgkit-tour-start-num {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 26px;
        height: 26px;
        flex-shrink: 0;
        border-radius: 50%;
        background-color: var(--color-accent-soft);
        color: var(--color-accent-strong);
        font-size: 12px;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
      }

      /* The badge that says the page behind the dim layer is showing made-up data */
      .orgkit-tour-badge {
        position: fixed;
        z-index: 1011;
        top: 12px;
        left: 50%;
        transform: translateX(-50%);
        display: inline-flex;
        align-items: center;
        gap: 8px;
        max-width: calc(100vw - 24px);
        padding: 7px 14px;
        border-radius: 9999px;
        border: 1px solid color-mix(in srgb, var(--color-accent) 30%, transparent);
        background-color: var(--color-surface);
        box-shadow: var(--shadow-rest);
        font-size: 12.5px;
        font-weight: 600;
        color: var(--color-brand-deep);
        pointer-events: none;
      }
      .orgkit-tour-badge svg { flex-shrink: 0; color: var(--color-accent); }

      /* ── Footer: progress, then the buttons ───────────────────── */
      .orgkit-tour-card-foot {
        display: flex;
        flex-direction: column;
        gap: 12px;
        flex-shrink: 0;
        padding: 12px 16px 14px;
      }
      .orgkit-tour-progress {
        display: flex;
        gap: 3px;
      }
      .orgkit-tour-seg {
        flex: 1 1 0;
        min-width: 0;
        height: 4px;
        border-radius: 9999px;
        background: linear-gradient(90deg, var(--color-accent) var(--fill, 0%), var(--color-line) var(--fill, 0%));
      }
      .orgkit-tour-actions {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
      }
      .orgkit-tour-spacer { flex: 1 1 0; min-width: 0; }
      .orgkit-tour-skip {
        padding: 0 4px;
        border: none;
        background: transparent;
        border-radius: 2px;
        font-family: inherit;
        font-size: 13px;
        font-weight: 600;
        color: var(--color-muted-strong);
        cursor: pointer;
        transition: color var(--t-fast, 180ms) var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1));
      }
      .orgkit-tour-skip:hover { color: var(--color-ink); text-decoration: underline; }
      .orgkit-tour-skip:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }

      @media (max-width: 640px) {
        .orgkit-tour-card-body { padding: 14px 16px 2px; }
        .orgkit-tour-card-foot { padding: 10px 14px 12px; }
      }

      @media (prefers-reduced-motion: reduce) {
        .orgkit-tour-card { animation: none; }
        .orgkit-tour-ring::after { animation: none; }
        .orgkit-tour-card.is-float,
        .orgkit-tour-card.is-center,
        .orgkit-tour-dim,
        .orgkit-tour-ring,
        .orgkit-tour-start,
        .orgkit-tour-skip { transition: none; }
        .orgkit-tour-start:hover,
        .orgkit-tour-start:active { transform: none; }
      }
    `}</style>
  );
}
