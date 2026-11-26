import type { OfficerTerm, WorkspaceTermsData } from "@/src/app/(workspace)/terms-actions";
import { DEMO_MEMBER_LIST } from "@/src/lib/tour/demo/members";
import { dateDaysFromNow, isoDaysFromNow } from "@/src/lib/tour/demo/dates";

/**
 * Example leadership history for the officer tour: this year's three officers
 * (the term ends in about 50 days, so Handover has something to say) and last
 * year's three, who have left. People are the same ones as the example roster.
 */

function term(
  n: number,
  holder: string,
  roleTitle: string,
  termName: string,
  startDays: number,
  endDays: number
): OfficerTerm {
  const member = DEMO_MEMBER_LIST.find((m) => m.fullName === holder);
  return {
    id: `00000000-0000-4000-8000-0000000007${String(n).padStart(2, "0")}`,
    orgId: "demo",
    memberId: member?.id ?? null,
    holderName: holder,
    roleTitle,
    termName,
    startDate: dateDaysFromNow(startDays),
    endDate: dateDaysFromNow(endDays),
    isEnded: endDays < 0,
    createdAt: isoDaysFromNow(startDays),
  };
}

export const DEMO_TERMS: OfficerTerm[] = [
  term(1, "Angelica Santos", "President", "A.Y. 2026–2027", -300, 50),
  term(2, "Miguel Villanueva", "Vice President", "A.Y. 2026–2027", -300, 50),
  term(3, "Bianca Lim", "Treasurer", "A.Y. 2026–2027", -300, 50),
  term(4, "Rafael Mendoza", "President", "A.Y. 2025–2026", -665, -315),
  term(5, "Katrina Bautista", "Vice President", "A.Y. 2025–2026", -665, -315),
  term(6, "Paolo Garcia", "Treasurer", "A.Y. 2025–2026", -665, -315),
];

/** The example terms, keeping the real org's own name and whether this officer is an admin */
export function demoTermsData(real: WorkspaceTermsData): WorkspaceTermsData {
  return {
    ...real,
    terms: DEMO_TERMS,
    members: DEMO_MEMBER_LIST.map((m) => ({ id: m.id, fullName: m.fullName, email: m.email })),
    currentTermCount: DEMO_TERMS.filter((t) => !t.isEnded).length,
    pastTermCount: DEMO_TERMS.filter((t) => t.isEnded).length,
  };
}
