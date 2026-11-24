import type { EventStatus } from "./event-validation";

export interface PastEventLogItem {
  id: string;
  orgId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  location: string | null;
  status: EventStatus;
  attendanceCount: number | null; // null if cancelled
  createdAt: string;
}

export interface TermFilterOption {
  termName: string;
  startDate: string; // ISO date YYYY-MM-DD
  endDate: string; // ISO date YYYY-MM-DD
}

export interface PastEventsSummary {
  totalEvents: number;
  completedEvents: number;
  cancelledEvents: number;
  totalAttendance: number;
  averageAttendance: number;
}

export interface PastEventsFilterState {
  term: string; // "all" or specific termName
  fromDate?: string; // YYYY-MM-DD
  toDate?: string; // YYYY-MM-DD
  search?: string;
}

export interface PastEventsLogData {
  orgId: string;
  orgName: string;
  events: PastEventLogItem[];
  terms: TermFilterOption[];
  summary: PastEventsSummary;
}

export const PAST_EVENTS_MESSAGES = {
  loadFailed: "We couldn't load past events. Try refreshing the page.",
  noPastEvents: "No past events yet",
  noMatches: "No past events match your filters",
  attended: "attended",
  cancelled: "Cancelled",
  emptyDescription:
    "When your events conclude, their dates, locations, and attendance records are automatically logged here for future teams.",
} as const;
