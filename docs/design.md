# OrgKit Design System & Style Guide (`design.md`)

This document is the official design specification for **OrgKit**, extracted directly from the production `/register` and `/signin` experiences. All subsequent pages, dashboards, components, and user flows should reference and adhere to these guidelines to ensure visual consistency, accessibility, and brand coherence.

---

## 1. Brand Identity & Design Philosophy

OrgKit is a modern, reliable, and approachable platform built for student organization officers and members.

- **Purposeful Minimalism:** Clear hierarchy, ample negative space, and zero unnecessary visual clutter.
- **Single-Accent Discipline:** A signature emerald green accent (`#059669`) is the *only* semantic hue on neutral canvases. When something is green, it communicates action, growth, vitality, or success.
- **Friendly Geometry:** Generously rounded corners (`rounded-3xl`, `rounded-full`), soft elevated drop shadows, and subtle border lines create an inviting, polished modern aesthetic.
- **Responsive Fluidity:** Uses fluid CSS `clamp(...)` scaling for typography, padding, card dimensions, and icon sizes across standard desktop, laptop, and mobile viewports.

---

## 2. Color Palette & Design Tokens

OrgKit uses a clean zinc neutral scale paired with an emerald accent and an explicit destructive red for validation errors.

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
| **Error / Destructive**| `#DC2626` | `red-600` | Form validation errors, error borders (`data-error`) |

### 2.2 Tailwind CSS Configuration (v4)

Theme tokens are defined in `src/app/globals.css`:

```css
@import "tailwindcss";

:root {
  --color-base: #f4f4f5;
  --color-surface: #ffffff;
  --color-ink: #18181b;
  --color-muted: #71717a;
  --color-line: #e4e4e7;
  --color-accent: #059669;
  --color-accent-strong: #047857;
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
```

---

## 3. Typography Hierarchy

### 3.1 Font Family
- **Primary:** `Plus Jakarta Sans` via `next/font/google` (`subsets: ["latin"]`, weights: `400`, `500`, `600`, `700`, `800`).
- **System Fallback:** `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`.

### 3.2 Typography Scale

| Level | Size (Fluid / Responsive) | Weight | Line Height | Letter Spacing | Color | Notes / Usage |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Display H1** | `clamp(38px, 3.83vw, 64px)` | 800 | 1.05 | `-0.025em` | `#18181B` (Accent `#059669` for lead word) | Hero headings ("Organize. Collaborate. Lead.") |
| **Card H2** | `clamp(26px, 2.39vw, 40px)` | 700 | 1.15 | `-0.015em` | `#18181B` | Auth card titles ("Welcome back", "Create Your Account") |
| **Section H3** | `clamp(20px, 1.8vw, 28px)` | 700 | 1.25 | `-0.01em` | `#18181B` | Modal titles, section headers |
| **Hero Subtitle** | `clamp(16px, 1.44vw, 24px)` | 400 | 1.25 | normal | `#71717A` | Marketing subcopy under H1 |
| **Card Subtitle** | `clamp(14px, 1.26vw, 21px)` | 400 | 1.38 | normal | `#71717A` | Explanatory copy under Card H2 (max-width: 440px) |
| **Button Label** | `clamp(17px, 1.44vw, 24px)` | 500 | 1.2 | normal | `#18181B` | Google Auth Button label |
| **Standard CTA** | `14px - 16px` | 600 | 1.2 | normal | `#FFFFFF` | Standard action button text |
| **Feature Item** | `clamp(13px, 0.93vw, 15.5px)` | 500 | 1.2 | normal | `#3F3F46` | Marketing feature labels |
| **Caption / Legal**| `clamp(13px, 0.95vw, 15px)` | 400 | 1.5 | normal | `#52525B` | Terms, privacy notice, sublinks |
| **Text Link** | `13px - 15px` | 600 / 700 | 1.5 | normal | `#059669` (hover: `#047857`) | Underline on hover, focus ring |

---

## 4. Spacing, Sizing & Radii

### 4.1 Border Radii
- **Full / Pill (`rounded-full` / `9999px`):** Primary auth buttons, chips, status pills.
- **Card Container (`clamp(20px, 1.67vw, 28px)`):** Auth cards, floating modals, main container panels.
- **Inner Surface (`rounded-2xl` / `16px`):** Notice callouts, info boxes, form groupings.
- **Component / Input (`rounded-xl` / `12px` or `rounded-lg` / `8px`):** Input fields, interactive controls.
- **Focus / Inline Elements (`rounded-[2px]`):** Inline hyperlinks with focus outline offset.

### 4.2 Elevation & Shadows
- **Card Floating Shadow:**
  ```css
  box-shadow: 0 20px 50px rgba(24, 24, 27, 0.08);
  ```
- **Interactive Button (Resting):**
  ```css
  box-shadow: 0 1px 3px rgba(24, 24, 27, 0.04);
  ```
- **Interactive Button (Hover):**
  ```css
  box-shadow: 0 6px 18px rgba(24, 24, 27, 0.08);
  transform: translateY(-1px);
  ```
- **Interactive Button (Active / Pressed):**
  ```css
  box-shadow: 0 1px 2px rgba(24, 24, 27, 0.05);
  transform: translateY(0.5px) scale(0.995);
  ```
- **Accessible Focus Ring:**
  ```css
  outline: none;
  box-shadow: 0 0 0 2px #FFFFFF, 0 0 0 4px #059669;
  ```

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

### 5.2 Background Artistic Treatment
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

### 5.3 Mobile Layout (`< 1024px`)
- Background decorative layer and marketing feature items gracefully hide (`display: none !important`).
- Body reverts to standard responsive vertical scrolling (`overflow-y: auto !important`).
- Card expands to fill mobile container up to `440px` with `padding: 32px 16px 48px 16px`.

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

### 6.2 Google OAuth Button
- **Structure:** Pill button (`border-radius: 9999px`), height `clamp(52px, 7.65vh, 72px)`.
- **Styling:** White surface `#FFFFFF`, 2px solid line `#E4E4E7`, text `#18181B`.
- **States:**
  - *Hover:* Background `#FAFAFA`, border `#D4D4D8`, shadow lift `translateY(-1px)`.
  - *Active:* Background `#F4F4F5`, `scale(0.995)`.
  - *Focus-Visible:* Dual ring (`2px #FFFFFF`, `4px #059669`).
  - *Error State (`data-error="true"`):* Border `#DC2626`.
  - *Loading State:* Spinner icon (`#059669` sweep) with label updating to "Signing in...".

### 6.3 Links & Interactive Text
- **Class:** `.orgkit-terms-link` / `.orgkit-signin-link`
- **Color:** `#059669` (Emerald 600)
- **Weight:** 600 (Terms) or 700 (Sign In / Sign Up switches)
- **Hover:** Underline, text `#047857` (Emerald 700)
- **Keyboard Focus:** `outline: 2px solid #059669; outline-offset: 2px;`

### 6.4 Iconography & Micro-interactions
- **Library:** `lucide-react` with `strokeWidth={1.5}`.
- **Micro-interaction:** Feature row items have `transition: transform 0.2s ease`.
  - On hover: Item moves `-1px` on Y axis.
  - Icon shifts color to `#059669` and scales `scale(1.08)`.
  - Label shifts from `#3F3F46` to `#18181B`.

---

## 7. Motion & Accessibility Standards

### 7.1 Animations
- **Card Entrance:**
  ```css
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
  }
  ```
- **Spinner:**
  ```css
  @keyframes orgkitSpin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  .orgkit-spinner {
    animation: orgkitSpin 0.75s linear infinite;
  }
  ```

### 7.2 Accessibility & Reduced Motion
- **WCAG Compliance:**
  - Ink (`#18181B`) on Surface (`#FFFFFF`): **17.7:1** (AAA).
  - Ink (`#18181B`) on Base (`#F4F4F5`): **16.0:1** (AAA).
  - Muted (`#71717A`) on Surface (`#FFFFFF`): **4.8:1** (AA).
  - Accent Strong (`#047857`) on Surface (`#FFFFFF`): **5.5:1** (AA).
- **Reduced Motion:**
  ```css
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
  ```
- **Screen Reader Announcements:** Dynamic states (e.g. "Connecting to Google, please wait...") are enclosed in an `<div className="sr-only" aria-live="polite">` element.

---

## 8. Checklist for Future OrgKit Pages

When building new views (e.g., dashboard, member directory, event manager):
1. [ ] **Background:** Keep base canvas at `#F4F4F5`.
2. [ ] **Cards:** Use `#FFFFFF` surfaces with `rounded-3xl` (or `rounded-2xl` for widgets) and `box-shadow: 0 20px 50px rgba(24, 24, 27, 0.08)`.
3. [ ] **Borders:** Frame cards with subtle `1px solid rgba(228, 228, 231, 0.6)`.
4. [ ] **Typography:** Use `Plus Jakarta Sans` with tight negative tracking (`-0.015em` to `-0.025em`) on bold headings.
5. [ ] **Color Accent:** Limit primary positive calls to `#059669` (hover `#047857`). Never introduce uncoordinated secondary hues.
6. [ ] **Buttons:** Round interactive action buttons to `rounded-full` with micro-interaction hover lift.
7. [ ] **Accessibility:** Maintain visible `focus-visible` double rings and screen reader notices.
