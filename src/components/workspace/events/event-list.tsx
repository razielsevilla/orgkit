import React from "react";
import type { WorkspaceEvent } from "@/src/app/(workspace)/events-actions";
import { EventMobileCard } from "./event-mobile-card";
import { EventTable } from "./event-table";

interface EventListProps {
  orgId: string;
  events: WorkspaceEvent[];
  onEdit: (event: WorkspaceEvent) => void;
  onCancel: (event: WorkspaceEvent) => void;
}

/**
 * Events in order (upcoming first, then past): a table on wide screens and
 * cards on phones. The CSS in `MembersStyles` shows one of the two.
 */
export function EventList({ orgId, events, onEdit, onCancel }: EventListProps) {
  return (
    <div className="orgkit-members-list" style={{ position: "relative", width: "100%", marginTop: 4 }}>
      <div className="orgkit-members-list-body" style={{ position: "relative", zIndex: 2, width: "100%" }}>
        <div className="orgkit-members-desktop">
          <EventTable orgId={orgId} events={events} onEdit={onEdit} onCancel={onCancel} />
        </div>
        <div className="orgkit-members-mobile">
          {events.map((event) => (
            <EventMobileCard key={event.id} orgId={orgId} event={event} onEdit={onEdit} onCancel={onCancel} />
          ))}
        </div>
      </div>
    </div>
  );
}
