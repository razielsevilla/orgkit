import { Plus_Jakarta_Sans } from "next/font/google";

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
