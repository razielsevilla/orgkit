"use client";

import { useMemo, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import type { WorkspaceEvent } from "@/src/app/(workspace)/events-actions";
import { MembersStyles } from "@/src/components/workspace/members/members-styles";
import { sortEvents } from "@/src/lib/events/event-validation";
import { eventPath } from "@/src/lib/routes";
import { EventEmptyState } from "./event-empty-state";
import { EventList } from "./event-list";
import { EventsHeader } from "./events-header";

// Off-screen modals lazy-loaded on demand to keep the critical bundle small
const EventFormDialog = dynamic(() => import("./event-form-dialog").then((m) => m.EventFormDialog), {
  ssr: false,
});
const EventCancelDialog = dynamic(() => import("./event-cancel-dialog").then((m) => m.EventCancelDialog), {
  ssr: false,
});

interface EventsClientProps {
  rawId: string;
  events: WorkspaceEvent[];
  /** Set when the first load failed: shows the retry banner */
  initialError?: string | null;
}

/**
 * The Events screen. It lives in the same frame as Members (the CSS is shared
 * through `MembersStyles`). The list comes from the server and is refreshed by
 * the server actions' revalidation, so there is no second copy in state.
 */
export function EventsClient({ rawId, events, initialError = null }: EventsClientProps) {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<WorkspaceEvent | null>(null);
  const [cancelTarget, setCancelTarget] = useState<WorkspaceEvent | null>(null);

  const sorted = useMemo(() => sortEvents(events), [events]);

  const retry = () => startRefresh(() => router.refresh());

  const closeForm = () => {
    setCreateOpen(false);
    setEditTarget(null);
  };

  return (
    <div
      style={{
        height: "100%",
        overflowY: "auto",
        padding: "36px clamp(16px, 4vw, 36px) 60px clamp(16px, 4vw, 36px)",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
      }}
    >
      <div
        className="orgkit-members-shell"
        style={{
          width: "100%",
          maxWidth: 960,
          margin: "0 auto",
          position: "relative",
          animation: "cardPopout 0.45s cubic-bezier(0.16, 1.25, 0.38, 1) both",
        }}
      >
        <MembersStyles />

        <EventFormDialog
          orgId={rawId}
          event={editTarget}
          isOpen={createOpen || editTarget !== null}
          onClose={closeForm}
          onSaved={({ id, created }) => {
            // A new event opens on its own page
            if (created) router.push(eventPath(rawId, id));
          }}
        />
        <EventCancelDialog
          orgId={rawId}
          event={cancelTarget}
          isOpen={cancelTarget !== null}
          onClose={() => setCancelTarget(null)}
        />

        <EventsHeader
          eventCount={events.length}
          onNewEvent={() => setCreateOpen(true)}
          errorMessage={initialError}
          onRetry={retry}
          isRetrying={isRefreshing}
        />

        {sorted.length > 0 ? (
          <EventList orgId={rawId} events={sorted} onEdit={setEditTarget} onCancel={setCancelTarget} />
        ) : (
          !initialError && <EventEmptyState onNewEvent={() => setCreateOpen(true)} />
        )}
      </div>
    </div>
  );
}
