"use client";

import { use, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { plusJakarta } from "@/src/lib/fonts";
import { duesPath, eventsPath, membersPath, officersPath } from "@/src/lib/routes";
import { useSidebarCollapsed } from "@/src/lib/use-sidebar-collapsed";
import { useNarrowScreen } from "@/src/lib/use-narrow-screen";
import { Sidebar } from "@/src/components/layout/sidebar";
import type { SidebarSection } from "@/src/components/layout/sidebar/nav-list";
import type { OfficerProfile } from "@/src/components/layout/navbar";
import { ZeroScrollLock } from "@/src/components/ui/zero-scroll-lock";
import { WorkspaceBackdrop } from "./workspace-backdrop";
import { FrameStyles } from "./frame-styles";

/** What the frame needs to know about the org and the signed-in officer */
export interface WorkspaceFrameData {
  rawId: string;
  orgName: string;
  schoolName: string | null;
  officer: OfficerProfile | null;
  isAdmin: boolean;
}

function sectionFor(pathname: string, rawId: string): SidebarSection {
  if (pathname.startsWith(membersPath(rawId))) return "members";
  if (pathname.startsWith(duesPath(rawId))) return "dues";
  if (pathname.startsWith(eventsPath(rawId))) return "events";
  if (pathname.startsWith(officersPath(rawId))) return "officers";
  return "home";
}

const SECTION_LABELS: Record<SidebarSection, string> = {
  home: "Home",
  members: "Members",
  dues: "Dues",
  events: "Events",
  officers: "Officers",
};

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The one frame every workspace screen (Home, Join, Invite) sits in: the
 * sidebar on the left and the content canvas on the right. It lives in the
 * workspace layout, so the sidebar is built once and stays put as you move
 * between screens.
 *
 * On a phone or small tablet (below 1024px) the sidebar is a drawer: a slim top
 * bar holds the menu button, and the content gets the full width. The sizes and
 * the slide are CSS (frame-styles.tsx); this component only keeps whether the
 * drawer is open.
 *
 * `data` is null when there is no org to show (it doesn't exist, or the officer
 * isn't in it). Then the page itself renders the "can't find that page" screen.
 */
export function WorkspaceFrame({
  data,
  children,
}: {
  data: Promise<WorkspaceFrameData | null>;
  children: React.ReactNode;
}) {
  const frame = use(data);
  const pathname = usePathname();
  const [isSidebarCollapsed, toggleSidebar] = useSidebarCollapsed();
  const isNarrow = useNarrowScreen();

  // The drawer is open for the page it was opened on, so moving to another page
  // closes it without any effect or extra state.
  const [openOnPath, setOpenOnPath] = useState<string | null>(null);
  const isDrawerOpen = isNarrow && openOnPath === pathname;
  const closeDrawer = () => setOpenOnPath(null);

  const drawerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // While the drawer is open: focus moves into it, Tab stays inside it, Escape
  // closes it, and focus goes back to the menu button afterwards.
  useEffect(() => {
    if (!isDrawerOpen) return;
    const drawer = drawerRef.current;
    const opener = menuButtonRef.current;

    (drawer?.querySelector<HTMLElement>("[data-drawer-close]") ?? drawer)?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenOnPath(null);
        return;
      }
      if (event.key !== "Tab" || !drawer) return;

      const items = Array.from(drawer.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === drawer)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      opener?.focus?.();
    };
  }, [isDrawerOpen]);

  if (!frame) return <>{children}</>;

  const section = sectionFor(pathname, frame.rawId);

  return (
    <div
      className={`${plusJakarta.className} orgkit-frame`}
      style={{
        width: "100%",
        overflow: "hidden",
        position: "relative",
        margin: 0,
        padding: 0,
        backgroundColor: "var(--color-base)",
        color: "var(--color-ink)",
        display: "flex",
        boxSizing: "border-box",
      }}
    >
      <FrameStyles />
      <ZeroScrollLock />

      {/* Phones and small tablets only (hidden by CSS from 1024px) */}
      <header className="orgkit-topbar">
        <button
          ref={menuButtonRef}
          type="button"
          className="orgkit-topbar-menu"
          aria-label="Open menu"
          aria-expanded={isDrawerOpen}
          aria-controls="orgkit-sidebar"
          onClick={() => setOpenOnPath(pathname)}
        >
          <Menu size={22} strokeWidth={2} aria-hidden="true" />
        </button>
        <div className="orgkit-topbar-text">
          <span className="orgkit-topbar-section">{SECTION_LABELS[section]}</span>
          <span className="orgkit-topbar-org">{frame.orgName}</span>
        </div>
      </header>

      {isDrawerOpen && <div className="orgkit-scrim" aria-hidden="true" onClick={closeDrawer} />}

      <Sidebar
        rawId={frame.rawId}
        orgName={frame.orgName}
        schoolName={frame.schoolName}
        officer={frame.officer}
        isAdmin={frame.isAdmin}
        // A drawer is always shown in full, whatever the desktop sidebar was left as
        isCollapsed={isSidebarCollapsed && !isNarrow}
        onToggleCollapse={toggleSidebar}
        activeSection={section}
        isDrawer={isNarrow}
        isDrawerOpen={isDrawerOpen}
        onCloseDrawer={closeDrawer}
        asideRef={drawerRef}
      />

      <main
        className="orgkit-main"
        style={{
          flex: 1,
          minWidth: 0,
          position: "relative",
          overflow: "hidden",
          backgroundColor: "var(--color-base)",
        }}
      >
        <WorkspaceBackdrop />
        {/* Each screen fills this area and decides for itself how to centre or scroll */}
        <div style={{ position: "relative", zIndex: 1, height: "100%" }}>{children}</div>
      </main>
    </div>
  );
}
