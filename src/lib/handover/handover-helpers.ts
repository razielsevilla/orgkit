import type {
  HandoverGuide,
  HandoverSectionKey,
  HandoverSectionsData,
  SectionDefinition,
} from "./handover-types";

export const HANDOVER_SECTION_DEFINITIONS: readonly SectionDefinition[] = [
  {
    key: "what_i_do",
    title: "What I do",
    subtitle: "High-level purpose, responsibilities, and main mission of this role",
    placeholder:
      "Explain the primary goals of this position, the weekly expectations, and how this role fits into the overall leadership team...",
    promptList: [
      "What are the 3 main goals of this role?",
      "Who do you represent or report to on campus?",
      "What skills or habits made you successful in this role?",
    ],
  },
  {
    key: "recurring_tasks",
    title: "Recurring tasks",
    subtitle: "Weekly, monthly, and seasonal cadences so nothing slips",
    placeholder:
      "List the periodic duties that happen on a schedule (e.g., weekly agendas, monthly budget reconciliations, semester elections)...",
    promptList: [
      "Weekly: Team check-ins, office hours, or status updates",
      "Monthly: Financial audits, committee meetings, newsletter releases",
      "End of semester: General assembly presentations, asset inventory",
    ],
  },
  {
    key: "key_contacts",
    title: "Key contacts",
    subtitle: "University officials, advisors, suppliers, and external partners",
    placeholder:
      "Provide names, email addresses, phone numbers, and context for who to contact when handling official org business...",
    promptList: [
      "Faculty / Staff Advisor (Name, office, preferred communication)",
      "Student Affairs / Council liaison for event permits",
      "Key suppliers, printers, or venue coordinators with account numbers",
    ],
  },
  {
    key: "open_items",
    title: "Open items & watch-outs",
    subtitle: "Unfinished projects, pending commitments, and advice on challenges",
    placeholder:
      "Note anything left unresolved, active projects requiring follow-through, and potential pitfalls to watch out for...",
    promptList: [
      "Ongoing initiatives that still need execution next term",
      "Unpaid invoices or pending reimbursement clearances",
      "Common mistakes or roadblocks and how to avoid them",
    ],
  },
  {
    key: "where_things_are",
    title: "Where things are",
    subtitle: "Important links, shared folders, credentials, and documentation",
    placeholder:
      "Document locations of shared drives, passwords/logins protocol, physical asset storage, and key links...",
    promptList: [
      "Official Drive / Cloud folder structures and permissions",
      "Social media accounts, domain registrars, and mailing lists",
      "Physical cabinet keys, banners, sound gear, and merchandise locations",
    ],
  },
];

export function createEmptyHandoverSections(): HandoverSectionsData {
  return {
    what_i_do: "",
    recurring_tasks: "",
    key_contacts: "",
    open_items: "",
    where_things_are: "",
    linked_document_ids: [],
  };
}

/**
 * Calculates how many of the 5 text sections have meaningful content.
 * Returns percentage (0 to 100), filled count, and total count.
 */
export function calculateGuideCompleteness(sections: HandoverSectionsData): {
  filledCount: number;
  totalCount: number;
  percentage: number;
} {
  const textKeys: HandoverSectionKey[] = [
    "what_i_do",
    "recurring_tasks",
    "key_contacts",
    "open_items",
    "where_things_are",
  ];

  let filledCount = 0;
  for (const key of textKeys) {
    const text = sections[key];
    if (text && text.trim().length >= 10) {
      filledCount += 1;
    }
  }

  const totalCount = textKeys.length;
  const percentage = Math.round((filledCount / totalCount) * 100);

  return { filledCount, totalCount, percentage };
}

/**
 * Checks whether an officer may edit a guide.
 * Outgoing author can edit while draft; org admin can always edit or update.
 */
export function canOfficerEditGuide(
  guide: Pick<HandoverGuide, "status" | "authorId">,
  userId: string,
  isAdmin: boolean
): boolean {
  if (isAdmin) return true;
  if (guide.status === "ready") return false;
  return guide.authorId === userId;
}

/**
 * Only an organization admin can reopen a guide that has been marked ready.
 */
export function canOfficerReopenGuide(
  guide: Pick<HandoverGuide, "status">,
  isAdmin: boolean
): boolean {
  return isAdmin && guide.status === "ready";
}
