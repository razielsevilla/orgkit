import type { ReactNode } from "react";
import Link from "next/link";
import { Award, ArrowUpRight, Banknote, BookOpen, CalendarDays, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  HANDOVER_HORIZON_DAYS,
  daysBetween,
  expectedPacePct,
  formatPesoCompact,
  inDays,
  percentOf,
  plural,
  type HealthArea,
  type HealthStatus,
  type OrgHealthData,
} from "@/src/lib/health/org-health";
import { formatEventStart, formatShortDate } from "@/src/lib/health/format";
import { documentsPath, duesPath, eventsPath, handoverPath, membersPath, termsPath } from "@/src/lib/routes";
import { DotTimeline, FIGURE, MiniColumns, RankedBars, UnitSquares } from "./health-figures";
import { BigNumber, CollectionMeter, Fact, MONO, PANEL_STYLE, StatusChip, TABULAR } from "./health-shared";

interface CardsProps {
  orgId: string;
  data: OrgHealthData;
  statuses: Record<HealthArea, HealthStatus>;
}

export const cardId = (area: HealthArea) => `health-${area}`;

interface AreaCardProps {
  area: HealthArea;
  title: string;
  icon: LucideIcon;
  status: HealthStatus;
  wide?: boolean;
  /** The first link is the card title's; any others sit under the content */
  links: { href: string; label: string }[];
  children: ReactNode;
}

function AreaCard({ area, title, icon: Icon, status, wide, links, children }: AreaCardProps) {
  const titleId = `${cardId(area)}-title`;
  return (
    <article
      id={cardId(area)}
      aria-labelledby={titleId}
      className={`orgkit-health-card ${area === "dues" || area === "members" ? "stagger-2" : "stagger-3"}${wide ? " orgkit-health-card-wide" : ""}`}
      style={{
        ...PANEL_STYLE,
        borderRadius: 20,
        padding: "clamp(12px, 1.3vw, 16px)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        minWidth: 0,
      }}
    >
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <span
            aria-hidden="true"
            style={{
              width: 32,
              height: 32,
              flexShrink: 0,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 10,
              backgroundColor: "var(--color-base)",
              border: "1px solid var(--color-line)",
              color: "var(--color-ink-soft)",
            }}
          >
            <Icon size={17} strokeWidth={1.75} />
          </span>
          <h3 id={titleId} className="orgkit-wrap" style={{ margin: 0, fontSize: 16, fontWeight: 600, letterSpacing: "-0.02em" }}>
            {/* The title is the link into the screen: it saves a footer row on every card */}
            <Link href={links[0].href} className="orgkit-tap-link orgkit-health-link orgkit-health-title-link">
              {title}
              <ArrowUpRight size={15} strokeWidth={2} aria-hidden="true" />
            </Link>
          </h3>
        </div>
        <StatusChip status={status} />
      </header>

      {/* When the card is taller than its content, the first block stays at the top and the last sinks to the bottom */}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 10, flex: 1, minWidth: 0 }}>
        {children}
      </div>

      {links.slice(1).map((link) => (
        <Link key={link.href} href={link.href} className="orgkit-health-link orgkit-health-extra-link">
          {link.label}
          <ArrowUpRight size={14} strokeWidth={2} aria-hidden="true" />
        </Link>
      ))}
    </article>
  );
}

/** An area with nothing to measure yet: a line saying so and a line saying what to do */
function NotStarted({ title, hint }: { title: string; hint: string }) {
  return (
    <div>
      <p style={{ margin: 0, fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--color-ink)" }}>{title}</p>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, lineHeight: 1.4, color: "var(--color-muted)" }}>{hint}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------

function DuesCard({ orgId, data, statuses }: CardsProps) {
  const d = data.dues;
  const status = statuses.dues;
  const links = [{ href: duesPath(orgId), label: "Dues" }];

  if (!d || d.expected <= 0) {
    return (
      <AreaCard area="dues" title="Dues" icon={Banknote} status={status} wide links={links}>
        <NotStarted
          title={d ? d.name : "No open period"}
          hint={d ? "No active members to collect from yet" : "Create one to start collecting"}
        />
      </AreaCard>
    );
  }

  const rate = percentOf(d.collected, d.expected);
  const pace = expectedPacePct(d.createdOn, d.dueOn, data.today);
  const daysToDue = daysBetween(data.today, d.dueOn);

  return (
    <AreaCard area="dues" title="Dues" icon={Banknote} status={status} wide links={links}>
      <div className="orgkit-health-dues-body">
        <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
          <p className="orgkit-wrap" style={{ margin: 0, fontSize: 13, color: "var(--color-muted-strong)" }}>
            {d.name} · due {formatShortDate(d.dueOn)}
            {daysToDue < 0 && (
              <strong style={{ color: "var(--color-ink)", fontWeight: 600 }}> · {plural(-daysToDue, "day")} overdue</strong>
            )}
          </p>
          <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", columnGap: 8 }}>
            <span style={{ fontSize: "clamp(26px, 3vw, 32px)", fontWeight: 700, lineHeight: 1.1, letterSpacing: "-0.03em", color: "var(--color-ink)", ...TABULAR }}>
              {formatPesoCompact(d.collected)}
            </span>
            <span style={{ fontSize: 14, color: "var(--color-muted)" }}>of {formatPesoCompact(d.expected)}</span>
          </div>
          <CollectionMeter collectedPct={rate} pacePct={pace} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 0 }}>
          <RankedBars
            name="Members by payment status"
            parts={[
              { label: "paid", value: d.paid, color: FIGURE.accent },
              { label: "pending", value: d.pending, color: FIGURE.progress },
              { label: "rejected", value: d.rejected, color: FIGURE.strong },
              { label: "unpaid", value: d.unpaid, color: FIGURE.soft },
            ]}
          />
        </div>
      </div>
    </AreaCard>
  );
}

// ---------------------------------------------------------------------------

function MembersCard({ orgId, data, statuses }: CardsProps) {
  const m = data.members;
  const status = statuses.members;
  const links = [{ href: membersPath(orgId), label: "Members" }];

  if (status === "empty") {
    return (
      <AreaCard area="members" title="Members" icon={Users} status={status} links={links}>
        <NotStarted title="No members yet" hint="Add members or share the join link" />
      </AreaCard>
    );
  }

  const weeks = m.joinedWeekly.length;
  return (
    <AreaCard area="members" title="Members" icon={Users} status={status} links={links}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <BigNumber value={m.active} label={m.active === 1 ? "active member" : "active members"} />
        {m.pending > 0 && (
          <span
            style={{
              flexShrink: 0,
              padding: "3px 10px",
              borderRadius: 9999,
              backgroundColor: "var(--color-base)",
              border: "1px solid var(--color-line-strong)",
              color: "var(--color-ink)",
              ...MONO,
              fontSize: 11.5,
            }}
          >
            {m.pending} to confirm
          </span>
        )}
      </div>
      {weeks === 0 && (
        <RankedBars
          name="New members by period"
          keepOrder
          labelWidth={104}
          parts={[
            { label: "last 30 days", value: m.joined30d, color: FIGURE.accent },
            { label: "30 days before", value: m.joinedPrev30d, color: FIGURE.soft },
          ]}
        />
      )}
      {weeks > 0 && (
        <MiniColumns
          name="New members per week"
          columns={m.joinedWeekly.map((n, i) => ({
            value: n,
            tip: `${plural(n, "new member")} ${i === weeks - 1 ? "this week" : `${weeks - 1 - i} ${weeks - 1 - i === 1 ? "week" : "weeks"} ago`}`,
          }))}
          startLabel={`${weeks} weeks ago`}
          endLabel="New per week"
          height={44}
        />
      )}
    </AreaCard>
  );
}

// ---------------------------------------------------------------------------

function EventsCard({ orgId, data, statuses }: CardsProps) {
  const e = data.events;
  const status = statuses.events;
  const links = [{ href: eventsPath(orgId), label: "Events" }];

  if (status === "empty") {
    return (
      <AreaCard area="events" title="Events" icon={CalendarDays} status={status} links={links}>
        <NotStarted title="No events yet" hint="Schedule one to track turnout" />
      </AreaCard>
    );
  }

  const first = e.recent[0];
  const last = e.recent[e.recent.length - 1];

  return (
    <AreaCard area="events" title="Events" icon={CalendarDays} status={status} links={links}>
      <BigNumber
        value={e.turnoutPct90d !== null ? `${e.turnoutPct90d}%` : e.held90d}
        label={e.turnoutPct90d !== null ? "average turnout" : "events in the last 90 days"}
      />
      {e.recent.length === 0 && e.turnoutPct90d !== null && (
        <RankedBars
          name="Average turnout by period"
          keepOrder
          suffix="%"
          labelWidth={104}
          parts={[
            { label: "last 90 days", value: e.turnoutPct90d, color: FIGURE.accent },
            { label: "90 days before", value: e.turnoutPctPrev90d ?? 0, color: FIGURE.soft },
          ]}
        />
      )}
      {e.recent.length > 0 && (
        <MiniColumns
          name="Turnout per event, oldest to latest"
          max={100}
          columns={e.recent.map((r) => ({
            value: r.turnoutPct,
            tip:
              r.turnoutPct === null
                ? `${r.title}: no turnout figure, ${formatShortDate(r.startsAt)}`
                : `${r.title}: ${r.turnoutPct}% turnout, ${formatShortDate(r.startsAt)}`,
          }))}
          startLabel={formatShortDate(first.startsAt)}
          endLabel={formatShortDate(last.startsAt)}
          height={44}
        />
      )}
      {e.nextEvent ? (
        <Fact icon={CalendarDays}>
          <span className="orgkit-truncate" style={{ display: "block" }} title={e.nextEvent.title}>
            <span style={{ ...MONO, fontSize: 12 }}>{formatEventStart(e.nextEvent.startsAt)}</span> ·{" "}
            <strong style={{ fontWeight: 600, color: "var(--color-ink)" }}>{e.nextEvent.title}</strong>
          </span>
        </Fact>
      ) : (
        <Fact icon={CalendarDays} tone="warn">
          Nothing scheduled
        </Fact>
      )}
    </AreaCard>
  );
}

// ---------------------------------------------------------------------------

function OfficersCard({ orgId, data, statuses }: CardsProps) {
  const o = data.officers;
  const status = statuses.officers;
  const links = [{ href: termsPath(orgId), label: "Terms" }];

  if (status === "empty") {
    return (
      <AreaCard area="officers" title="Terms" icon={Award} status={status} links={links}>
        <NotStarted title="No terms recorded" hint="Record who holds each role" />
      </AreaCard>
    );
  }

  const steady = Math.max(0, o.termsCurrent - o.termsEnding30d);
  return (
    <AreaCard area="officers" title="Terms" icon={Award} status={status} links={links}>
      <BigNumber value={o.termsCurrent} label={o.termsCurrent === 1 ? "current term" : "current terms"} />
      {o.termsCurrent > 0 ? (
        <UnitSquares
          name="Current terms"
          caption="One square for each current term"
          parts={[
            { label: "steady", value: steady, color: FIGURE.accent },
            { label: "ending within 30 days", value: o.termsEnding30d, color: FIGURE.strong },
          ]}
        />
      ) : (
        <Fact icon={Award} tone="warn">
          Every term has ended
        </Fact>
      )}
    </AreaCard>
  );
}

// ---------------------------------------------------------------------------

function HandoverCard({ orgId, data, statuses }: CardsProps) {
  const h = data.handover;
  const docs = data.documents;
  const status = statuses.handover;
  const docsLabel = docs.total > 0 ? plural(docs.total, "document") : "Documents";
  // On the figure's legend row, to save a whole row of height; alone only when there is no figure
  const docsLink = (
    <Link href={documentsPath(orgId)} className="orgkit-tap-link orgkit-health-link" style={{ minHeight: 28, whiteSpace: "nowrap" }}>
      {docsLabel}
      <ArrowUpRight size={14} strokeWidth={2} aria-hidden="true" />
    </Link>
  );
  const links = [{ href: handoverPath(orgId), label: "Handover" }, ...(status === "empty" ? [{ href: documentsPath(orgId), label: docsLabel }] : [])];

  if (status === "empty") {
    return (
      <AreaCard area="handover" title="Handover" icon={BookOpen} status={status} links={links}>
        <NotStarted title="No guides yet" hint="Write one for each role" />
      </AreaCard>
    );
  }

  const leaving = h.endingTotal > 0;
  return (
    <AreaCard area="handover" title="Handover" icon={BookOpen} status={status} links={links}>
      <BigNumber
        value={leaving ? `${h.endingReady} of ${h.endingTotal}` : h.guidesReady}
        label={leaving ? "leaving roles with a ready guide" : h.guidesReady === 1 ? "guide ready" : "guides ready"}
      />
      {leaving ? (
        <DotTimeline
          name="Leaving roles by days left"
          aside={docsLink}
          horizon={HANDOVER_HORIZON_DAYS}
          legend={[
            { label: "ready", value: h.endingReady, color: FIGURE.accent },
            { label: "draft", value: h.endingDraft, color: FIGURE.progress },
            { label: "no guide", value: h.endingMissing, color: FIGURE.strong },
          ].filter((p) => p.value > 0)}
          rows={h.roles.map((role) => {
            const days = daysBetween(data.today, role.endDate);
            const state = role.guideStatus === "ready" ? "ready" : role.guideStatus === "draft" ? "draft" : "no guide";
            return {
              label: role.roleTitle,
              days,
              color:
                role.guideStatus === "ready" ? FIGURE.accent : role.guideStatus === "draft" ? FIGURE.progress : FIGURE.strong,
              tip: `${role.roleTitle}: ${state}, term ends ${inDays(days)}`,
            };
          })}
        />
      ) : (
        <UnitSquares
          name="Guides by status"
          caption="One square for each guide"
          aside={docsLink}
          parts={[
            { label: "ready", value: h.guidesReady, color: FIGURE.accent },
            { label: "draft", value: h.guidesDraft, color: FIGURE.progress },
          ]}
        />
      )}
    </AreaCard>
  );
}

// ---------------------------------------------------------------------------

/** The five area cards, in the order an officer reads them: money and people first */
export function HealthCards(props: CardsProps) {
  return (
    <div className="orgkit-health-grid">
      <DuesCard {...props} />
      <MembersCard {...props} />
      <EventsCard {...props} />
      <OfficersCard {...props} />
      <HandoverCard {...props} />
    </div>
  );
}
