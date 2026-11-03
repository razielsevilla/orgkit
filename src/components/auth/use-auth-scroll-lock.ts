"use client";

import { useEffect } from "react";

// Enforce zero-scrollbar policy and lock html/body on desktop viewports
export function useAuthScrollLock() {
  useEffect(() => {
    function enforceDesktop() {
      const w = window.innerWidth;

      if (w >= 1024) {
        document.documentElement.classList.add("orgkit-auth-active");
        document.body.classList.add("orgkit-auth-active");
      } else {
        document.documentElement.classList.remove("orgkit-auth-active");
        document.body.classList.remove("orgkit-auth-active");
      }
    }

    enforceDesktop();
    window.addEventListener("resize", enforceDesktop);
    return () => {
      window.removeEventListener("resize", enforceDesktop);
      document.documentElement.classList.remove("orgkit-auth-active");
      document.body.classList.remove("orgkit-auth-active");
    };
  }, []);
}
