import { Inter, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";

/**
 * The "tactile refinement" fonts from docs/design.md section 3. Only Home uses them
 * so far (the page puts both variables on the Home wrapper), so the rest of the app
 * keeps Plus Jakarta Sans. Both are variable fonts, so no weights are listed and an
 * in-between weight such as 450 renders correctly.
 */
export const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

/** For technical detail only: references, timestamps, counts, status tags. Never headings or paragraphs. */
export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains",
});

/**
 * The OrgKit page font. Initialised once here and imported wherever a page or
 * layout applies `plusJakarta.className`, so the font file is declared a single
 * time instead of in every page.
 */
export const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});
