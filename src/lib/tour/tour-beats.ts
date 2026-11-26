import type { LucideIcon } from "lucide-react";
import {
  Award,
  Banknote,
  BookOpen,
  CalendarDays,
  Compass,
  Files,
  Home,
  PartyPopper,
  Shield,
  Users,
} from "lucide-react";
import {
  documentsPath,
  duesPath,
  eventsPath,
  handoverPath,
  membersPath,
  officersPath,
  termsPath,
  workspacePath,
} from "@/src/lib/routes";
import type { SidebarSection } from "@/src/components/layout/sidebar/nav-list";

/**
 * The officer tour: a list of "beats". Each beat points at one real thing on
 * the screen (a sidebar entry, a button, a list), says what it is for, and gives
 * numbered steps for using it. The tour opens the pages itself as it goes.
 *
 * Plain data, so the words can be reviewed and tested without rendering. The
 * spotlight and the card are in src/components/workspace/tour/.
 *
 * Keep it true to the app: button names are the ones on screen, and "admin only"
 * matches src/lib/orgs/permissions.ts. Every `target` is a `data-tour="..."`
 * attribute on a real element, and a test fails if one is missing from the source,
 * or if a sidebar entry has no beats.
 */

export type TourSection = "intro" | SidebarSection | "finish";
export type TourPlacement = "right" | "left" | "bottom" | "top";

/**
 * What a run of the tour covers. "all" is the full tour (the first time an
 * officer arrives, and Take the full tour in the profile menu). A sidebar
 * section is the guide to that one page, opened by the ? button while the
 * officer is on it.
 */
export type TourScope = "all" | SidebarSection;

export interface TourBeat {
  id: string;
  section: TourSection;
  title: string;
  /** One or two sentences: what this is for */
  body: string;
  /** How to use it, as numbered steps */
  steps?: readonly string[];
  /** `data-tour` names of what to point at. The first one on screen is used. None means a centred card */
  target?: readonly string[];
  /** Which side of the target the card prefers */
  placement?: TourPlacement;
  /** The page this beat is on. The tour opens it if the officer is somewhere else */
  path?: (orgId: string) => string;
  /**
   * "nav" beats point at a sidebar link. Clicking it, or pressing the button,
   * opens `expectPath` and moves on. Everything else is "info".
   */
  kind: "info" | "nav";
  expectPath?: (orgId: string) => string;
  /** Only admins can do this. Officers see the card without a spotlight and are told to ask an admin */
  adminOnly?: boolean;
  /** Said when the thing to point at is not on screen yet (an empty page, a missing role) */
  missing?: string;
}

const PATHS: Record<SidebarSection, (orgId: string) => string> = {
  home: workspacePath,
  members: membersPath,
  dues: duesPath,
  events: eventsPath,
  officers: officersPath,
  terms: termsPath,
  documents: documentsPath,
  handover: handoverPath,
};

/** The sidebar, top to bottom. The tour walks it in this order */
export const TOUR_SECTIONS: readonly SidebarSection[] = [
  "home",
  "members",
  "dues",
  "events",
  "officers",
  "terms",
  "documents",
  "handover",
];

/** Order of every section of the tour, with the intro first and the finish last */
export const TOUR_SECTION_ORDER: readonly TourSection[] = ["intro", ...TOUR_SECTIONS, "finish"];

export const SECTION_META: Record<TourSection, { label: string; icon: LucideIcon }> = {
  intro: { label: "Getting around", icon: Compass },
  home: { label: "Home", icon: Home },
  members: { label: "Members", icon: Users },
  dues: { label: "Dues", icon: Banknote },
  events: { label: "Events", icon: CalendarDays },
  officers: { label: "Officers", icon: Shield },
  terms: { label: "Terms", icon: Award },
  documents: { label: "Documents", icon: Files },
  handover: { label: "Handover", icon: BookOpen },
  finish: { label: "All set", icon: PartyPopper },
};

/** The first-week list on the last card, with the page each item starts on */
export const FIRST_WEEK_LINKS: readonly { label: string; href: (orgId: string) => string; adminOnly?: boolean }[] = [
  { label: "Share the join link", href: membersPath, adminOnly: true },
  { label: "Create an event", href: eventsPath },
  { label: "Create a dues period", href: duesPath },
  { label: "Invite officers", href: officersPath, adminOnly: true },
];

function navBeat(section: SidebarSection, body: string): TourBeat {
  const { label } = SECTION_META[section];
  return {
    id: `${section}-nav`,
    section,
    kind: "nav",
    title: `Open ${label}`,
    body,
    target: [`nav-${section}`],
    placement: "right",
    expectPath: PATHS[section],
  };
}

/**
 * Every beat, in order. On a phone or small tablet the sidebar is a menu, so
 * the tour does not point at its entries one by one: it explains the menu
 * button once and then opens each page itself.
 */
export function buildTourBeats({ narrow, scope = "all" }: { narrow: boolean; scope?: TourScope }): TourBeat[] {
  /** Sidebar beats are skipped on a narrow screen: the page beats open the page */
  const nav = (section: SidebarSection, body: string): TourBeat[] => (narrow ? [] : [navBeat(section, body)]);

  const beats: TourBeat[] = [
    // ── Getting around ───────────────────────────────────────────────
    {
      id: "welcome",
      section: "intro",
      kind: "info",
      title: "Welcome to OrgKit",
      body: "This tour points at the real buttons and shows how to use each part, one step at a time. Where a page is still empty, it shows made-up example data so you can see how it looks. Nothing is saved. You can skip a section or the whole tour at any point.",
    },
    narrow
      ? {
          id: "menu",
          section: "intro",
          kind: "info",
          title: "The menu button",
          body: "Every feature is in a list that opens from this button. The highlighted entry is the page you are on.",
          target: ["menu-button"],
          placement: "bottom",
        }
      : {
          id: "sidebar",
          section: "intro",
          kind: "info",
          title: "The sidebar",
          body: "Every feature of OrgKit is in this list. The highlighted entry is the page you are on.",
          steps: ["Click an entry to open that page", "Use the arrow button at the top to shrink the sidebar to icons"],
          target: ["sidebar"],
          placement: "right",
        },
    ...(narrow
      ? []
      : [
          {
            id: "profile",
            section: "intro",
            kind: "info",
            title: "Your profile",
            body: "Shows who you are signed in as.",
            steps: ["Click it to open the menu", "Take the full tour plays the whole walk-through again", "Sign out ends your session"],
            target: ["profile"],
            placement: "right",
          } satisfies TourBeat,
        ]),
    {
      id: "corner",
      section: "intro",
      kind: "info",
      title: "Help and feedback",
      body: "These two buttons are on every page.",
      steps: [
        "The ? button shows a short guide to the page you are on",
        "Feedback sends a message to the OrgKit team, along with the page you were on",
      ],
      target: ["corner"],
      placement: "top",
    },

    // ── Home ─────────────────────────────────────────────────────────
    ...nav("home", "Home is where you land after you sign in."),
    {
      id: "home-summary",
      section: "home",
      kind: "info",
      title: "Your org at a glance",
      body: "The top of Home sums up how your org is doing, in one line.",
      steps: [
        "The headline says what needs attention, for example how many areas need action",
        "The ring shows how many areas are on track",
        "The time shows when these numbers were last worked out",
      ],
      target: ["home-summary"],
      placement: "bottom",
      path: PATHS.home,
    },
    {
      id: "home-chips",
      section: "home",
      kind: "info",
      title: "One chip for each area",
      body: "The chips are a quick scan of the five areas the cards below cover.",
      steps: [
        "Each chip says On track, Needs a look, Needs action or Not started",
        "Click a chip to jump straight to that area's card",
      ],
      target: ["home-chips"],
      placement: "bottom",
      path: PATHS.home,
      missing: "The chips appear once an area has something to judge, so a brand-new workspace does not show them yet.",
    },
    {
      id: "home-next",
      section: "home",
      kind: "info",
      title: "What to do next",
      body: "This panel tells you where to spend your time.",
      steps: [
        "In a new workspace it is a Get started list, with a count of how many are done",
        "After that it is a Do next list, with the most urgent thing at the top",
        "Click a row to go to the page where you fix it",
        "When there is nothing to do, it says Nothing needs your attention",
      ],
      target: ["home-next"],
      placement: "left",
      path: PATHS.home,
    },
    {
      id: "home-card-dues",
      section: "home",
      kind: "info",
      title: "The Dues card",
      body: "How your dues collection is going.",
      steps: [
        "The badge at the top right says On track, Needs a look, Needs action or Not started",
        "Once a period has payments, the card shows what is collected against what is expected, and who has paid",
        "Click Dues in the card's title to open the Dues page",
      ],
      target: ["home-card-dues"],
      placement: "right",
      path: PATHS.home,
    },
    {
      id: "home-card-members",
      section: "home",
      kind: "info",
      title: "The Members card",
      body: "How your roster is growing.",
      steps: [
        "The badge says Needs a look when students are waiting to be confirmed",
        "Once students join, the card shows your active members and how many joined each week",
        "Click Members in the card's title to open the roster",
      ],
      target: ["home-card-members"],
      placement: "left",
      path: PATHS.home,
    },
    {
      id: "home-card-events",
      section: "home",
      kind: "info",
      title: "The Events card",
      body: "Whether people are showing up.",
      steps: [
        "The badge says Needs a look when no event is coming up, or when turnout has dropped",
        "Once events have happened, the card shows average turnout and your next event",
        "Click Events in the card's title to open the events page",
      ],
      target: ["home-card-events"],
      placement: "right",
      path: PATHS.home,
    },
    {
      id: "home-card-terms",
      section: "home",
      kind: "info",
      title: "The Terms card",
      body: "Who is currently in office.",
      steps: [
        "The badge says Needs a look when there is no current term, or one ends within 30 days",
        "Once terms are recorded, the card shows a square for each term",
        "Click Terms in the card's title to open the terms page",
      ],
      target: ["home-card-officers"],
      placement: "top",
      path: PATHS.home,
    },
    {
      id: "home-card-handover",
      section: "home",
      kind: "info",
      title: "The Handover card",
      body: "Whether the people leaving have left a guide.",
      steps: [
        "The badge says Needs a look, or Needs action, when someone is leaving soon without a ready guide",
        "Once terms have end dates, the card lists each role that is leaving and the days left",
        "Click Handover in the card's title to open the guides",
      ],
      target: ["home-card-handover"],
      placement: "left",
      path: PATHS.home,
    },

    // ── Members ──────────────────────────────────────────────────────
    ...nav("members", "The roster of everyone who joined your org."),
    {
      id: "members-add",
      section: "members",
      kind: "info",
      adminOnly: true,
      title: "Get students to join",
      body: "Students join themselves from a link or a QR code. They do not need an account.",
      steps: [
        "Press Add Members",
        "Copy the join link, or show the QR code for students to scan",
        "Each student who joins appears on the roster as Pending",
      ],
      target: ["members-add"],
      placement: "bottom",
      path: PATHS.members,
      missing: "Admins see an Add Members button here.",
    },
    {
      id: "members-search",
      section: "members",
      kind: "info",
      title: "Find people and filter by status",
      body: "The roster shows every member, with their status.",
      steps: [
        "Type a name or an email to search",
        "Use the status tabs to show Pending, Active or Inactive members",
        "Pending students must be confirmed before they can check in to an event",
      ],
      target: ["members-search"],
      placement: "bottom",
      path: PATHS.members,
      missing: "The search box and tabs appear once the page has loaded.",
    },
    {
      id: "members-row",
      section: "members",
      kind: "info",
      title: "Manage one member",
      body: "Each row has its own buttons.",
      steps: [
        "Confirm turns a Pending student into an Active member",
        "Edit fixes a name or an email",
        "The history button shows which events they attended",
        "Deactivate marks them Inactive, and Reactivate brings them back",
      ],
      target: ["member-row-actions"],
      placement: "left",
      path: PATHS.members,
      missing: "Rows appear here once students join.",
    },
    {
      id: "members-import",
      section: "members",
      kind: "info",
      adminOnly: true,
      title: "Import or export a list",
      body: "For a whole class at once, or to keep a copy of your roster.",
      steps: [
        "Import reads a CSV file and invites those people by email",
        "Export, next to it, downloads your roster as a CSV file",
      ],
      target: ["members-import"],
      placement: "bottom",
      path: PATHS.members,
      missing: "Admins see Import and Export in the top right of this page.",
    },

    // ── Dues ─────────────────────────────────────────────────────────
    ...nav("dues", "Collect dues, see who has paid, and check each payment."),
    {
      id: "dues-new",
      section: "dues",
      kind: "info",
      title: "Start a collection period",
      body: "A period is one round of dues, such as a semester.",
      steps: [
        "Press New period",
        "Name it, for example 1st Sem Membership Dues",
        "Enter the amount for each member and the due date",
        "Save. The period appears in the picker",
      ],
      target: ["dues-new-period"],
      placement: "bottom",
      path: PATHS.dues,
      missing: "The New period button appears here.",
    },
    {
      id: "dues-picker",
      section: "dues",
      kind: "info",
      title: "Choose a period",
      body: "Everything below the picker is about the period you choose.",
      steps: ["Open the dropdown to switch between periods", "Edit or close a period with the buttons beside it"],
      target: ["dues-picker"],
      placement: "bottom",
      path: PATHS.dues,
      missing: "The period picker appears once you have created a period.",
    },
    {
      id: "dues-tiles",
      section: "dues",
      kind: "info",
      title: "How much is collected",
      body: "The banner compares what is collected with what is expected.",
      steps: [
        "Paid, Pending review, Rejected and Unpaid count your members by status",
        "Only active members count toward the amount expected",
      ],
      target: ["dues-tiles"],
      placement: "bottom",
      path: PATHS.dues,
      missing: "These tiles appear once you have created a period.",
    },
    {
      id: "dues-pending",
      section: "dues",
      kind: "info",
      title: "Check payments",
      body: "Members pay outside OrgKit, then send you proof.",
      steps: [
        "Press the Pending review tile to open the review queue",
        "Check the GCash reference and the screenshot",
        "Press Verify, or Reject and give a reason so the member can try again",
      ],
      target: ["dues-pending"],
      placement: "top",
      path: PATHS.dues,
      missing: "This tile appears once a period has payments to review.",
    },
    {
      id: "dues-paylink",
      section: "dues",
      kind: "info",
      title: "Share the pay link",
      body: "Members use this link to send in their payment. They do not need an account.",
      steps: [
        "Press Pay Link",
        "Copy the link and send it to your members",
        "They enter their GCash reference and upload a screenshot",
      ],
      target: ["dues-paylink"],
      placement: "bottom",
      path: PATHS.dues,
      missing: "Pay Link appears once you have created a period.",
    },
    {
      id: "dues-reminders",
      section: "dues",
      kind: "info",
      title: "Remind people who have not paid",
      body: "Reminders go only to active members who have not paid.",
      steps: [
        "Press Send reminders",
        "Read the preview, which shows who will be emailed",
        "Send. Nobody is emailed twice in one day",
      ],
      target: ["dues-reminders"],
      placement: "bottom",
      path: PATHS.dues,
      missing: "Send reminders appears once you have created a period.",
    },

    // ── Events ───────────────────────────────────────────────────────
    ...nav("events", "Plan events and take attendance with a QR code."),
    {
      id: "events-new",
      section: "events",
      kind: "info",
      title: "Create an event",
      body: "Everything about attendance starts from an event.",
      steps: [
        "Press New event",
        "Enter a title, the date and the times",
        "Save. It appears under Upcoming",
      ],
      target: ["events-new"],
      placement: "bottom",
      path: PATHS.events,
    },
    {
      id: "events-board",
      section: "events",
      kind: "info",
      title: "Upcoming and past",
      body: "Events sort themselves into two columns.",
      steps: [
        "Upcoming events are still to come",
        "Past events have ended. Cancelled ones stay on the list, marked Cancelled",
        "Open any event to edit it, cancel it or see who came",
      ],
      target: ["events-board"],
      placement: "top",
      path: PATHS.events,
    },
    {
      id: "events-checkin",
      section: "events",
      kind: "info",
      title: "Take attendance with a QR code",
      body: "On the day of an event, open it and start check-in.",
      steps: [
        "Open the event, press Check-in, then Open check-in",
        "Show the QR code on a screen. It changes every 30 seconds",
        "Members scan it and enter the email they joined with",
        "Watch the list fill in. Add or remove a person by hand to fix a mistake",
      ],
      target: ["event-card"],
      placement: "bottom",
      path: PATHS.events,
      missing: "Create an event first. It will appear on this page, and you open it from there.",
    },
    {
      id: "events-log",
      section: "events",
      kind: "info",
      title: "Past events log",
      body: "A record of every event that has ended, built for you.",
      steps: [
        "Press Past events log",
        "Filter by term or by dates",
        "Open an event to see who attended",
      ],
      target: ["events-log"],
      placement: "bottom",
      path: PATHS.events,
      missing: "Past events log appears here once an event has ended.",
    },

    // ── Officers ─────────────────────────────────────────────────────
    ...nav("officers", "Your team, and what each person can do."),
    {
      id: "officers-invite",
      section: "officers",
      kind: "info",
      adminOnly: true,
      title: "Invite an officer",
      body: "Only admins can add people to the team.",
      steps: [
        "Press Invite an officer",
        "Enter their email and choose a role: admin, finance or officer",
        "Copy the invite link and send it to them",
        "They sign in with that Google account to join",
      ],
      target: ["officers-invite"],
      placement: "bottom",
      path: PATHS.officers,
      missing: "Admins see an Invite an officer button here.",
    },
    {
      id: "officers-list",
      section: "officers",
      kind: "info",
      title: "Your team",
      body: "Everyone with access to this workspace is listed with their role.",
      steps: [
        "Admins can change a role, or remove someone, from their row",
        "Invites that have not been accepted yet wait below the list",
      ],
      target: ["officers-list"],
      placement: "top",
      path: PATHS.officers,
    },
    {
      id: "officers-transfer",
      section: "officers",
      kind: "info",
      adminOnly: true,
      title: "Hand over the admin role",
      body: "When the admin changes, the role moves to someone else on the team.",
      steps: ["Press Transfer admin rights", "Choose the officer who takes over", "Confirm"],
      target: ["officers-transfer"],
      placement: "bottom",
      path: PATHS.officers,
      missing: "Admins see Transfer admin rights next to Invite an officer.",
    },

    // ── Terms ────────────────────────────────────────────────────────
    ...nav("terms", "A record of who held which role, year by year."),
    {
      id: "terms-record",
      section: "terms",
      kind: "info",
      adminOnly: true,
      title: "Record a term",
      body: "Do this once a year, so the history is there after people graduate.",
      steps: [
        "Press Record Term",
        "Enter the term name, the role and who holds it",
        "Set the start and end dates",
        "Save. The end date cannot be before the start date",
      ],
      target: ["terms-record"],
      placement: "bottom",
      path: PATHS.terms,
      missing: "Admins see a Record Term button on this page.",
    },
    {
      id: "terms-list",
      section: "terms",
      kind: "info",
      title: "Leadership history",
      body: "Every officer can read this page.",
      steps: [
        "Terms are grouped by year, newest first",
        "A badge shows whether a term is Active or Ended",
        "The Past events log can filter by these terms",
      ],
      target: ["terms-card"],
      placement: "bottom",
      path: PATHS.terms,
      missing: "Terms appear here once an admin records one.",
    },

    // ── Documents ────────────────────────────────────────────────────
    ...nav("documents", "One shared place for the files your org depends on."),
    {
      id: "documents-file",
      section: "documents",
      kind: "info",
      title: "Upload a file",
      body: "For the constitution, permits, signatory forms and similar.",
      steps: [
        "Press Add file and choose a file up to 15 MB",
        "Give it a title and a category: Finance, Legal, Templates, Contacts or General",
        "Upload",
      ],
      target: ["documents-add-file"],
      placement: "bottom",
      path: PATHS.documents,
    },
    {
      id: "documents-link",
      section: "documents",
      kind: "info",
      title: "Save a link",
      body: "For things that live elsewhere, such as a shared folder.",
      steps: [
        "Press Add link",
        "Paste an address that starts with http or https",
        "Give it a title and a category, then save",
      ],
      target: ["documents-add-link"],
      placement: "bottom",
      path: PATHS.documents,
    },
    {
      id: "documents-list",
      section: "documents",
      kind: "info",
      title: "Find and open a document",
      body: "Only officers of your org can see these.",
      steps: [
        "Use a document's buttons to open or download it",
        "Delete removes it for everyone, after you confirm",
      ],
      target: ["documents-list"],
      placement: "top",
      path: PATHS.documents,
      missing: "Documents appear here once you add one.",
    },

    // ── Handover ─────────────────────────────────────────────────────
    ...nav("handover", "A guide for whoever takes over your role."),
    {
      id: "handover-start",
      section: "handover",
      kind: "info",
      title: "Start a guide",
      body: "Write one guide for each role that will change hands.",
      steps: ["Choose a role from the list", "Press Open role guide"],
      target: ["handover-start"],
      placement: "bottom",
      path: PATHS.handover,
    },
    {
      id: "handover-guide",
      section: "handover",
      kind: "info",
      title: "Write the guide",
      body: "Each guide has the same five parts, so a successor always knows where to look.",
      steps: [
        "Fill in What I do, Recurring tasks, Key contacts, Open items and Where things are",
        "It saves as you type",
        "Attach files from the Documents page",
        "Press Mark as ready when you are done. The guide locks and your successor can read it",
        "Only an admin can reopen a guide for editing",
      ],
      path: PATHS.handover,
    },

    // ── Finish ───────────────────────────────────────────────────────
    {
      id: "finish",
      section: "finish",
      kind: "info",
      title: "You know your way around",
      body: "That is every part of OrgKit. A good first week, in this order:",
    },
  ];

  // One page's guide: only that section, and not its "Open Dues" beat, because the officer is already there
  return scope === "all" ? beats : beats.filter((b) => b.section === scope && b.kind !== "nav");
}

export interface TourProgress {
  /** One entry per section that has beats, in order. `fill` is 0 to 1: done, partly done, or not yet */
  sections: { id: TourSection; fill: number }[];
  /** This beat's place inside its own section: "2 of 5" */
  position: number;
  count: number;
  /** How far through the whole tour, 0 to 1 */
  overall: number;
}

/** Where beat `index` stands: which sections are behind it, and how far through its own section it is */
export function describeProgress(beats: readonly TourBeat[], index: number): TourProgress {
  const current = beats[index];
  const inSection = beats.filter((b) => b.section === current.section);
  const position = inSection.indexOf(current) + 1;
  const currentOrder = TOUR_SECTION_ORDER.indexOf(current.section);

  const sections = TOUR_SECTION_ORDER.filter((id) => beats.some((b) => b.section === id)).map((id) => {
    const order = TOUR_SECTION_ORDER.indexOf(id);
    const fill = order < currentOrder ? 1 : order > currentOrder ? 0 : position / inSection.length;
    return { id, fill };
  });

  return { sections, position, count: inSection.length, overall: (index + 1) / beats.length };
}
