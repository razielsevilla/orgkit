# OrgKit Design System & Style Guide (`design.md`)

This document is the official design specification for **OrgKit**, extracted from the production `/register` and `/signin` experiences. All subsequent pages, dashboards, components, and user flows should reference and adhere to these guidelines to ensure visual consistency, accessibility, and brand coherence.

> **Revision note: tactile refinement.** The OrgKit color palette, layout, radii, background artwork and component structure are unchanged. This revision layers in a precision, tactile feel (inspired by adrianabelarde.com): **Inter + JetBrains Mono, medium-weight text, tight heading tracking, diffuse minimalist shadows, a shared easing/motion system, press physics (`scale(0.97)`), staggered entrances, and hairline borders.** The 45-degree diagonal stripe ribbon, the `#f6f6f6` canvas, and the orange/green functional accents from that style are intentionally **not** adopted.

---

## 1. Brand Identity & Design Philosophy

OrgKit is a modern, reliable, and approachable platform built for student organization officers and members.

- **Purposeful Minimalism:** Clear hierarchy, ample negative space, and zero unnecessary visual clutter.
- **Dual-Accent Harmony:** A signature emerald green accent (`#059669`) serves as the primary brand anchor for success, completion, and growth. A warm amber / marigold companion accent (`#D97706` / `#F59E0B`) provides a vibrant, high-energy counterpoint for pending states, outstanding balances, reminders, and attention items, making OrgKit's design distinct, lively, and immediately recognizable.
- **Friendly Geometry:** Generously rounded corners (`rounded-3xl`, `rounded-full`) and inviting, polished surfaces. Borders are razor-thin hairlines and shadows are soft and diffuse.
- **Tactile Software (new):** Every hover, press, focus and state change gives instant, subtle physical feedback: a small lift, a press-in (`scale(0.97)`), a soft shadow bloom, a hairline border shift. Nothing snaps; everything settles.
- **Smooth, Never Showy (new):** Motion is fast to start and long to settle (quintic ease-out). It guides attention, never decorates. Elements cascade in with tiny offsets instead of popping in together.
- **Responsive Fluidity:** Uses fluid CSS `clamp(...)` scaling for typography, padding, card dimensions, and icon sizes across standard desktop, laptop, and mobile viewports.

---

## 2. Color Palette & Design Tokens

**Unchanged.** OrgKit uses a clean zinc neutral scale paired with an emerald accent and an explicit destructive red for validation errors.

### 2.1 Core Palette Table

| Token Name | Hex Code | Tailwind / CSS Variable | Description / Usage |
| :--- | :--- | :--- | :--- |
| **Base** | `#F4F4F5` | `var(--color-base)` / `zinc-100` | Full-screen page background, global canvas |
| **Surface** | `#FFFFFF` | `var(--color-surface)` / `white` | Cards, modals, elevated surfaces, Google button |
| **Ink** | `#18181B` | `var(--color-ink)` / `zinc-900` | Primary headings, button labels, main body text |
| **Ink Secondary** | `#3F3F46` | `zinc-700` | Feature list items, secondary labels |
| **Ink Muted** | `#52525B` | `zinc-600` | Disclaimers, footer notes, terms paragraphs |
| **Muted** | `#71717A` | `var(--color-muted)` / `zinc-500` | Subtitles, placeholders, captions, meta info |
| **Line** | `#E4E4E7` | `var(--color-line)` / `zinc-200` | Card borders, inputs, dividers, button outlines |
| **Line Subtle** | `rgba(228, 228, 231, 0.6)` | `border-line/60` | Floating card outer borders |
| **Divider Line** | `rgba(161, 161, 170, 0.6)` | `zinc-400/60` | Vertical feature item dividers |
| **Accent** | `#059669` | `var(--color-accent)` / `emerald-600` | Primary brand accent, punch words, active badges |
| **Accent Strong** | `#047857` | `var(--color-accent-strong)` / `emerald-700` | Hover states, high-contrast link text |
| **Accent Light** | `#10B981` | `emerald-500` | Radial gradient highlights and stop colors |
| **Accent Tint (6%)** | `rgba(5, 150, 105, 0.06)` | `emerald-600/6` | Background geometric rings and circles |
| **Accent Tint (10%)** | `rgba(5, 150, 105, 0.10)` | `emerald-600/10` / `bg-emerald-50` | Soft badges, outer decorative rings |
| **Amber (Standout Accent)** | `#D97706` | `var(--color-amber)` / `amber-600` | Standout secondary accent: pending reviews, reminders |
| **Amber Strong** | `#B45309` | `var(--color-amber-strong)` / `amber-700` | Outstanding amounts, high-contrast amber labels |
| **Amber Soft** | `#FEF3C7` | `var(--color-amber-soft)` / `amber-100` | Warm warning washes, pending badges |
| **Brand Deep** | `#054A38` | `var(--color-brand-deep)` | The wordmark's deep green. Brand titles (dialog headers). 10.3:1 on white |
| **Brand Tint** | Accent 8% over Surface | `var(--color-brand-tint)` | The faint emerald wash behind branded headers |
| **Error / Destructive**| `#DC2626` | `red-600` | Form validation errors, error borders (`data-error`) |

### 2.2 Tailwind CSS Configuration (v4)

Theme tokens are defined in `src/app/globals.css`. The color tokens are the same as before; font, shadow and motion tokens are new (see sections 3, 4.2 and 7.1).

```css
@import "tailwindcss";

:root {
  /* Colors (unchanged) */
  --color-base: #f4f4f5;
  --color-surface: #ffffff;
  --color-ink: #18181b;
  --color-muted: #71717a;
  --color-line: #e4e4e7;
  --color-accent: #059669;
  --color-accent-strong: #047857;

  /* Motion (new) */
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);     /* snappy start, silky settle: hovers, presses, chips */
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1); /* fluid symmetric transitions */
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);  /* mechanical unfolding: sidebar drawer, sheets */
  --ease-spring: cubic-bezier(0.16, 1, 0.3, 1);   /* entrances: cards, dialogs, page sections */
  --t-fast: 180ms;
  --t-base: 280ms;
  --t-slow: 450ms;

  /* Shadows (new, ink-tinted, see 4.2) */
  --shadow-rest: 0 1px 2px rgba(24, 24, 27, 0.03), 0 4px 16px -4px rgba(24, 24, 27, 0.04);
  --shadow-hover: 0 1px 2px rgba(24, 24, 27, 0.04), 0 6px 20px -4px rgba(24, 24, 27, 0.07);
  --shadow-pressed: 0 1px 2px rgba(24, 24, 27, 0.04);
  --shadow-card: 0 1px 3px rgba(24, 24, 27, 0.03), 0 8px 28px -6px rgba(24, 24, 27, 0.07);
  --shadow-dialog: 0 2px 6px rgba(24, 24, 27, 0.04), 0 20px 48px -12px rgba(24, 24, 27, 0.14);
}

@theme inline {
  --font-sans: var(--font-inter), "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --font-mono: var(--font-jetbrains), "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
}

.bg-base { background-color: var(--color-base); }
.bg-surface { background-color: var(--color-surface); }
.text-ink { color: var(--color-ink); }
.text-muted { color: var(--color-muted); }
.border-line { border-color: var(--color-line); }
.bg-accent { background-color: var(--color-accent); }
.bg-accent-strong { background-color: var(--color-accent-strong); }
.text-accent { color: var(--color-accent); }
.text-accent-strong { color: var(--color-accent-strong); }

/* High-contrast selection (new) */
::selection {
  background: var(--color-ink);
  color: var(--color-surface);
}
```

---

## 3. Typography Hierarchy

### 3.1 Font Family
- **Primary:** `Inter` via `next/font/google` (`subsets: ["latin"]`, `variable: "--font-inter"`, `display: "swap"`). Use the variable font so intermediate weights such as `450` and `500` render correctly.
  - `font-family: var(--font-inter), "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;`
- **Monospace:** `JetBrains Mono` via `next/font/google` (`variable: "--font-jetbrains"`, weights `400`, `500`).
  - Use for technical or tabular detail: GCash reference numbers, timestamps, attendance codes, invite codes, member IDs, status tags, counts and file pills. Never for headings or paragraphs.
  - `font-family: var(--font-jetbrains), "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;`
- **Default body weight is Medium (`500`).** This is the defining trait of the typography: crisp authority and better optical readability on every screen.
- **Heading weight is Semi-Bold (`600`) or Bold (`700`).** Extra-bold (`800`) is retired.
- **Numerals:** use `font-variant-numeric: tabular-nums` on dues amounts, counts and tables so figures stay aligned.
- **Rendering:** `-webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility;` on `body`.

### 3.2 Typography Scale

Sizes stay fluid. Weight and tracking are what changed.

| Level | Size (Fluid / Responsive) | Weight | Line Height | Letter Spacing | Color | Notes / Usage |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Display H1** | `clamp(38px, 3.83vw, 64px)` | 700 | 1.1 | `-0.035em` | `#18181B` (Accent `#059669` for lead word) | Hero headings ("Organize. Collaborate. Lead.") |
| **Card H2** | `clamp(26px, 2.39vw, 40px)` | 600 | 1.2 | `-0.025em` | `#18181B` | Auth card titles ("Welcome back", "Create Your Account") |
| **Section H3** | `clamp(20px, 1.8vw, 28px)` | 600 | 1.25 | `-0.02em` | `#18181B` | Modal titles, section headers |
| **Hero Subtitle** | `clamp(16px, 1.44vw, 24px)` | 450 | 1.35 | `-0.01em` | `#71717A` | Marketing subcopy under H1 |
| **Card Subtitle** | `clamp(14px, 1.26vw, 21px)` | 450 | 1.45 | `-0.01em` | `#71717A` | Explanatory copy under Card H2 (max-width: 440px) |
| **Body** | `14.5px - 16px` | 500 | 1.55 | normal | `#18181B` / `#3F3F46` | Default paragraph and UI text |
| **Button Label** | `clamp(17px, 1.44vw, 24px)` | 500 | 1.2 | `-0.01em` | `#18181B` | Google Auth Button label |
| **Standard CTA** | `14px - 16px` | 600 | 1.2 | `-0.01em` | `#FFFFFF` | Standard action button text |
| **Feature Item** | `clamp(13px, 0.93vw, 15.5px)` | 500 | 1.2 | normal | `#3F3F46` | Marketing feature labels |
| **Caption / Legal**| `clamp(13px, 0.95vw, 15px)` | 500 | 1.5 | normal | `#52525B` | Terms, privacy notice, sublinks |
| **Text Link** | `13px - 15px` | 600 / 700 | 1.5 | normal | `#059669` (hover: `#047857`) | Underline on hover, focus ring |
| **Mono Tag / Badge** | `11px - 12px` | 500 | 1 | `0.02em` | per badge | JetBrains Mono: statuses, timestamps, references |

---

## 4. Spacing, Sizing & Radii

### 4.1 Border Radii
Unchanged.
- **Full / Pill (`rounded-full` / `9999px`):** Primary auth buttons, chips, status pills.
- **Card Container (`clamp(20px, 1.67vw, 28px)`):** Auth cards, floating modals, main container panels.
- **Inner Surface (`rounded-2xl` / `16px`):** Notice callouts, info boxes, form groupings.
- **Component / Input (`rounded-xl` / `12px` or `rounded-lg` / `8px`):** Input fields, interactive controls.
- **Focus / Inline Elements (`rounded-[2px]`):** Inline hyperlinks with focus outline offset.

### 4.2 Elevation & Shadows (minimalist, diffuse, ink-tinted)

Shadows are two layers: a 1px contact shadow plus a wide, soft, negatively-spread bloom. They are always tinted with ink (`rgba(24, 24, 27, ...)`), never pure black, and kept at a few percent opacity so surfaces feel like they float rather than sit in a box. Use the tokens, not ad-hoc values.

| Token | Value | Use |
| :--- | :--- | :--- |
| `--shadow-rest` | `0 1px 2px rgba(24,24,27,.03), 0 4px 16px -4px rgba(24,24,27,.04)` | Cards, inputs on focus-free rest, buttons, chips at rest |
| `--shadow-hover` | `0 1px 2px rgba(24,24,27,.04), 0 6px 20px -4px rgba(24,24,27,.07)` | Hovered buttons, chips, interactive cards |
| `--shadow-pressed` | `0 1px 2px rgba(24,24,27,.04)` | Active / pressed state |
| `--shadow-card` | `0 1px 3px rgba(24,24,27,.03), 0 8px 28px -6px rgba(24,24,27,.07)` | Auth cards and main floating panels |
| `--shadow-dialog` | `0 2px 6px rgba(24,24,27,.04), 0 20px 48px -12px rgba(24,24,27,.14)` | Dialogs and drawers only |

- **Interactive Button (Resting):** `box-shadow: var(--shadow-rest);`
- **Interactive Button (Hover):**
  ```css
  box-shadow: var(--shadow-hover);
  transform: translateY(-1px);
  ```
- **Interactive Button (Active / Pressed):**
  ```css
  box-shadow: var(--shadow-pressed);
  transform: scale(0.97);
  ```
- **Accessible Focus Ring (dual ring, emerald kept):**
  ```css
  outline: none;
  box-shadow: 0 0 0 2px var(--color-base), 0 0 0 4px #059669;
  /* on a white surface, use #FFFFFF for the inner ring instead of base */
  ```
- **Hairline borders:** containers use `1px solid var(--color-line)` (razor-thin). The old 2px outline on the Google button becomes 1px; a 2px border is only for error and selected states where emphasis is the point.

---

## 5. Layout Architecture & Screen Templates

### 5.1 Split-Pane Layout (Desktop `>= 1024px`)
- **Viewport Constraints:** Strict `100vw` / `100vh` zero-scroll policy for auth (`overflow: hidden`).
- **Gutters:**
  - `padding-left: clamp(32px, 10.5vw, 175px)`
  - `padding-right: clamp(32px, 10.1vw, 170px)`
- **Left Pane (Brand & Marketing):**
  - OrgKit wordmark logo (`/orgkit-text-logo.png`, `clamp(150px, 13vw, 220px)` width).
  - Bold 3-line headline with accent finish.
  - Subtitle with high-readability line breaks.
  - 3-column horizontal feature summary separated by 1.5px subtle dividers:
    - *Manage Members* (`Users` icon)
    - *Organize Events* (`CalendarDays` icon)
    - *Track Activities* (`ChartNoAxesCombined` icon)
- **Right Pane (Action Container):**
  - Fluid width floating card: `width: clamp(380px, 33.85vw, 566px)`, `maxWidth: 566px`.
  - Padding: `clamp(24px, 4.25vh, 40px) clamp(24px, 2.69vw, 45px)`.
  - Shadow: `var(--shadow-card)`, border `1px solid rgba(228, 228, 231, 0.6)`.
- **Entrance:** left-pane items and the card enter with the staggered rise from section 7.1 (logo, headline, subtitle, features, card, in that order).

### 5.2 Background Artistic Treatment
Unchanged.
- **Abstract Geometric Vector Layer (SVG):**
  - Top-Left: Soft emerald circular backdrops (`fillOpacity="0.06"`), concentric circle outlines (`strokeOpacity="0.35"`), and tiny geometric accent tick (`polygon`).
  - Top-Right: Deep emerald gradient circle (`radialGradient` `#059669` to `#10B981`) paired with outer 10% opacity ring.
  - Bottom-Right: Emerald arc strokes and solid accent sweep.
  - Bottom-Left: Concentric pale mint base circles (`fillOpacity="0.08"`).
- **Campus Photographic Anchor:**
  - Grayscale campus building photo (`/campus-building.png`) placed at bottom-left (`objectPosition: "0 100%"`).
  - Dual directional mask fade:
    ```css
    mask-image: linear-gradient(to right, rgba(0,0,0,1) 50%, transparent 100%),
                linear-gradient(to top, rgba(0,0,0,1) 40%, transparent 100%);
    mask-composite: intersect;
    ```
- The artwork stays static and decorative. It does not take part in the stagger and is never animated on hover.
- There is **no top stripe ribbon** in OrgKit. Do not add one.

### 5.3 Mobile Layout (`< 1024px`)
- Background decorative layer and marketing feature items gracefully hide (`display: none !important`).
- Body reverts to standard responsive vertical scrolling (`overflow-y: auto !important`).
- Card expands to fill mobile container up to `440px` with `padding: 32px 16px 48px 16px`.

### 5.4 Phones and touch screens (T2)

Every core screen has to work at **360px wide** with no sideways scrolling, and every control has to be easy to hit with a thumb. Check a change in browser device mode and on a real phone with [mobile-qa.md](mobile-qa.md).

**Breakpoints** (there are only these; do not add a new one without a reason):

| Width | What changes |
| :--- | :--- |
| `< 1024px` | The workspace sidebar becomes a **drawer**, opened from a slim top bar with a 44px menu button. The page gets the full width. The auth screens use the mobile layout (5.3). |
| `<= 800px` | The Dues list shows cards instead of its table (the table needs about 650px). |
| `<= 640px` | The Members list, attendance, and usage report show cards. A dialog's buttons stack full width, the main action on top. Pagers show "Page 2 of 5" instead of numbered pages. |
| `(pointer: coarse)` | Any touch screen gets the 44px targets below, whatever its width. |

**Touch targets.** On a phone, or any touch screen (`@media (max-width: 640px), (pointer: coarse)`), every control is at least **44px** tall and wide. A mouse on a desktop keeps the denser sizes in this guide. The rules are central, in `globals.css`, so a new control gets them for free:
- Every `button`, `[role="button"]`, `[role="option"]`, `[role="tab"]`, `[role="menuitem"]`, `select` and text field is at least 44px. `!important` is needed because most sizes are inline.
- A link on its own line (a back link, a logo) takes `className="orgkit-tap-link"`. A link inside a sentence stays text-sized.
- A checkbox or radio is tiny: wrap it in a `label` with `className="orgkit-check-row"`, so the whole row is the target.
- Text fields are **16px** on a phone. iOS zooms the whole page in when a smaller field is focused, and the zoomed page then pans sideways.

**Touch and motion.** Hover lifts (`translateY(-1px)`) and hover shadow blooms are wrapped in `@media (hover: hover)` so they never stick after a tap. The press-in (`scale(0.97)`) applies everywhere, because it is the touch feedback.

**Sizes.**
- Use **`100dvh`**, never `100vh`: on a phone `100vh` is taller than the visible screen and hides the bottom under the browser toolbar. A test fails if `"100vh"` appears in `src`. (A stylesheet that needs a fallback for older browsers writes `100vh` then `100dvh`, as in `frame-styles.tsx`.)
- Nothing has a fixed width over **328px** (360px less 16px each side). Use `min()`, `clamp()`, a percentage or `maxWidth: "100%"`. A test fails on a new wide fixed width.
- A flex row that can run out of room has `flex-wrap: wrap`. A flex child that holds text or an input has `min-width: 0`, or it will not shrink. In a column, do not keep a `flex: 1 1 280px` basis: it becomes a height.

**Text that people type** (names, emails, org and period names, links, reasons) never widens a layout. It wraps (`overflow-wrap: anywhere`, or the `.orgkit-wrap` class) or shortens with an ellipsis (`.orgkit-truncate`, with `min-width: 0` on the flex parent).

**Dialogs.** Put the content in `DialogBody` (it scrolls, so the buttons stay reachable on a short phone), never pass `padding` to `Dialog`, and never put a `position: fixed` element inside a dialog: the dialog card keeps a transform, which makes a fixed child size to the card, not the screen. Draw toasts and lightboxes through a portal into `document.body`.

**Stacking order** (z-index): content below 900; the Feedback button 900; the drawer scrim 950; the drawer 960; dialogs 1000; the officer tour (dim layer, ring, card) 1010 to 1012, above everything else because nothing else is meant to be used while it runs. The error toast sits above the Feedback button on a phone.

**Scrolling screens** leave at least 60px under the last row (72px on the events list), so the Feedback button never covers it.

---

## 6. Component Specs & Patterns

### 6.1 Authentication Card
Every auth card follows this exact sequence:
1. **OrgKit Icon Logo:** Centered top icon (`/orgkit-logo.png`, width `clamp(64px, 5.5vw, 92px)`).
2. **Title H2:** Primary card heading (`Welcome back` / `Create Your Account`).
3. **Subtitle:** Centered muted guidance text (`max-width: 440px`).
4. **Primary Interaction Area:** High-visibility Google OAuth button or form inputs.
5. **Secondary Information:**
   - Legal consent string: "By continuing, you agree to our [Terms](/terms) and [Privacy Policy](/privacy)."
   - Toggle route prompt: "New to OrgKit? [Sign up](/register)" / "Already have an account? [Sign in](/signin)".

Each of the five parts takes a stagger class (`stagger-1` to `stagger-5`, see 7.1) so the card builds itself top to bottom.

### 6.2 Google OAuth Button
- **Structure:** Pill button (`border-radius: 9999px`), height `clamp(52px, 7.65vh, 72px)`.
- **Styling:** White surface `#FFFFFF`, **1px** solid line `#E4E4E7`, text `#18181B`, shadow `var(--shadow-rest)`.
- **Transition:** `transition: transform var(--t-fast) var(--ease-out), box-shadow var(--t-fast) var(--ease-out), background-color var(--t-fast) var(--ease-out), border-color var(--t-fast) var(--ease-out);`
- **States:**
  - *Hover (pointer devices):* Background `#FAFAFA`, border `#D4D4D8`, shadow `var(--shadow-hover)`, `translateY(-1px)`.
  - *Active:* Background `#F4F4F5`, shadow `var(--shadow-pressed)`, `scale(0.97)`.
  - *Focus-Visible:* Dual ring (`2px #FFFFFF`, `4px #059669`).
  - *Error State (`data-error="true"`):* Border `#DC2626`.
  - *Loading State:* Spinner icon (`#059669` sweep) with label updating to "Signing in...".

### 6.3 Links & Interactive Text
- **Class:** `.orgkit-terms-link` / `.orgkit-signin-link`
- **Color:** `#059669` (Emerald 600)
- **Weight:** 600 (Terms) or 700 (Sign In / Sign Up switches)
- **Hover:** Underline, text `#047857` (Emerald 700), `transition: color var(--t-fast) var(--ease-out)`
- **Keyboard Focus:** `outline: 2px solid #059669; outline-offset: 2px;`

### 6.4 Iconography & Micro-interactions
- **Library:** `lucide-react` with `strokeWidth={1.5}`.
- **Micro-interaction:** Feature row items use `transition: transform var(--t-fast) var(--ease-out)`.
  - On hover: Item moves `-1px` on Y axis.
  - Icon shifts color to `#059669` and scales `scale(1.08)`.
  - Label shifts from `#3F3F46` to `#18181B`.

### 6.5 Dialogs (modals)

Every modal in the app wears the same OrgKit frame: an emerald-tinted header strip with the brand mark, the title in the wordmark's deep green, and one shared set of buttons. A dialog is never built from scratch: no hand-made close button, icon box or `<h2>`, and no custom button styles.

**Anatomy**

```
┌──────────────────────────────────────┐
│ ░░ [mark]  Edit member            ✕ ░│  ← DialogHeader: brand tint, mark tile,
│ ░░         One quiet line            │    deep-green title, optional description
├──────────────────────────────────────┤
│                                      │
│   Content (scrolls if the window     │  ← DialogBody
│   is short)                          │
│                                      │
│              [ Cancel ]  [ Save ]    │  ← DialogFooter: main action last
└──────────────────────────────────────┘
```

**Components** (all exported from `src/components/ui/dialog.tsx`)

| Component | Job |
| :--- | :--- |
| `Dialog` | The frame: portal, backdrop, card, focus trap, Escape and backdrop dismissal. Leave `padding` at its default of `0` |
| `DialogHeader` | Brand mark, title (the `<h2>`, `id` = `titleId`), optional one-line `description`, optional close button |
| `DialogBody` | The content, padded `20px 24px`. It is the part that scrolls, so the header and buttons stay in view |
| `DialogFooter` | The button row, right-aligned, `gap: 10px`, padded `4px 24px 24px` |
| `DialogButton` | `variant`: `primary`, `secondary` (default) or `danger` |

```tsx
<Dialog labelledBy="edit-member-title" onDismiss={onClose} maxWidth={460}>
  <DialogHeader titleId="edit-member-title" title="Edit member" description="Update their name or email" onClose={onClose} closeLabel="Close edit dialog" />
  <DialogBody>{/* fields */}</DialogBody>
  <DialogFooter>
    <DialogButton onClick={onClose}>Cancel</DialogButton>
    <DialogButton variant="primary" type="submit">Save changes</DialogButton>
  </DialogFooter>
</Dialog>
```

**The frame**
- **Card:** `var(--radius-panel)` (20px), `1px solid var(--color-line)`, shadow `var(--shadow-dialog)`, `overflow: hidden` so the header clips to the corners, `max-height: calc(100dvh - 32px)`.
- **Backdrop:** ink at 45% with `blur(8px)`. It fades in over `var(--t-base)` with `var(--ease-out)`.
- **Entrance:** `cardPopout`, **0.28s** with `var(--ease-spring)`: from `opacity: 0; transform: translateY(8px) scale(0.985)` to rest. **Exit:** 0.18s fade with `var(--ease-out)`, no movement.
- **Width by use:** 420 to 440 for confirmations and notices, 460 to 480 for forms and the invite panels, 600 for the import flow.

**The header**
- **Strip:** `padding: 16px 16px 16px 24px`, background `var(--color-brand-tint)`, bottom line accent at 18%.
- **Mark tile:** 44px square, 12px radius, white surface, hairline of accent at 24%. The OrgKit mark inside (30 × 22px) is the silhouette `/orgkit-logo-mask.png` used as a CSS mask over `var(--color-accent)`, so it needs no extra image.
- **Title:** 18px, weight 600, line-height 1.25, `-0.02em`, color `var(--color-brand-deep)`.
- **Description:** 13px, weight 500, `var(--color-muted-strong)` (needs 4.5:1 on the tint; muted is too light here). Keep it to about 90 characters, otherwise put the text in the body.
- **Close button:** 32px round icon (44px on phones and touch screens, see 5.4), `var(--color-muted-strong)`, hover accent at 12% with the title green, press `scale(0.95)`. Disabled while something is saving.

**Buttons** (`.orgkit-dialog-btn` in `globals.css`): 40px high (44px on phones and touch screens, see 5.4), `0 20px` padding, 10px radius, 14px weight 600, `-0.01em`. On a phone the footer stacks the buttons full width with the main action on top (`.orgkit-dialog-footer`).

| Variant | Fill | Hover | Use |
| :--- | :--- | :--- | :--- |
| `primary` | `--color-accent`, `--color-on-accent` text | `--color-accent-strong` | The one main action |
| `secondary` | `--color-surface`, `--color-line-strong` border, ink text | `--color-base-soft` | Cancel, back, copy |
| `danger` | `--color-danger`, white text | `--color-danger-strong` | Confirming a destructive action only |

Hover changes color only (no lift), with `transition: background-color var(--t-fast) var(--ease-out), border-color var(--t-fast) var(--ease-out), transform var(--t-fast) var(--ease-out)`. Press is `scale(0.97)`. Disabled is 60% opacity. A saving button stays disabled and shows a 16px `Loader2` with the `spin` keyframe.

**Destructive dialogs** (deactivate member, remove officer) use the same frame, not a red one. Only the confirm button is `danger`, and the consequence sits in a warning note in the body: a 16px `AlertCircle` plus one sentence on `--color-danger-soft`, 1px `--color-danger-line` border, 10px radius, text `--color-danger-strong`.

**Forms inside dialogs**
- Labels 13px weight 500 in `--color-ink-soft`. Inputs 40px high (44px and 16px text on phones and touch screens, see 5.4), 10px radius, `1px solid var(--color-line-strong)`, weight 500.
- Inputs transition `border-color` and `box-shadow` over `var(--t-fast)` with `var(--ease-out)`.
- Focus uses the global emerald ring (`:focus-visible`, see 7.2).
- A **field error** is the `FieldError` component (`src/components/ui/field-error.tsx`) directly under the input: a 14px `AlertCircle` and one 13px sentence in `--color-danger-strong`, with no box or fill. The input gets a `--color-danger-strong` border, `aria-invalid`, and `aria-describedby` pointing at the message's `id`. Clear it as soon as the user edits the field. The message eases in with the accordion pattern (7.1) instead of popping in and shifting the layout.
- A **form error** (the save failed, not one field) is a banner at the top of the body: `--color-danger-soft` fill, 1px `--color-danger-line` border, 10px radius, `--color-danger-strong` text, `role="alert"`.

**Behaviour**
- Pass `titleId` and `labelledBy` the same id so the dialog is announced by its title.
- A dialog the user must acknowledge uses `role="alertdialog"`. One that only its own buttons may close leaves out both `onClose` on the header and `onDismiss` on the dialog (the access-revoked notice).
- While saving, set `onDismiss` to `undefined` and `closeDisabled` so it cannot be closed mid-request.
- Put `data-autofocus` on the control that should receive focus first (usually the primary action or first field).
- A multi-step flow (the import dialog) has one header for all steps: the title stays, the `description` names the current step, and the step indicator sits at the top of the body.
- Copy: sentence case titles, no trailing period on titles, labels or buttons, no exclamation marks.

**Do not:** pass `padding` to `Dialog`; build a separate close button, icon box or `<h2>`; hardcode red hex values (use the danger tokens); use `transition: all`; or make a dialog red-tinted.

### 6.6 Chips, Badges & Interactive Cards (new)

Pills and clickable cards share one tactile recipe. Status pills that are not clickable (Active, Pending, Paid) get the shape and type only, no motion.

```css
.orgkit-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: 9999px;
  font-size: 13.5px;
  font-weight: 500;
  letter-spacing: -0.01em;
  color: var(--color-ink);
  box-shadow: var(--shadow-rest);
  cursor: pointer;
  transition:
    transform var(--t-fast) var(--ease-out),
    box-shadow var(--t-fast) var(--ease-out),
    border-color var(--t-fast) var(--ease-out);
}

@media (hover: hover) {
  .orgkit-chip:hover,
  .orgkit-card-hover:hover {
    border-color: var(--color-ink);
    transform: translateY(-1px);
    box-shadow: var(--shadow-hover);
  }
}

.orgkit-chip:active,
.orgkit-card-hover:active {
  transform: scale(0.97);
  box-shadow: var(--shadow-pressed);
}
```

- **Hover border:** on neutral chips and cards the hairline darkens to ink. On primary (emerald) elements the border stays accent; do not turn emerald elements ink.
- **Mono badges:** timestamps, references and counts use the *Mono Tag / Badge* row of the type scale.

---

## 7. Motion & Accessibility Standards

### 7.1 Animations & Transitions

**Principles**
1. **Fast in, slow out.** Use `--ease-out` (quintic) for anything the user triggers; the start is sharp and the settle is long and silky.
2. **Entrances use `--ease-spring`.** Content arrives, it is not dropped.
3. **Cascade, do not pop.** Related elements enter with 80ms offsets.
4. **Animate only `transform`, `opacity`, and the properties you list.** Never `transition: all`.
5. **Durations:** `--t-fast` (180ms) hovers, presses, color shifts; `--t-base` (280ms) dialogs, popovers, tab changes; `--t-slow` (450ms) drawers and large layout moves; `0.7s` page and card entrances only.

**Easing curves** are the `--ease-*` tokens in 2.2. `--ease-drawer` is for the mobile sidebar drawer and bottom sheets.

**Card / section entrance (replaces `orgkitCardFadeIn`):**
```css
@keyframes orgkitSmoothRise {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.99);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.orgkit-card,
.stagger-1 { animation: orgkitSmoothRise 0.7s var(--ease-spring) both; }
.stagger-2 { animation: orgkitSmoothRise 0.7s var(--ease-spring) 0.08s both; }
.stagger-3 { animation: orgkitSmoothRise 0.7s var(--ease-spring) 0.16s both; }
.stagger-4 { animation: orgkitSmoothRise 0.7s var(--ease-spring) 0.24s both; }
.stagger-5 { animation: orgkitSmoothRise 0.7s var(--ease-spring) 0.32s both; }
```
- Use the stagger on first load of a page or card only. Never re-run it on data refreshes, tab switches or list updates.
- Lists (members, dues rows) may stagger their first 8 rows at `0.04s` steps, then render the rest without delay.

**Press physics (global):**
```css
button:active:not(:disabled),
[role="button"]:active,
.orgkit-chip:active,
.orgkit-dialog-btn:active:not(:disabled) {
  transform: scale(0.97);
}
```
This replaces the older `translateY(0.5px) scale(0.995)` and `scale(0.98)` presses.

**Zero-jank expansion** (accordions, field errors, inline notes, "show more"). Do not use `display: none` or conditional unmounting for content that expands:
```css
.orgkit-collapse {
  display: grid;
  grid-template-rows: 1fr;
  opacity: 1;
  transition:
    grid-template-rows 0.4s var(--ease-spring),
    opacity var(--t-base) ease;
}

.orgkit-collapse.is-collapsed {
  grid-template-rows: 0fr;
  opacity: 0;
  pointer-events: none;
}

.orgkit-collapse > .orgkit-collapse-inner {
  overflow: hidden;
}
```

**Spinner:**
```css
@keyframes orgkitSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.orgkit-spinner {
  animation: orgkitSpin 0.75s linear infinite;
}
```

**Drawer (mobile sidebar):** slides with `transform: translateX(...)` over `var(--t-slow)` using `var(--ease-drawer)`; the scrim fades over `var(--t-base)`.

### 7.2 Accessibility & Reduced Motion
- **Scrollbars:** set once in `globals.css` for every scroll area. A 12px bar with a clear track, no arrow buttons, and a rounded thumb (`--color-ink` at 22%, inset by a 3px transparent border) that turns emerald on hover and while dragged. Do not style a scrollbar on an individual component.
- **Selection:** `::selection` is ink on white (see 2.2) for every element. Contrast is 17.7:1.
- **WCAG Compliance:**
  - Ink (`#18181B`) on Surface (`#FFFFFF`): **17.7:1** (AAA).
  - Ink (`#18181B`) on Base (`#F4F4F5`): **16.0:1** (AAA).
  - Muted (`#71717A`) on Surface (`#FFFFFF`): **4.8:1** (AA).
  - Accent Strong (`#047857`) on Surface (`#FFFFFF`): **5.5:1** (AA).
- **Reduced Motion:** all new movement (stagger, rise, lift, press, collapse) is removed or flattened.
  ```css
  @media (prefers-reduced-motion: reduce) {
    * {
      animation-duration: 0.01ms !important;
      animation-delay: 0ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
    .stagger-1, .stagger-2, .stagger-3, .stagger-4, .stagger-5,
    .orgkit-card {
      opacity: 1 !important;
      transform: none !important;
    }
    .orgkit-google-btn:hover,
    .orgkit-google-btn:active,
    .orgkit-feature-item:hover,
    .orgkit-chip:hover,
    .orgkit-chip:active,
    .orgkit-card-hover:hover,
    .orgkit-card-hover:active,
    .orgkit-dialog-btn:active {
      transform: none !important;
    }
  }
  ```
- **Screen Reader Announcements:** Dynamic states (e.g. "Connecting to Google, please wait...") are enclosed in an `<div className="sr-only" aria-live="polite">` element.

---

## 8. Checklist for Future OrgKit Pages

When building new views (e.g., dashboard, member directory, event manager):
1. [ ] **Background:** Keep base canvas at `#F4F4F5`.
2. [ ] **Cards:** Use `#FFFFFF` surfaces with `rounded-3xl` (or `rounded-2xl` for widgets), `var(--shadow-card)`, and a hairline `1px solid rgba(228, 228, 231, 0.6)`.
3. [ ] **Borders:** Always 1px hairlines; 2px only for error or selected states.
4. [ ] **Typography:** Use `Inter` at **weight 500** for body, 600/700 for headings, with tight negative tracking (`-0.025em` to `-0.035em`). Use `JetBrains Mono` only for references, timestamps, codes and counts.
5. [ ] **Color Accent:** Limit primary positive calls to `#059669` (hover `#047857`). Never introduce uncoordinated secondary hues.
6. [ ] **Buttons:** Round interactive action buttons to `rounded-full` with hover lift (pointer devices only) and `:active { transform: scale(0.97); }`.
7. [ ] **Shadows:** Use the `--shadow-*` tokens only. No pure-black shadows and no one-off values.
8. [ ] **Motion:** Transitions use `--ease-out` or `--ease-spring` and list their properties (never `transition: all`). Entrances cascade with `stagger-*`. Expanding content uses `.orgkit-collapse`.
9. [ ] **Accessibility:** Maintain visible `focus-visible` double rings, screen reader notices, and the reduced-motion overrides for anything new that moves.
10. [ ] **Dialogs:** Build every modal from `Dialog`, `DialogHeader`, `DialogBody`, `DialogFooter` and `DialogButton` (section 6.5). Never hand-build a modal header or its buttons.
11. [ ] **Phones:** Works at 360px with no sideways scroll; controls 44px on touch; `100dvh`; no fixed width over 328px; typed text wraps or truncates; hover effects behind `@media (hover: hover)` (section 5.4). Walk it through [mobile-qa.md](mobile-qa.md).
12. [ ] **No stripes ribbon:** the diagonal top band from the reference style is not part of OrgKit.
