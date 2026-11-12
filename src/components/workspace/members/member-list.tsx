import type { WorkspaceMember } from "@/src/app/(workspace)/members-actions";
import { MemberTable } from "./member-table";
import { MemberMobileCard } from "./member-mobile-card";
import { MemberPager } from "./member-pager";
import { MembersFloatingDecor } from "./members-decor";
import { pageCount } from "@/src/lib/pagination";

interface MemberListProps {
  members: WorkspaceMember[];
  matchingCount: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  /** Another page is loading */
  isPaging: boolean;
  confirmingIds: ReadonlySet<string>;
  reactivatingIds: ReadonlySet<string>;
  onConfirm: (member: WorkspaceMember) => void;
  onEdit: (member: WorkspaceMember) => void;
  onDeactivate: (member: WorkspaceMember) => void;
  onReactivate: (member: WorkspaceMember) => void;
}

/** The roster: a table on wide screens, cards on phones (the CSS shows one of the two). */
export function MemberList({
  members,
  matchingCount,
  page,
  pageSize,
  onPageChange,
  isPaging,
  confirmingIds,
  reactivatingIds,
  onConfirm,
  onEdit,
  onDeactivate,
  onReactivate,
}: MemberListProps) {
  return (
    <div className="orgkit-members-list" style={{ position: "relative", width: "100%", marginTop: 4 }}>
      <MembersFloatingDecor />

      <div className="orgkit-members-list-body" style={{ position: "relative", zIndex: 2, width: "100%" }}>
        <div className="orgkit-members-desktop">
          <MemberTable
            members={members}
            onConfirm={onConfirm}
            onEdit={onEdit}
            onDeactivate={onDeactivate}
            onReactivate={onReactivate}
            confirmingIds={confirmingIds}
            reactivatingIds={reactivatingIds}
            matchingCount={matchingCount}
            page={page}
            pageSize={pageSize}
            onPageChange={onPageChange}
            isPaging={isPaging}
          />
        </div>

        <div className="orgkit-members-mobile">
          {members.map((member) => (
            <MemberMobileCard
              key={member.id}
              member={member}
              onConfirm={onConfirm}
              onEdit={onEdit}
              onDeactivate={onDeactivate}
              onReactivate={onReactivate}
              isConfirming={confirmingIds.has(member.id)}
              isReactivating={reactivatingIds.has(member.id)}
            />
          ))}

          {matchingCount > pageSize && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginTop: 12 }}>
              <span style={{ fontSize: 13, color: "var(--color-muted)" }}>
                Showing {(page - 1) * pageSize + 1}–{(page - 1) * pageSize + members.length} of {matchingCount}
              </span>
              <MemberPager
                page={page}
                pageCount={pageCount(matchingCount, pageSize)}
                onPageChange={onPageChange}
                disabled={isPaging}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
