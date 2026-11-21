import React from "react";
import { DialogBody, DialogFooter } from "@/src/components/ui/dialog";

interface ImportStepLayoutProps {
  /** The steps indicator, shown at the top of the scrolling body */
  indicator?: React.ReactNode;
  /** The step's buttons */
  footer: React.ReactNode;
  children: React.ReactNode;
}

/**
 * A step's body (scrolling) and footer, as siblings, so they sit directly inside
 * the Dialog after its header. The dialog owns the header.
 */
export function ImportStepLayout({ indicator, footer, children }: ImportStepLayoutProps) {
  return (
    <>
      <DialogBody>
        {indicator}
        {children}
      </DialogBody>
      <DialogFooter>{footer}</DialogFooter>
    </>
  );
}
