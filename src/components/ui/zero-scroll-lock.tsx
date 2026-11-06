"use client";

import { useEffect } from "react";

/**
 * Locks page scrolling on desktop viewports (1024px and wider) so the workspace
 * screens fit the window exactly. Renders nothing; drop it into any screen that
 * should not scroll. Scrolling comes back on small screens and on unmount.
 */
export function ZeroScrollLock() {
  useEffect(() => {
    function enforceZeroScroll() {
      if (window.innerWidth >= 1024) {
        document.documentElement.style.overflow = "hidden";
        document.body.style.overflow = "hidden";
      } else {
        document.documentElement.style.overflow = "";
        document.body.style.overflow = "";
      }
    }
    enforceZeroScroll();
    window.addEventListener("resize", enforceZeroScroll);
    return () => {
      window.removeEventListener("resize", enforceZeroScroll);
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, []);

  return null;
}
