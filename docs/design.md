# OrgKit Design System (`design.md`) — v2, bryl-minimal restyle

This is the single source of truth for OrgKit's UI. Every page, component, and layout must follow it. v2 keeps OrgKit's **color palette, geometric SVG background layer, campus photo, and floating icons**, and adopts the **bryl-minimal** typography, type scale, spacing, radii, shadows, and motion.

The goal: a quiet, precise, editorial UI that feels designed by a person, not generated. If a screen feels empty, that is usually correct.

---

## 0. What changed from v1

| Area | v1 | v2 |
| :--- | :--- | :--- |
| Font | Plus Jakarta Sans, weights up to 800 | **Geist** (UI), **Geist Mono** (labels), **Geist Pixel** (page titles); max weight 600 |
| Type scale | Large fluid `clamp()` everywhere | Compact fixed scale (15px base). `clamp()` kept **only** for the auth/marketing hero |
| Corners | Pills + 28px cards | Radius ladder 16 / 12 / 8 / 6; pills only for badges and tags |
| Borders | 2px outlines, 1px at 60% | 1px hairlines everywhere, `#E4E4E7` |
| Shadows | `0 20px 50px / 8%` | Soft ground-contact shadows with negative spread |
| Hierarchy | Size + weight + green | Font role, casing, tracking, hairlines, numbered labels |
| Motion | 0.22s card fade | Staggered fade-up entrance, 200ms micro-interactions |
| Kept as is | Palette, emerald accent, SVG geometric layer, campus photo, floating icons, Lucide icons | Same (see §7) |

**Deliberate conflicts resolved (do not "fix" these back):**
1. bryl-minimal has *no* accent color. OrgKit keeps **one** accent, emerald `#059669`, reserved for success, active, primary actions. Everything else is neutral. Never add a second hue.
2. bryl-minimal uses pure white `#fff` as the page background. OrgKit keeps `#F4F4F5` as the canvas and `#FFFFFF` for surfaces.
3. bryl-minimal's lightest text gray (`#A3A3A3`) fails WCAG on white. OrgKit rule: **gray 400 is for decorative labels only; anything the user must read is `#71717A` or darker.**
4. bryl-minimal micro-labels go down to 9px. OrgKit minimum is **10px** (decorative) and **11px** (anything functional).

---

## 1. Philosophy

1. **One accent, used sparingly.** Emphasis comes first from typography (switching to the pixel or mono font), inversion (ink chip on light surface), and hairlines. Emerald is the only hue and means *success, active, go*.
2. **Type does the talking.** Three font roles carry the hierarchy. Sizes stay modest; contrast comes from *which* font, its casing, and its tracking.
3. **Whitespace is structure.** Narrow measure, generous vertical rhythm. Sections are separated by hairline rules and numbered labels, not boxes or background tints.
4. **Texture over decoration.** Geometric SVG shapes and the campus photo supply atmosphere on entry screens only. Inside the app, screens are calm and flat.

---

## 2. Color tokens

Same palette as v1, mapped onto bryl-minimal's role names.

| Role | Token | Hex | Usage |
| :--- | :--- | :--- | :--- |
| Canvas | `--color-base` | `#F4F4F5` | Page background |
| Surface | `--color-surface` | `#FFFFFF` | Cards, modals, inputs, sidebar |
| Gray 50 | `--color-gray-50` | `#FAFAFA` | Faint fills, card gradient start, hover fill |
| Gray 100 | `--color-gray-100` | `#F4F4F5` | Subtle fills, pressed state |
| Line (Gray 200) | `--color-line` | `#E4E4E7` | All borders and hairline dividers |
| Gray 300 | `--color-gray-300` | `#D4D4D8` | Strong borders, tag outlines, scrollbar thumb |
| Gray 400 | `--color-gray-400` | `#A1A1AA` | **Decorative only**: numbered section labels, disabled |
| Muted (Gray 500) | `--color-muted` | `#71717A` | Secondary text, captions, mono labels (readable minimum) |
| Gray 600 | `--color-gray-600` | `#52525B` | Legal text, helper text |
| Gray 700 | `--color-gray-700` | `#3F3F46` | Feature labels, table body |
| Ink | `--color-ink` | `#18181B` | Headings, body, inverted-chip fill |
| Accent | `--color-accent` | `#059669` | Primary buttons, active badges, success, key word in hero |
| Accent strong | `--color-accent-strong` | `#047857` | Accent hover, accent text on white |
| Accent tint | — | `rgba(5,150,105,0.06)` / `0.10` | SVG background shapes, soft badges |
| Error | `--color-error` | `#DC2626` | Validation only |

Rules:
- Body text is ink. Secondary text is muted. Never use gray 400 for text a user needs to read.
- Borders are always 1px `--color-line`. Dividers are hairlines, used generously.
- Filled surfaces are rare. If a card needs depth, use a gradient from gray 50 to surface.
- Allowed "loud" element: **one inverted chip per view** (ink fill, white text), e.g. a "Featured" or role badge.
- Text selection: ink background, white text.
- Accent is never used for large fills inside the app. A primary button, an active badge, a success state, a focus ring: that's it.

### `src/app/globals.css` (Tailwind v4)

```css
@import "tailwindcss";

:root {
  --color-base: #f4f4f5;
  --color-surface: #ffffff;
  --color-gray-50: #fafafa;
  --color-gray-100: #f4f4f5;
  --color-line: #e4e4e7;
  --color-gray-300: #d4d4d8;
  --color-gray-400: #a1a1aa;
  --color-muted: #71717a;
  --color-gray-600: #52525b;
  --color-gray-700: #3f3f46;
  --color-ink: #18181b;
  --color-accent: #059669;
  --color-accent-strong: #047857;
  --color-error: #dc2626;

  --ease-out-soft: cubic-bezier(0.16, 1, 0.3, 1);
  --shadow-card: 0 8px 22px -14px rgba(0, 0, 0, 0.25);
  --shadow-card-hover: 0 18px 36px -20px rgba(0, 0, 0, 0.4);
  --shadow-modal: 0 40px 90px -20px rgba(0, 0, 0, 0.35);
}

@theme inline {
  --color-base: var(--color-base);
  --color-surface: var(--color-surface);
  --color-ink: var(--color-ink);
  --color-muted: var(--color-muted);
  --color-line: var(--color-line);
  --color-accent: var(--color-accent);
  --color-accent-strong: var(--color-accent-strong);
  --font-sans: var(--font-geist), system-ui, sans-serif;
  --font-mono: var(--font-geist-mono), ui-monospace, monospace;
  --font-pixel: var(--font-geist-pixel), var(--font-geist-mono), monospace;
}

html { color-scheme: light; background: var(--color-base); }
body { font-family: var(--font-sans); font-size: 15px; color: var(--color-ink); }
::selection { background: var(--color-ink); color: #fff; }

/* slim scrollbars */
* { scrollbar-width: thin; scrollbar-color: var(--color-gray-300) transparent; }
```

---

## 3. Typography

### 3.1 Font roles

| Role | Font | Fallbacks | Used for |
| :--- | :--- | :--- | :--- |
| UI / body | **Geist** | system-ui, sans-serif | Paragraphs, nav, card titles, buttons, inputs, headings |
| Technical | **Geist Mono** | ui-monospace, monospace | Micro-labels, tags, timestamps, reference numbers, table meta |
| Display | **Geist Pixel (Square)** | Geist Mono, monospace | Page titles, numbered section labels, big stat values |

Loading (Next.js):
- Geist and Geist Mono via `next/font/google` (`display: "swap"`), exposed as `--font-geist` and `--font-geist-mono`.
- Geist Pixel via `next/font/local` from a self-hosted `.woff2` in `/public/fonts/`, exposed as `--font-geist-pixel`, `display: "swap"`.
- If Geist Pixel is unavailable, fall back to **Geist Mono, uppercase**. Never substitute any other decorative font.
- Remove Plus Jakarta Sans entirely.

### 3.2 Scale

Base UI text is **15px**, not 16.

| Level | Font | Size | Weight | Tracking | Case | Color | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Page title | Pixel | `3rem`, line-height 1 | 400 | normal | lowercase, usually one word | ink | "members", "attendance", "dues", "archive" |
| Section label | Pixel | `13px` | 400 | `0.02em` | lowercase | gray 400 | "01 — roster", "02 — dues" |
| H1 (in content) | Geist | `1.6rem` | 600 | `-0.02em` | sentence | ink | Detail page titles |
| H2 | Geist | `1.3rem` | 600 | `-0.02em` | sentence | ink | Card and modal titles |
| H3 | Geist | `1.1rem` | 600 | `-0.02em` | sentence | ink | Sub-sections |
| Body | Geist | `15px`, lh 1.6 | 400 | normal | sentence | ink | Default text |
| Small | Geist | `13px`, lh 1.5 | 400 | normal | sentence | muted | Helper text, captions |
| Button text | Geist | `13px`–`14px` | 500 | normal | sentence | per button | All buttons |
| **Micro-label** | Geist Mono | `11px` (min `10px`, decorative only) | 400 | `+1px` | **UPPERCASE** | muted (gray 400 if decorative) | Tags, timestamps, field captions, table headers, status text |

The micro-label is the signature register of the whole UI. Use it for anything small and technical: field captions above inputs, table column headers, "VERIFIED", "PENDING", reference numbers, dates.

Casing rules: page titles and standalone labels are **lowercase**. Only mono micro-labels are UPPERCASE. Headings and buttons are sentence case. No Title Case, no all-caps sans.

Links: underlined with the underline at 25% opacity of the text color, offset 2px, rising to 100% on hover. External links get a trailing `↗`. Link color is ink (or emerald-strong inside body copy where it signals action).

### 3.3 Auth / marketing hero exception

Only `/signin` and `/register` (and any future landing page) may use fluid sizing, because they are zero-scroll viewport layouts:

| Level | Size | Weight | Notes |
| :--- | :--- | :--- | :--- |
| Hero headline | `clamp(36px, 3.6vw, 60px)`, lh 1.05, tracking `-0.025em` | **600** | Geist. Lead word in accent `#059669`. Optional: set an eyebrow above it in mono micro-label style |
| Hero subtitle | `clamp(15px, 1.3vw, 21px)`, lh 1.4 | 400 | muted |
| Card title (H2) | `clamp(22px, 2vw, 32px)`, tracking `-0.02em` | 600 | "Create your account" |
| Card subtitle | `clamp(13px, 1.1vw, 17px)`, max-width 440px | 400 | muted |
| Feature item label | `clamp(12px, 0.9vw, 14px)` | 500 | gray 700 |
| Legal / caption | `clamp(12px, 0.9vw, 14px)` | 400 | gray 600 |

Everything inside the logged-in app uses the fixed scale in §3.2. No `clamp()`.

---

## 4. Layout & spacing

### 4.1 App shell (signed-in screens)
- **Desktop (≥ 1024px):** fixed left sidebar, **14rem** wide, surface background, 1px right hairline. Content shifts right to clear it.
- **Below 1024px:** sticky top bar with a hairline bottom border, ~90% opaque canvas background with backdrop blur, and a full-screen overlay menu.
- Sidebar: org name/switcher at top (Geist 600), nav items in **mono micro-label style** (UPPERCASE, 11px). Groups separated by 1px `--color-line` rules. Active item: ink text with a small leading `→`. Inactive: muted, ink on hover. No filled active pill; the one place emerald may appear in nav is a tiny 6px active dot on the current item.
- Content column: **42rem** max for reading and forms, **56rem** for pages with multi-column grids. Data tables (members, attendance, dues) may go to **72rem**; this is the only sanctioned deviation.

### 4.2 Spacing
- Page padding: 1rem mobile, 1.5rem desktop.
- Card padding: 1.25rem.
- Vertical rhythm between major sections: **3.5rem**.
- Gaps inside components: 0.75rem. Between grid cards: 0.75–1.5rem.
- Grids are modest: 2 columns on small screens, 3 at ≥ 1024px.
- Stat rows and tables separate cells with **hairline rules on both axes**, not gaps. The dividers are the design.

### 4.3 Auth split-pane (desktop ≥ 1024px)
Unchanged from v1 apart from type and radii:
- Strict `100vw` × `100vh`, `overflow: hidden`.
- Gutters: `padding-left: clamp(32px, 10.5vw, 175px)`, `padding-right: clamp(32px, 10.1vw, 170px)`.
- **Left pane:** wordmark (`/orgkit-text-logo.png`, `clamp(150px, 13vw, 220px)`), eyebrow micro-label, hero headline, subtitle, 3-column feature row (Manage Members / Organize Events / Track Activities) divided by 1px hairlines.
- **Right pane:** floating card, `width: clamp(380px, 33.85vw, 566px)`.
- **Mobile (< 1024px):** decorative layer, floating icons, and feature row hide; page scrolls normally; card fills up to 440px.

---

## 5. Radii, borders, shadows

### 5.1 Radius ladder
| Size | Use |
| :--- | :--- |
| **16px** | Large cards, auth card, modal panels |
| **12px** | Medium cards, floating icon tiles, callouts |
| **8px** | Buttons, small elements, sidebar items |
| **6px** | Inputs, minimal elements |
| **9999px** | Badges, tags, status pills **only** |
| ~10px | Thumbnails |

No `rounded-3xl`, no pill buttons (the Google button is now **8px**, not full-round).

### 5.2 Borders
1px `--color-line` on everything. An optional inset hairline 5px inside a card's edge may be used as a framing accent on one hero card per page, never more.

### 5.3 Shadows
Always black at low alpha with large blur and strong negative spread: ground contact, not elevation.

- Resting card: `0 8px 22px -14px rgba(0,0,0,0.25)`
- Card hover: `0 18px 36px -20px rgba(0,0,0,0.4)` + lift `translateY(-2px)`
- Modal panel: `0 40px 90px -20px rgba(0,0,0,0.35)`
- Buttons: no resting shadow. Hover on primary: darken fill only.
- Focus ring (kept from v1): `box-shadow: 0 0 0 2px #fff, 0 0 0 4px #059669`

---

## 6. Components

Every component follows one recipe: hairline border, radius from the ladder, white or gray-50 fill, soft shadow, a mono micro-label somewhere.

### 6.1 Cards
Border `1px --color-line`, radius 16 (or 12 for small), surface fill (optionally gradient gray-50 → surface), resting shadow. Hover lift only if the card is clickable. Images inside zoom to `scale(1.04)` over 0.5s on hover.

### 6.2 Buttons
Understated.
- **Primary:** accent `#059669` fill, white text, 8px radius, 13–14px / 500, height 40px (44px on auth). Hover `#047857`. No shadow.
- **Secondary:** surface fill, 1px line border, ink text, 8px radius. Hover fill gray-50.
- **Tertiary / most actions:** mono micro-label text link with an arrow glyph (`→` / `↗`) that nudges up-and-right 2px on hover.
- **Destructive:** secondary style with error-colored text; confirm in a modal.
- **Google sign-in button:** surface, 1px line border, **8px radius**, height `clamp(48px, 7vh, 64px)`, label Geist 500 at `clamp(15px, 1.2vw, 20px)`. Hover: gray-50 fill, border gray 300, `translateY(-1px)`. Active: gray-100, `scale(0.995)`. Loading: spinner in accent, label "Signing in…". Error: border `#DC2626`.

### 6.3 Tags, pills, badges
Fully rounded, 1px gray-300 border, **10–11px uppercase mono**, muted text, padding `2px 8px`.
- **Active member / verified:** accent text on accent tint 10% background, accent border at 30%. Emerald is permitted here because it is semantic.
- **Featured / role chip (max one per view):** inverted. Ink fill, white text, no border.
- **Pending / neutral:** default gray style.

### 6.4 Inputs
Gray-50 fill, 1px line border, **6px radius**, 13–14px text (mono for reference numbers such as GCash refs). Mono micro-label caption above each field. Focus: border ink + the standard focus ring. Error: border `#DC2626`, helper text in error color at 12px.

### 6.5 Tables
No zebra, no tinted header. Header row: mono micro-labels in muted. Rows separated by 1px hairlines. Row hover: gray-50. Row actions are mono text links.

### 6.6 Modals
Full-viewport overlay: ink at 30% opacity + strong backdrop blur. Panel: max-width ~24rem, 16px radius, 1.75rem padding, modal shadow. Fades and scales 95% → 100% over 200ms. Escape closes. Focus is trapped and returned on close.

### 6.7 Icons
`lucide-react`, `strokeWidth={1.5}`. Default muted; hover ink (accent only when the icon marks an active/success state).

### 6.8 Section headers
The numbered convention, set in the pixel font at 13px, gray 400: `01 — roster`, `02 — dues`, `03 — handover`. A hairline rule runs under or beside it. Do not put section headers inside boxes.

---

## 7. Background layer, photo, floating icons (kept from v1)

These appear on **entry screens only** (`/signin`, `/register`, optionally `/setup` and landing). Signed-in app screens are flat canvas.

### 7.1 Geometric SVG layer (unchanged)
- Top-left: soft emerald circles (`fillOpacity 0.06`), concentric outlines (`strokeOpacity 0.35`), small accent tick polygon.
- Top-right: deep emerald radial gradient circle (`#059669` → `#10B981`) with an outer 10% ring.
- Bottom-right: emerald arc strokes and a solid accent sweep.
- Bottom-left: concentric pale mint circles (`fillOpacity 0.08`).
- Sits behind everything, `pointer-events: none`, `aria-hidden`.

### 7.2 Campus photo (kept, with a bryl-minimal dissolve)
- Grayscale `/campus-building.png`, bottom-left, `objectPosition: 0 100%`.
- Keep the dual directional mask fade:
  ```css
  mask-image: linear-gradient(to right, #000 50%, transparent 100%),
              linear-gradient(to top, #000 40%, transparent 100%);
  mask-composite: intersect;
  ```
- **Halftone accent (the one allowed per page):** overlay a monochrome dot field along the photo's fading edges so the building dissolves into dots. 1px-radius dots on a ~9px cell, ink at 90% alpha, faded with a radial mask. Use it here and nowhere else on the page.

### 7.3 Floating icons (kept)
Small Lucide icons (`Users`, `CalendarDays`, `QrCode`, `Wallet`, `Archive`, `ChartNoAxesCombined`) floating around the hero/card area.
- Each sits in a **40–48px tile**: surface fill, 1px line border, 12px radius, resting shadow, icon `strokeWidth 1.5` in muted, optional mono micro-label beneath (e.g. `MEMBERS`).
- Maximum 4–6 tiles, placed asymmetrically; never overlap the card's content.
- Idle drift: ≤ 6px vertical over 6–8s, ease-in-out, alternating. Disabled under reduced motion. Hidden below 1024px.

---

## 8. Motion

Brief, eased, one-directional. Nothing bounces.

- **Micro-interactions** (color, opacity, small transforms): 200ms.
- **Card hover:** shadow 350ms, transform 420ms, `cubic-bezier(0.16, 1, 0.3, 1)`.
- **Page entrance:** elements fade up from **12px** below over **700ms** on that curve, staggered ~70ms down the page (first at 50ms, capped around 330ms). Replaces v1's 0.22s card fade.
  ```css
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .reveal { animation: fadeUp 700ms var(--ease-out-soft) both; animation-delay: calc(var(--i, 0) * 70ms + 50ms); }
  ```
  Set `style={{ "--i": n }}` per element, capping `n` at 4.
- **Status dots** (e.g. live attendance, pending verification): opacity 1 → 0.25 → 1 on a 1.8s loop.
- **Spinner:** `0.75s linear infinite` rotation.
- **Reduced motion:** all of it off. The design must be complete when perfectly still.
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
    .reveal { animation: none; opacity: 1; transform: none; }
  }
  ```

---

## 9. Dark mode (optional, not required for sprint 2)

If added, it is a **token re-mapping**, not a redesign. Same roles, swapped values, via a `dark` class on `<html>`; support light / dark / system, persist the choice, default to system, crossfade colors 500ms, set `color-scheme` accordingly.

| Token | Dark value |
| :--- | :--- |
| Base | `#0C0C0F` |
| Surface | `#18181B` |
| Gray 50 | `#1E1E22` |
| Line | `#2A2A30` |
| Gray 300 | `#3A3A42` |
| Gray 400 | `#8A8A92` |
| Muted | `#A0A0A8` |
| Ink | `#F4F4F5` |
| Accent | `#10B981` (emerald 500; passes on dark) |
| Accent strong | `#34D399` |

Shadows nearly disappear in dark mode; rely on borders. Halftone dots become off-white at ~42% alpha. The SVG geometric layer keeps its tints.

---

## 10. Accessibility

- Semantic landmarks (`nav`, `main`, `header`, `article`) on every screen.
- Contrast (light theme): ink on surface 17.7:1 (AAA); ink on base 16.0:1 (AAA); muted `#71717A` on surface 4.8:1 (AA); accent-strong `#047857` on surface 5.5:1 (AA).
- **Accent `#059669` on white is 3.8:1.** Use it for large text, icons, fills, and badges. For small accent-colored text on white, use `#047857`.
- Gray 400 is decorative only (see §0.3). Mono micro-labels carrying real information use muted or darker, at 11px+.
- Every overlay closes with Escape; focus is trapped and restored.
- Visible `focus-visible` double ring on all interactive elements: `0 0 0 2px #fff, 0 0 0 4px #059669`.
- Honor `prefers-reduced-motion` and set `color-scheme` so native controls match the theme.
- Dynamic states ("Connecting to Google, please wait…") announced via `<div className="sr-only" aria-live="polite">`.

---

## 11. Anti-patterns: what makes it look generic

Do not:
- Use gradients on buttons, glassmorphism cards, glowing shadows, or purple/blue anywhere.
- Put icons in colored circles, or add emoji to UI.
- Use bold (700+) headings, all-caps sans-serif, or Title Case buttons.
- Wrap every section in a bordered box. Use hairline rules and whitespace.
- Add a second accent color, or use emerald as a large background inside the app.
- Make pill buttons, use `rounded-3xl`, or add heavy `shadow-xl` elevation.
- Fill empty states with illustrations. Use a short sentence in muted text plus one mono text link.
- Add decoration to signed-in screens "to make them less empty".

---

## 12. Checklist for new OrgKit pages

1. [ ] Canvas `#F4F4F5`, surfaces `#FFFFFF`, borders 1px `#E4E4E7`.
2. [ ] Page title in Geist Pixel, lowercase, ~3rem; sections labelled `01 — name`.
3. [ ] Body Geist 15px; headings weight 600 with `-0.02em`; small functional labels in Geist Mono 11px UPPERCASE.
4. [ ] Radii from the ladder (16 / 12 / 8 / 6); pills only for tags/badges.
5. [ ] Shadows from §5.3; no heavy elevation.
6. [ ] Only one accent (emerald), used for primary action, active, success. At most one inverted chip per view.
7. [ ] App screens sit in the sidebar shell; content within 42rem / 56rem (tables up to 72rem).
8. [ ] Entrance stagger applied; everything disabled under reduced motion.
9. [ ] No background art or floating icons inside the app; no more than one halftone accent per page.
10. [ ] Focus-visible rings, landmarks, and `aria-live` notices in place.
