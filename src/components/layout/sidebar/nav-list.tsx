"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { Award, Banknote, CalendarDays, Files, Home, Shield, Users } from "lucide-react";
import {
  documentsPath,
  duesPath,
  eventsPath,
  membersPath,
  officersPath,
  termsPath,
  workspacePath,
} from "@/src/lib/routes";

interface NavLinkItemProps {
  href: string;
  title: string;
  label: string;
  icon: LucideIcon;
  strokeWidth: number;
  isActive: boolean;
  isCollapsed: boolean;
}

function NavLinkItem({
  href,
  title,
  label,
  icon: Icon,
  strokeWidth,
  isActive,
  isCollapsed,
}: NavLinkItemProps) {
  const router = useRouter();

  return (
    <Link
      href={href}
      prefetch={true}
      onMouseEnter={() => router.prefetch(href)}
      onTouchStart={() => router.prefetch(href)}
      className={`orgkit-nav-item ${isActive ? "active" : ""}`}
      title={title}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: isCollapsed ? "center" : "flex-start",
        gap: 12,
        borderRadius: 12,
        padding: isCollapsed ? "9px 0" : "9px 12px",
        backgroundColor: isActive ? "color-mix(in srgb, var(--color-accent) 10%, transparent)" : "transparent",
        color: isActive ? "var(--color-accent)" : "var(--color-muted-strong)",
        textDecoration: "none",
        fontWeight: isActive ? 600 : 500,
        fontSize: 13.5,
        transition: "all 0.15s ease",
      }}
    >
      <Icon size={18} strokeWidth={strokeWidth} color={isActive ? "var(--color-accent)" : "var(--color-muted)"} />
      {!isCollapsed && <span>{label}</span>}
    </Link>
  );
}

/** The sidebar entries. Only features that exist are listed. */
export type SidebarSection = "home" | "members" | "dues" | "events" | "officers" | "terms" | "documents";

interface NavListProps {
  rawId: string;
  isAdmin: boolean;
  isCollapsed: boolean;
  activeSection: SidebarSection;
}

export function NavList({ rawId, isCollapsed, activeSection }: NavListProps) {
  const router = useRouter();

  // Background idle-prewarm for 0ms transitions across core workspace routes
  useEffect(() => {
    const prewarm = () => {
      router.prefetch(workspacePath(rawId));
      router.prefetch(membersPath(rawId));
      router.prefetch(duesPath(rawId));
      router.prefetch(eventsPath(rawId));
      router.prefetch(officersPath(rawId));
      router.prefetch(termsPath(rawId));
      router.prefetch(documentsPath(rawId));
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const handle = window.requestIdleCallback(prewarm, { timeout: 1500 });
      return () => window.cancelIdleCallback(handle);
    } else {
      const timer = setTimeout(prewarm, 400);
      return () => clearTimeout(timer);
    }
  }, [rawId, router]);

  return (
    <nav
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        flex: 1,
        overflowY: "auto",
      }}
    >
      <NavLinkItem
        href={workspacePath(rawId)}
        title="Home"
        label="Home"
        icon={Home}
        strokeWidth={2.2}
        isActive={activeSection === "home"}
        isCollapsed={isCollapsed}
      />

      <NavLinkItem
        href={membersPath(rawId)}
        title="Members: view and manage roster"
        label="Members"
        icon={Users}
        strokeWidth={2.2}
        isActive={activeSection === "members"}
        isCollapsed={isCollapsed}
      />

      <NavLinkItem
        href={duesPath(rawId)}
        title="Dues: set and track dues periods"
        label="Dues"
        icon={Banknote}
        strokeWidth={2.2}
        isActive={activeSection === "dues"}
        isCollapsed={isCollapsed}
      />

      <NavLinkItem
        href={eventsPath(rawId)}
        title="Events: create and manage events"
        label="Events"
        icon={CalendarDays}
        strokeWidth={2.2}
        isActive={activeSection === "events"}
        isCollapsed={isCollapsed}
      />

      <NavLinkItem
        href={officersPath(rawId)}
        title="Officers: manage team and invites"
        label="Officers"
        icon={Shield}
        strokeWidth={2.2}
        isActive={activeSection === "officers"}
        isCollapsed={isCollapsed}
      />

      <NavLinkItem
        href={termsPath(rawId)}
        title="Terms: record officer roles and terms"
        label="Terms"
        icon={Award}
        strokeWidth={2.2}
        isActive={activeSection === "terms"}
        isCollapsed={isCollapsed}
      />

      <NavLinkItem
        href={documentsPath(rawId)}
        title="Documents: store key documents and links"
        label="Documents"
        icon={Files}
        strokeWidth={2.2}
        isActive={activeSection === "documents"}
        isCollapsed={isCollapsed}
      />
    </nav>
  );
}
