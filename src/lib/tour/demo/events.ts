import type { WorkspaceEvent } from "@/src/app/(workspace)/events-actions";
import { isoAt, isoDaysFromNow } from "@/src/lib/tour/demo/dates";

/**
 * Example events for the officer tour: two coming up, three that have ended and
 * one that was cancelled, so Upcoming, Past and the Cancelled badge all show.
 */

function event(
  n: number,
  title: string,
  location: string,
  day: number,
  startHour: number,
  endHour: number,
  status: WorkspaceEvent["status"] = "scheduled"
): WorkspaceEvent {
  return {
    id: `00000000-0000-4000-8000-0000000004${String(n).padStart(2, "0")}`,
    orgId: "demo",
    title,
    startsAt: isoAt(day, startHour),
    endsAt: isoAt(day, endHour),
    location,
    status,
    checkinOpen: false,
    createdAt: isoDaysFromNow(day - 14),
  };
}

export const DEMO_EVENTS: WorkspaceEvent[] = [
  event(1, "General Assembly", "Student Center, Room 204", 1, 15, 17),
  event(2, "Leadership Workshop", "Main Auditorium", 9, 13, 16),
  event(3, "Orientation Day", "Covered Court", -8, 9, 12),
  event(4, "Community Outreach Drive", "Barangay Hall", -22, 8, 14),
  event(5, "Officers' Meeting", "Org Room", -36, 16, 18),
  event(6, "Bake Sale Fundraiser", "Canteen Lobby", -15, 10, 15, "cancelled"),
];
