"use client";

import React, { useEffect, useRef } from "react";
import { stepTitle } from "./import-styles";

export const IMPORT_TITLE_ID = "orgkit-import-title";

/**
 * The title of the current step. It takes focus when the step appears, so a
 * keyboard or screen reader user starts at the top of each new step.
 */
export function StepHeading({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <h2 id={IMPORT_TITLE_ID} ref={ref} tabIndex={-1} style={stepTitle}>
      {children}
    </h2>
  );
}
