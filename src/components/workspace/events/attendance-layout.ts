/** Layout shared by the attendance table and its skeleton (plain module: both server and client files import it) */

/** The list scrolls inside its card, so a long list never stretches the page or scrolls it sideways */
export const ATTENDANCE_SCROLL_MAX_HEIGHT = 480;

/** Column widths: member, method, time, remove button */
export const ATTENDANCE_COLUMNS = ["44%", "16%", "32%", "8%"] as const;
