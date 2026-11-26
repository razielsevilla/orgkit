import type { HandoverGuidesSummary } from "@/src/app/(workspace)/handover-actions";
import { isoDaysFromNow } from "@/src/lib/tour/demo/dates";

/**
 * Example handover guides for the officer tour: one ready for a successor and
 * one still a draft, for this year's roles.
 */
export function demoHandoverSummary(real: HandoverGuidesSummary): HandoverGuidesSummary {
  return {
    ...real,
    guides: [
      {
        id: "00000000-0000-4000-8000-000000000901",
        roleTitle: "President",
        status: "ready",
        termName: "A.Y. 2026–2027",
        authorName: "Angelica Santos",
        updatedAt: isoDaysFromNow(-3),
      },
      {
        id: "00000000-0000-4000-8000-000000000902",
        roleTitle: "Treasurer",
        status: "draft",
        termName: "A.Y. 2026–2027",
        authorName: "Bianca Lim",
        updatedAt: isoDaysFromNow(-1),
      },
    ],
    activeRoles: ["President", "Vice President", "Treasurer"],
  };
}
