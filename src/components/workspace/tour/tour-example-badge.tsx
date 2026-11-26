import { FlaskConical } from "lucide-react";

/**
 * A small pill at the top of the screen while an empty page is showing made-up
 * example data, so nobody mistakes it for their own records. It is a note for
 * screen readers too, and does not take clicks.
 */
export function TourExampleBadge() {
  return (
    <div className="orgkit-tour-badge" role="note">
      <FlaskConical size={15} strokeWidth={2} aria-hidden="true" />
      <span>Example data for the tour. Nothing is saved</span>
    </div>
  );
}
