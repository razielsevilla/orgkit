# OrgKit Color Palette

A neutral, middle-ground off-white that doesn't lean too warm or too cool, paired with one sophisticated growth-oriented accent.

## Core colors

| Role                  | Name    | Hex       | Tailwind ref | Usage                                                 |
| --------------------- | ------- | --------- | ------------ | ----------------------------------------------------- |
| Dominant base         | Base    | `#F4F4F5` | Zinc 100     | Page background, the soothing canvas                  |
| Surface / containers  | Surface | `#FFFFFF` | White        | Cards, modals, inputs, tables                         |
| Text / primary        | Ink     | `#18181B` | Zinc 900     | Headings and body text                                |
| Muted / secondary     | Muted   | `#71717A` | Zinc 500     | Helper text, captions, placeholders, metadata         |
| Borders / dividers    | Line    | `#E4E4E7` | Zinc 200     | Card borders, dividers, input outlines                |
| Accent (single color) | Accent  | `#059669` | Emerald 600  | Primary buttons, success states, active member badges |

The accent is the only color in the palette. Everything else is a neutral, so green always means "go, done, or active".

## Supporting shade (same hue as the accent)

| Role          | Hex                      | Tailwind ref      | Usage                                                        |
| ------------- | ------------------------ | ----------------- | ------------------------------------------------------------ |
| Accent strong | `#047857`                | Emerald 700       | Button hover/pressed state, accent text on light backgrounds |
| Accent tint   | `#059669` at 10% opacity | Emerald 600 / 10% | Soft badge or success-banner background                      |
| Brand deep    | `#054A38`                | n/a               | The wordmark's green: titles in branded headers (dialogs)    |
| Brand tint    | Accent 8% over white     | n/a               | The faint wash behind branded headers                        |

## Tailwind v4 setup

Tailwind v4 has no `tailwind.config.js`. Add the colors as theme tokens in `src/app/globals.css`:

```css
@import "tailwindcss";

@theme {
  --color-base: #f4f4f5;
  --color-surface: #ffffff;
  --color-ink: #18181b;
  --color-muted: #71717a;
  --color-line: #e4e4e7;
  --color-accent: #059669;
  --color-accent-strong: #047857;
}

body {
  background-color: var(--color-base);
  color: var(--color-ink);
}
```

This gives you utilities like `bg-base`, `bg-surface`, `text-ink`, `text-muted`, `border-line`, `bg-accent`, `hover:bg-accent-strong`, and `bg-accent/10`.

## Component examples

```tsx
// Primary button
<button className="rounded-lg bg-accent px-4 py-2 font-semibold text-white hover:bg-accent-strong">
  Sign in with Google
</button>

// Card
<div className="rounded-xl border border-line bg-surface p-6">
  <h2 className="text-lg font-semibold text-ink">Members</h2>
  <p className="text-sm text-muted">42 active this term</p>
</div>

// Active member badge
<span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-sm font-medium text-accent-strong">
  Active
</span>
```

## Accessibility notes (WCAG contrast)

| Combination                        | Ratio   | Result                                                                                             |
| ---------------------------------- | ------- | -------------------------------------------------------------------------------------------------- |
| Ink on Surface                     | ~17.7:1 | Passes AA and AAA                                                                                  |
| Ink on Base                        | ~16:1   | Passes AA and AAA                                                                                  |
| Muted on Surface                   | ~4.8:1  | Passes AA                                                                                          |
| Muted on Base                      | ~4.4:1  | Just under AA for small text. Use Muted on white cards, or keep it at 18px+ on the Base background |
| White on Accent (`#059669`)        | ~3.8:1  | Fails AA for normal-size text. Fine for large or bold text (18.66px bold or 24px regular and up)   |
| White on Accent strong (`#047857`) | ~5.5:1  | Passes AA                                                                                          |
| Ink on Accent                      | ~4.7:1  | Passes AA                                                                                          |

What this means in practice:

- For primary buttons with regular-size labels, either use Accent strong (`#047857`) as the resting background, or keep the label bold and at least 18px.
- Don't use Accent (`#059669`) as small body text on white. Use Accent strong for green text.
- Don't rely on green alone to show status. Pair it with an icon or a text label such as "Active" or "Verified".

## Open gap

The palette has no color for errors (for example the "Sign-in was cancelled" message). Until you pick one, errors can use Ink text with an icon and a Line-colored border. If you later add a red, reserve it for errors only so the single-accent idea stays intact.
