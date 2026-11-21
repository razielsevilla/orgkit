import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * T2, mobile friendly experience. Nothing here can measure a real screen (there
 * is no browser in the tests), so these read the CSS and the source and keep the
 * rules in place: 44px touch targets on phones, the visible-height unit, wrapping
 * dialogs, and no wide fixed widths. The real check is docs/mobile-qa.md.
 */

const ROOT = join(import.meta.dirname, "../..");
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");
const css = read("src/app/globals.css");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(path);
  }
  return out;
}
const rel = (path: string) => relative(ROOT, path).replaceAll("\\", "/");

/** The text inside the braces that follow `header`, matching nested braces */
function blockAfter(source: string, header: string): string {
  const start = source.indexOf(header);
  assert.ok(start >= 0, `"${header}" not found`);
  const open = source.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}" && --depth === 0) return source.slice(open + 1, i);
  }
  throw new Error(`"${header}" has no closing brace`);
}

const TOUCH_QUERY = "@media (max-width: 640px), (pointer: coarse)";

describe("touch screens: 44px targets and 16px inputs (globals.css)", () => {
  const touch = blockAfter(css, TOUCH_QUERY);

  it("makes dialog buttons, the dialog close button and every button at least 44px", () => {
    assert.match(touch, /\.orgkit-dialog-close\s*\{\s*width:\s*44px;\s*height:\s*44px;\s*\}/);
    assert.match(touch, /\.orgkit-dialog-btn\s*\{\s*height:\s*auto;\s*\}/);
    assert.match(
      touch,
      /button,\s*\[role="button"\],[\s\S]*?select,\s*summary\s*\{\s*min-height:\s*44px\s*!important;/
    );
    assert.match(touch, /button,\s*\[role="button"\]\s*\{\s*min-width:\s*44px\s*!important;/);
  });

  it("covers options, tabs and menu items, which are not <button> elements", () => {
    for (const role of ["option", "tab", "menuitem"]) {
      assert.ok(touch.includes(`[role="${role}"]`), `[role="${role}"] must be in the 44px rule`);
    }
  });

  it("makes text fields 44px tall and 16px, so iOS does not zoom the page when one is focused", () => {
    assert.match(touch, /textarea\s*\{\s*min-height:\s*44px\s*!important;\s*font-size:\s*16px\s*!important;/);
    // Checkboxes, radios, hidden and file inputs are not text fields
    for (const type of ["checkbox", "radio", "hidden", "file"]) {
      assert.ok(touch.includes(`:not([type="${type}"])`), `${type} inputs must be excluded from the text field rule`);
    }
  });

  it("gives a standalone link and a checkbox row a 44px target", () => {
    assert.match(touch, /\.orgkit-tap-link\s*\{[^}]*min-height:\s*44px\s*!important;/);
    assert.match(touch, /\.orgkit-check-row\s*\{[^}]*min-height:\s*44px;/);
  });

  it("keeps the denser desktop sizes: the base rules outside the query are unchanged", () => {
    assert.match(css, /\.orgkit-dialog-btn\s*\{[^}]*height:\s*40px;/);
    assert.match(css, /\.orgkit-dialog-close\s*\{[^}]*width:\s*32px;\s*height:\s*32px;/);
  });

  it("stacks a dialog's buttons full width on a phone, main action first", () => {
    // A regex, not a fixed string: line endings differ between machines
    const start = /@media \(max-width: 640px\)\s*\{\s*\.orgkit-dialog-footer/.exec(css);
    assert.ok(start, "the phone-only dialog footer rule is missing");
    const phone = blockAfter(css.slice(start.index), "@media");
    assert.match(phone, /\.orgkit-dialog-footer\s*\{[^}]*flex-direction:\s*column-reverse;/);
    assert.match(phone, /width:\s*100%/);
  });

  it("has wrap and truncate helpers", () => {
    assert.match(css, /\.orgkit-wrap\s*\{[^}]*overflow-wrap:\s*anywhere;/);
    assert.match(css, /\.orgkit-truncate\s*\{[^}]*text-overflow:\s*ellipsis;/);
  });
});

describe("screen height: the visible height, not 100vh", () => {
  it('has no inline "100vh" anywhere in src: on a phone it hides the bottom under the browser toolbar', () => {
    const offenders = walk(join(ROOT, "src"))
      .filter((file) => /["']100vh["']/.test(readFileSync(file, "utf8")))
      .map(rel);
    assert.deepEqual(offenders, [], `use "100dvh": ${offenders.join(", ")}`);
  });

  it("the workspace frame sizes itself with dvh and a vh fallback for older browsers", () => {
    const styles = read("src/components/workspace/frame/frame-styles.tsx");
    for (const rule of [".orgkit-frame", ".orgkit-aside", ".orgkit-main"]) {
      assert.match(styles, new RegExp(`\\${rule}\\s*\\{\\s*height:\\s*100vh;\\s*height:\\s*100dvh;`), rule);
    }
  });
});

describe("the workspace drawer", () => {
  const styles = read("src/components/workspace/frame/frame-styles.tsx");

  it("turns the sidebar into a drawer below 1024px and leaves 1024px and up alone", () => {
    const narrow = blockAfter(styles, "@media (max-width: 1023px)");
    assert.match(narrow, /\.orgkit-aside\s*\{[^}]*position:\s*fixed\s*!important;/);
    assert.match(narrow, /\.orgkit-aside\.is-open\s*\{[^}]*transform:\s*none;/);
    assert.match(narrow, /\.orgkit-topbar\s*\{\s*display:\s*flex;/);
    // Outside the narrow query the top bar and scrim are hidden
    assert.match(styles, /\.orgkit-topbar,\s*\.orgkit-scrim\s*\{\s*display:\s*none;/);
  });

  it("takes a closed drawer out of the tab order and the screen reader's view", () => {
    const narrow = blockAfter(styles, "@media (max-width: 1023px)");
    assert.match(narrow, /\.orgkit-aside\s*\{[^}]*visibility:\s*hidden;/);
    assert.match(narrow, /\.orgkit-aside\.is-open\s*\{[^}]*visibility:\s*visible;/);
  });

  it("sits above the Feedback button and below dialogs", () => {
    assert.match(styles, /z-index:\s*960\s*!important;/);
    assert.match(styles, /\.orgkit-scrim\s*\{[^}]*z-index:\s*950;/);
    assert.match(read("src/components/feedback/feedback-button.tsx"), /z-index:\s*900;/);
    assert.match(read("src/components/ui/dialog.tsx"), /zIndex = 1000/);
  });

  it("makes the nav links 44px tall and the menu button 44px", () => {
    const narrow = blockAfter(styles, "@media (max-width: 1023px)");
    assert.match(narrow, /\.orgkit-nav-item\s*\{\s*min-height:\s*44px;/);
    assert.match(narrow, /\.orgkit-topbar-menu\s*\{[^}]*width:\s*44px;\s*height:\s*44px;/);
  });

  it("uses the same breakpoint in the hook and in the CSS", () => {
    const hook = read("src/lib/use-narrow-screen.ts");
    assert.match(hook, /NARROW_QUERY = "\(max-width: 1023px\)"/);
    assert.ok(styles.includes("@media (max-width: 1023px)"));
  });

  it("respects reduced motion", () => {
    assert.match(styles, /prefers-reduced-motion: reduce/);
  });
});

describe("dialogs", () => {
  const dialog = read("src/components/ui/dialog.tsx");

  it("scrolls up and down inside the dialog, never sideways, and wraps long text", () => {
    assert.match(dialog, /overflowX:\s*"hidden"/);
    assert.match(dialog, /overflowWrap:\s*"anywhere"/);
    assert.match(dialog, /maxHeight:\s*"calc\(100dvh - 32px\)"/);
  });

  it("gives the footer the class that stacks its buttons on a phone", () => {
    assert.match(dialog, /className="orgkit-dialog-footer"/);
  });

  it("the member join dialog keeps its content in DialogBody so its bottom buttons scroll into reach", () => {
    const source = read("src/components/workspace/members/member-join-dialog.tsx");
    assert.ok(source.includes("<DialogBody"));
    assert.ok(!/<Dialog[^>]*\bpadding=/.test(source), "do not pass padding to Dialog (docs/design.md)");
  });

  it("the dues receipt lightbox is drawn in a portal, so it covers the screen and not just the dialog", () => {
    const source = read("src/components/workspace/dues/dues-screenshot-viewer.tsx");
    assert.ok(source.includes("createPortal("));
    assert.ok(source.includes("document.body"));
    assert.ok(!/["']90vh["']/.test(source), 'use "90dvh"');
  });
});

describe("screens that were wider than a 360px phone", () => {
  it("sign in and register: the card never exceeds its container, and the text wraps", () => {
    for (const file of ["src/app/signin/page.tsx", "src/app/register/page.tsx"]) {
      const source = read(file);
      assert.ok(source.includes('min(100%, clamp(380px, 33.85vw, 566px))'), `${file} card width`);
      assert.ok(source.includes("orgkit-nowrap-desktop"), `${file} subtitle`);
      assert.ok(!/<span style=\{\{ whiteSpace: "nowrap" \}\}>/.test(source), `${file} must not force no-wrap on a phone`);
    }
    const layout = read("src/components/auth/auth-layout-styles.ts");
    assert.match(layout, /\.orgkit-br-desktop\s*\{\s*display:\s*none;/);
    assert.match(layout, /@media \(min-width: 1024px\)\s*\{\s*\.orgkit-nowrap-desktop\s*\{\s*white-space:\s*nowrap;/);
  });

  it("the members search box does not become 280px tall when the row turns into a column", () => {
    const styles = read("src/components/workspace/members/members-styles.tsx");
    assert.match(styles, /\.orgkit-search-bar\s*\{[^}]*flex:\s*0 0 auto !important;/);
  });

  it("the dues cards show up to 800px, where the desktop table (about 650px) would not fit", () => {
    const source = read("src/components/workspace/dues/dues-client.tsx");
    assert.match(source, /@media \(max-width: 800px\)\s*\{\s*\.orgkit-dues-desktop\s*\{\s*display:\s*none !important;/);
    assert.match(read("src/components/workspace/dues/dues-member-table.tsx"), /tableLayout:\s*"fixed"/);
  });

  it("the officers styles are valid CSS (a camelCase property inside a stylesheet is silently ignored)", () => {
    const styles = read("src/components/workspace/officers/officers-styles.tsx");
    assert.ok(!styles.includes("justifyContent"), "write justify-content in CSS");
    assert.match(styles, /justify-content:\s*space-between !important;/);
  });

  it("the pay-link dialog link input can shrink next to the Copy button", () => {
    const source = read("src/components/workspace/dues/dues-pay-link-dialog.tsx");
    assert.match(source, /flex:\s*1,\s*(\/\/[^\n]*\n\s*)?minWidth:\s*0,/);
  });

  it("the events list leaves room under its last card for the Feedback button", () => {
    for (const file of ["events-client.tsx", "event-skeleton.tsx"]) {
      assert.ok(
        read(`src/components/workspace/events/${file}`).includes("36px clamp(16px, 4vw, 36px) 72px"),
        file
      );
    }
  });
});

describe("no wide fixed widths (a ratchet)", () => {
  // Fixed pixel widths over 328px (a 360px phone, less 16px padding each side) can
  // push a page sideways. Each one that exists today is listed here with why it is
  // fine. A NEW one fails this test: use min(), clamp(), maxWidth: "100%" or a
  // percentage, or add it here with a reason. An entry that no longer matches also
  // fails, so the list stays honest.
  const ALLOWED: { file: string; px: number; why: string }[] = [
    { file: "src/components/workspace/dues/dues-pay-link-dialog.tsx", px: 500, why: "QR image pixel size, not CSS" },
    { file: "src/components/workspace/events/checkin-screen.tsx", px: 960, why: "QR image pixel size, not CSS" },
    { file: "src/components/workspace/member-join/join-panel.tsx", px: 640, why: "QR image pixel size, not CSS" },
    { file: "src/components/workspace/members/member-join-dialog.tsx", px: 640, why: "QR image pixel size, not CSS" },
    {
      file: "src/components/workspace/frame/workspace-backdrop.tsx",
      px: 380,
      why: "decorative circles, absolutely positioned inside the clipped <main>",
    },
  ];

  const WIDE = /(?<![A-Za-z])(width|minWidth)\s*:\s*(\d{3,4})\b(?!\s*\d)/g;

  function found(): { file: string; px: number }[] {
    const out: { file: string; px: number }[] = [];
    for (const path of walk(join(ROOT, "src"))) {
      const text = readFileSync(path, "utf8");
      for (const match of text.matchAll(WIDE)) {
        const px = Number(match[2]);
        if (px > 328) out.push({ file: rel(path), px });
      }
    }
    return out;
  }

  it("finds only the widths listed above", () => {
    const allowed = new Set(ALLOWED.map((a) => `${a.file}:${a.px}`));
    const unexpected = found().filter((f) => !allowed.has(`${f.file}:${f.px}`));
    assert.deepEqual(unexpected, [], "a fixed width over 328px was added: see the comment above");
  });

  it("has no stale entries", () => {
    const present = new Set(found().map((f) => `${f.file}:${f.px}`));
    const stale = ALLOWED.filter((a) => !present.has(`${a.file}:${a.px}`)).map((a) => `${a.file}:${a.px}`);
    assert.deepEqual(stale, [], "remove entries that no longer exist");
  });
});
