import React from "react";
import {
  HEADER_ROW_STYLE,
  INVITE_CELL_PADDING,
  INVITE_COLUMNS,
  ROSTER_CELL_PADDING,
  ROSTER_COLUMNS,
  ROSTER_FOOTER_STYLE,
  ROSTER_HEADER_CELL_STYLE,
  TABLE_CARD_STYLE,
  type TableColumn,
} from "./member-table-layout";

type Variant = "roster" | "invites";

interface MemberSkeletonProps {
  /** Which table is loading: the member roster or the Invited view */
  variant?: Variant;
  rowCount?: number;
}

/** One grey placeholder shape */
function Bar({
  width,
  height,
  radius = 6,
  strength = 85,
}: {
  width: number;
  height: number;
  radius?: number;
  /** How dark, as a percentage of the line color */
  strength?: number;
}) {
  return (
    <div
      className="orgkit-skeleton"
      style={{
        width,
        height,
        flexShrink: 0,
        borderRadius: radius,
        backgroundColor: `color-mix(in srgb, var(--color-line) ${strength}%, transparent)`,
      }}
    />
  );
}

/** Column headings are real text: they are known before the data arrives */
function HeaderRow({ columns, centered }: { columns: readonly TableColumn[]; centered: boolean }) {
  return (
    <thead>
      <tr
        style={{
          ...HEADER_ROW_STYLE,
          ...(centered ? {} : { backgroundColor: "color-mix(in srgb, var(--color-base) 60%, transparent)", borderBottom: "1px solid var(--color-line)" }),
        }}
      >
        {columns.map((column) => (
          <th
            key={column.label}
            scope="col"
            style={{
              padding: column.padding,
              width: column.width,
              textAlign: centered ? "center" : "left",
              ...(centered ? ROSTER_HEADER_CELL_STYLE : {}),
            }}
          >
            {column.label}
          </th>
        ))}
      </tr>
    </thead>
  );
}

const rowBorder = (index: number, count: number) =>
  index === count - 1 ? "none" : "1px solid var(--color-line)";

/** The roster table while it loads: same card, columns, row height and footer as `MemberTable` */
function RosterTableSkeleton({ rowCount }: { rowCount: number }) {
  return (
    <div className="orgkit-members-table-card" style={{ ...TABLE_CARD_STYLE, display: "flex", flexDirection: "column" }}>
      <div style={{ flex: "1 1 auto", minHeight: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
          <HeaderRow columns={ROSTER_COLUMNS} centered />
          <tbody>
            {Array.from({ length: rowCount }).map((_, i) => (
              <tr key={i} style={{ borderBottom: rowBorder(i, rowCount) }}>
                <td style={{ padding: ROSTER_CELL_PADDING[0] }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <Bar width={38} height={38} radius={19} strength={80} />
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <Bar width={i % 2 === 0 ? 140 : 180} height={14} />
                      <Bar width={i % 2 === 0 ? 190 : 150} height={12} radius={5} strength={60} />
                    </div>
                  </div>
                </td>
                <td style={{ padding: ROSTER_CELL_PADDING[1] }}>
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <Bar width={76} height={26} radius={13} strength={70} />
                  </div>
                </td>
                <td style={{ padding: ROSTER_CELL_PADDING[2] }}>
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <Bar width={84} height={12} radius={5} strength={70} />
                  </div>
                </td>
                <td style={{ padding: ROSTER_CELL_PADDING[3] }}>
                  <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
                    {[0, 1, 2].map((n) => (
                      <Bar key={n} width={32} height={32} radius={16} strength={60} />
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={ROSTER_FOOTER_STYLE}>
        <Bar width={160} height={12} radius={5} strength={70} />
        <div style={{ display: "flex", gap: 6 }}>
          {[0, 1, 2].map((n) => (
            <Bar key={n} width={32} height={32} radius={8} strength={60} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** The Invited table while it loads, mirroring `InvitedView` */
function InvitesTableSkeleton({ rowCount }: { rowCount: number }) {
  return (
    <div style={TABLE_CARD_STYLE}>
      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <HeaderRow columns={INVITE_COLUMNS} centered={false} />
        <tbody>
          {Array.from({ length: rowCount }).map((_, i) => (
            <tr key={i} style={{ borderBottom: rowBorder(i, rowCount) }}>
              <td style={{ padding: INVITE_CELL_PADDING[0] }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <Bar width={i % 2 === 0 ? 220 : 180} height={14} />
                  <Bar width={i % 2 === 0 ? 120 : 150} height={12} radius={5} strength={60} />
                </div>
              </td>
              <td style={{ padding: INVITE_CELL_PADDING[1] }}>
                <Bar width={72} height={24} radius={12} strength={70} />
              </td>
              <td style={{ padding: INVITE_CELL_PADDING[2] }}>
                <Bar width={84} height={12} radius={5} strength={70} />
              </td>
              <td style={{ padding: INVITE_CELL_PADDING[3] }}>
                <Bar width={84} height={12} radius={5} strength={70} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The phone layout: stacked cards, like `MemberMobileCard` */
function CardsSkeleton({ rowCount }: { rowCount: number }) {
  return (
    <>
      {Array.from({ length: rowCount }).map((_, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            backgroundColor: "var(--color-surface)",
            borderRadius: 16,
            border: "1px solid var(--color-line)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Bar width={38} height={38} radius={19} strength={80} />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Bar width={i % 2 === 0 ? 120 : 150} height={14} />
              <Bar width={i % 2 === 0 ? 150 : 120} height={12} radius={5} strength={60} />
            </div>
          </div>
          <Bar width={68} height={24} radius={12} strength={70} />
        </div>
      ))}
    </>
  );
}

/**
 * Placeholder shown while members or invitations load. It draws the same table
 * as the loaded screen (the layout constants are shared with the real tables),
 * so nothing shifts when the data arrives. On phones it draws cards instead,
 * as the loaded screen does; the CSS in `MembersStyles` picks which one shows.
 */
export function MemberSkeleton({ variant = "roster", rowCount = 6 }: MemberSkeletonProps) {
  const isRoster = variant === "roster";

  return (
    <div
      role="status"
      aria-label={isRoster ? "Loading member roster" : "Loading invitations"}
      // The roster sits in the same flexible box as the loaded list, so both fill the page alike
      className={isRoster ? "orgkit-members-list" : undefined}
      style={{ position: "relative", width: "100%", marginTop: 4 }}
    >
      <div className={isRoster ? "orgkit-members-list-body" : undefined} style={{ width: "100%" }}>
        <div className="orgkit-members-desktop">
          {isRoster ? <RosterTableSkeleton rowCount={rowCount} /> : <InvitesTableSkeleton rowCount={rowCount} />}
        </div>
        <div className="orgkit-members-mobile">
          <CardsSkeleton rowCount={Math.min(rowCount, 6)} />
        </div>
      </div>
      <span className="sr-only">{isRoster ? "Loading member roster..." : "Loading invitations..."}</span>
    </div>
  );
}
