import React from "react";
import Link from "next/link";
import { ArrowUpRight, Calendar, MapPin, Users, XCircle } from "lucide-react";
import { eventPath } from "@/src/lib/routes";
import type { PastEventLogItem } from "@/src/lib/events/past-events-types";

interface EventsLogTableProps {
  orgId: string;
  events: PastEventLogItem[];
}

function formatEventDate(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return isoDate;
  }
}

export function EventsLogTable({ orgId, events }: EventsLogTableProps) {
  return (
    <div
      className="orgkit-log-desktop-table"
      style={{
        width: "100%",
        backgroundColor: "var(--color-surface)",
        borderRadius: 20,
        border: "1px solid var(--color-line)",
        overflow: "hidden",
        boxShadow: "0 2px 10px rgba(0, 0, 0, 0.02)",
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          textAlign: "left",
          fontSize: 13.5,
        }}
      >
        <thead>
          <tr
            style={{
              backgroundColor: "color-mix(in srgb, var(--color-base) 60%, transparent)",
              borderBottom: "1px solid var(--color-line)",
              color: "var(--color-muted)",
              fontSize: 12.5,
              fontWeight: 600,
            }}
          >
            <th style={{ padding: "14px 20px" }}>Date & Time</th>
            <th style={{ padding: "14px 20px" }}>Event</th>
            <th style={{ padding: "14px 20px" }}>Location</th>
            <th style={{ padding: "14px 20px" }}>Attendance</th>
            <th style={{ padding: "14px 20px", textAlign: "right" }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => {
            const isCancelled = event.status === "cancelled";
            const targetUrl = eventPath(orgId, event.id);

            return (
              <tr
                key={event.id}
                className="orgkit-log-row"
                style={{
                  borderBottom: "1px solid var(--color-line)",
                }}
              >
                {/* Date & Time */}
                <td style={{ padding: "16px 20px", whiteSpace: "nowrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Calendar size={15} color="var(--color-muted)" />
                    <span style={{ fontWeight: 500, color: "var(--color-ink)" }}>
                      {formatEventDate(event.startsAt)}
                    </span>
                  </div>
                </td>

                {/* Title & Link */}
                <td style={{ padding: "16px 20px" }}>
                  <Link
                    href={targetUrl}
                    style={{
                      fontWeight: 700,
                      color: "var(--color-ink)",
                      textDecoration: "none",
                      display: "inline-block",
                      maxWidth: 260,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={event.title}
                  >
                    {event.title}
                  </Link>
                </td>

                {/* Location */}
                <td style={{ padding: "16px 20px", color: "var(--color-muted)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <MapPin size={14} style={{ flexShrink: 0 }} />
                    <span
                      style={{
                        maxWidth: 180,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={event.location ?? "No location"}
                    >
                      {event.location ? event.location : "—"}
                    </span>
                  </div>
                </td>

                {/* Attendance Badge */}
                <td style={{ padding: "16px 20px" }}>
                  {isCancelled ? (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        backgroundColor: "#FEF2F2",
                        color: "#DC2626",
                        border: "1px solid #FECACA",
                        padding: "3px 10px",
                        borderRadius: 9999,
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      <XCircle size={13} />
                      <span>Cancelled</span>
                    </span>
                  ) : (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        backgroundColor: "color-mix(in srgb, var(--color-accent) 12%, transparent)",
                        color: "var(--color-accent-strong)",
                        border: "1px solid color-mix(in srgb, var(--color-accent) 25%, transparent)",
                        padding: "3px 10px",
                        borderRadius: 9999,
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      <Users size={13} />
                      <span>{event.attendanceCount ?? 0} attended</span>
                    </span>
                  )}
                </td>

                {/* Action Link */}
                <td style={{ padding: "16px 20px", textAlign: "right" }}>
                  <Link
                    href={targetUrl}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      color: "var(--color-accent)",
                      fontWeight: 600,
                      fontSize: 13,
                      textDecoration: "none",
                      padding: "6px 12px",
                      borderRadius: 8,
                      transition: "background-color 0.15s ease",
                    }}
                  >
                    <span>View</span>
                    <ArrowUpRight size={14} />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
