import React, { useEffect, useRef } from "react";
import type { WorkspaceMember } from "@/src/app/(workspace)/members-actions";
import { MemberStatusBadge } from "./member-status-badge";
import { MemberActions } from "./member-actions";
import { MemberPager } from "./member-pager";
import {
  ROSTER_CELL_PADDING,
  ROSTER_FOOTER_STYLE,
  ROSTER_TABLE_STYLE,
  TABLE_CARD_STYLE,
} from "./member-table-layout";
import { RosterColgroup, RosterHeaderBar, RosterScreenReaderHeader } from "./roster-table-header";
import { pageCount } from "@/src/lib/pagination";

interface MemberTableProps {
  members: WorkspaceMember[];
  onConfirm: (member: WorkspaceMember) => void;
  onEdit: (member: WorkspaceMember) => void;
  onDeactivate: (member: WorkspaceMember) => void;
  onReactivate: (member: WorkspaceMember) => void;
  confirmingIds: ReadonlySet<string>;
  reactivatingIds?: ReadonlySet<string>;
  /** Members matching the search and tab, across all pages */
  matchingCount: number;
  /** The page on screen, counted from 1, and how many members a page holds */
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  /** Another page is loading: the rows stay on screen, dimmed */
  isPaging?: boolean;
}

function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(d);
  } catch {
    return isoString;
  }
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return (name[0] || "?").toUpperCase();
}

/**
 * Desktop table for the member roster adhering to docs/design.md:
 * - Columns: Member (avatar, name, email with ellipsis truncation and hover tooltip), Status, Joined Date, Actions.
 * - Actions include Edit, Deactivate, Reactivate, and Confirm with clear accessibility labels.
 * - Fluid row hover transitions and subtle zinc borders.
 */
export function MemberTable({
  members,
  onConfirm,
  onEdit,
  onDeactivate,
  onReactivate,
  confirmingIds,
  reactivatingIds = new Set(),
  matchingCount,
  page,
  pageSize,
  onPageChange,
  isPaging = false,
}: MemberTableProps) {
  // A new page starts at its first row
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [page]);

  const firstShown = (page - 1) * pageSize + 1;
  const lastShown = firstShown + members.length - 1;

  return (
    <div
      className="orgkit-members-table-card"
      style={{ ...TABLE_CARD_STYLE, display: "flex", flexDirection: "column" }}
    >
      {/* Only the rows scroll: the header sits above them, so the scrollbar starts under it */}
      <RosterHeaderBar />
      <div
        tabIndex={0}
        role="region"
        aria-label="Members roster table"
        ref={scrollRef}
        aria-busy={isPaging || undefined}
        className="orgkit-members-table-scroll"
        style={{
          flex: "1 1 auto",
          minHeight: 0,
          overflow: "auto",
          scrollbarGutter: "stable",
          opacity: isPaging ? 0.6 : 1,
          transition: "opacity 0.15s ease",
        }}
      >
      <table style={ROSTER_TABLE_STYLE}>
        <RosterColgroup />
        <RosterScreenReaderHeader />
        <tbody style={{ fontSize: 13.5 }}>
          {members.map((member, idx) => {
            const isConfirming = confirmingIds.has(member.id);
            const isReactivating = reactivatingIds.has(member.id);

            return (
              <tr
                key={member.id}
                data-member-row={member.id}
                className="orgkit-member-row"
                style={{
                  borderBottom:
                    idx === members.length - 1 ? "none" : "1px solid var(--color-line)",
                  backgroundColor: "transparent",
                  transition: "background-color 0.15s ease",
                }}
              >
                {/* Member Info: Avatar Initials + Truncated Name & Email */}
                <td style={{ padding: ROSTER_CELL_PADDING[0] }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      aria-hidden="true"
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: "50%",
                        backgroundColor: "color-mix(in srgb, var(--color-accent) 18%, transparent)",
                        color: "var(--color-accent-strong)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 13,
                        fontWeight: 700,
                        flexShrink: 0,
                        userSelect: "none",
                      }}
                    >
                      {getInitials(member.fullName)}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                        minWidth: 0,
                        overflow: "hidden",
                      }}
                    >
                      <span
                        title={member.fullName}
                        style={{
                          fontWeight: 600,
                          color: "var(--color-ink)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {member.fullName}
                      </span>
                      <span
                        title={member.email}
                        style={{
                          fontSize: 12.5,
                          color: "var(--color-muted)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {member.email}
                      </span>
                    </div>
                  </div>
                </td>

                {/* Status Badge */}
                <td style={{ padding: ROSTER_CELL_PADDING[1], textAlign: "center" }}>
                  <MemberStatusBadge status={member.status} />
                </td>

                {/* Joined Date */}
                <td
                  style={{
                    padding: ROSTER_CELL_PADDING[2],
                    textAlign: "center",
                    color: "var(--color-muted)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {formatDate(member.createdAt)}
                </td>

                {/* Actions Cell */}
                <td style={{ padding: ROSTER_CELL_PADDING[3], textAlign: "center" }}>
                  <MemberActions
                    member={member}
                    onConfirm={onConfirm}
                    onEdit={onEdit}
                    onDeactivate={onDeactivate}
                    onReactivate={onReactivate}
                    isConfirming={isConfirming}
                    isReactivating={isReactivating}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>

      {/* Table Footer with Showing count & pagination controls matching design */}
      <div style={ROSTER_FOOTER_STYLE}>
        <div>
          Showing {firstShown}–{lastShown} of {matchingCount} {matchingCount === 1 ? "member" : "members"}
        </div>
        <MemberPager
          page={page}
          pageCount={pageCount(matchingCount, pageSize)}
          onPageChange={onPageChange}
          disabled={isPaging}
        />
      </div>
    </div>
  );
}
