import type { CSSProperties } from "react";

/**
 * The shape of the roster and invitation tables, in one place. The tables and
 * their loading skeletons both read it, so a placeholder always has the same
 * columns, spacing and card as the real thing.
 */

export interface TableColumn {
  label: string;
  width: string;
  padding: string;
}

export const ROSTER_COLUMNS: readonly TableColumn[] = [
  { label: "Member", width: "36%", padding: "14px 24px" },
  { label: "Status", width: "16%", padding: "14px 20px" },
  { label: "Joined", width: "18%", padding: "14px 20px" },
  { label: "Actions", width: "30%", padding: "14px 24px" },
];

export const INVITE_COLUMNS: readonly TableColumn[] = [
  { label: "Person", width: "46%", padding: "14px 24px" },
  { label: "Status", width: "16%", padding: "14px 20px" },
  { label: "Invited", width: "19%", padding: "14px 20px" },
  { label: "Expires", width: "19%", padding: "14px 20px" },
];

/** Cell padding of a body row; the roster's rows are taller because they hold an avatar */
export const ROSTER_CELL_PADDING = ["16px 24px", "16px 20px", "16px 20px", "16px 24px"] as const;
export const INVITE_CELL_PADDING = ["14px 24px", "14px 20px", "14px 20px", "14px 20px"] as const;

/** Corner radii for the roster screen: panels (cards, tables) and the fields above them, so their corners agree */
export const PANEL_RADIUS = 16;
export const FIELD_RADIUS = 12;

/** The rounded card both tables sit in */
export const TABLE_CARD_STYLE: CSSProperties = {
  width: "100%",
  backgroundColor: "var(--color-surface)",
  borderRadius: PANEL_RADIUS,
  border: "1px solid var(--color-line)",
  boxShadow: "0 4px 18px color-mix(in srgb, var(--color-ink) 3%, transparent)",
  overflow: "hidden",
  boxSizing: "border-box",
};

const HEADER_TEXT_STYLE: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "var(--color-muted)",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
};

export const HEADER_ROW_STYLE = HEADER_TEXT_STYLE;

/** A roster header cell, centered over its column */
export const ROSTER_HEADER_CELL_STYLE: CSSProperties = {
  textAlign: "center",
};

/** Both roster tables (the header and the rows) use fixed columns so they line up */
export const ROSTER_TABLE_STYLE: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  tableLayout: "fixed",
};

/** The strip under the roster table: the "Showing" text and the pager */
export const ROSTER_FOOTER_STYLE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexShrink: 0,
  padding: "14px 24px",
  borderTop: "1px solid var(--color-line)",
  backgroundColor: "var(--color-surface)",
  fontSize: 13,
  color: "var(--color-muted)",
};
