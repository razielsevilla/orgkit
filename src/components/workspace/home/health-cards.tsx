import type { ReactNode } from "react";
import Link from "next/link";
import { Award, ArrowUpRight, Banknote, BookOpen, CalendarDays, FileText, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  HEALTH_RULES,
  daysBetween,
  expectedPacePct,
  formatPesoCompact,
  inDays,
  percentOf,
  plural,
  turnoutChange,
  type HealthArea,
  type HealthStatus,
  type OrgHealthData,
} from "@/src/lib/health/org-health";
import { formatEventStart, formatShortDate } from "@/src/lib/health/format";
import { documentsPath, duesPath, eventsPath, handoverPath, membersPath, termsPath } from "@/src/lib/routes";
import { BigNumber, CollectionMeter, Delta, Fact, PANEL_STYLE, StatusChip } from "./health-shared";

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
  links: { href: string; label: string }[];
  children: ReactNode;
}

function AreaCard({ area, title, icon: Icon, status, wide, links, children }: AreaCardProps) {
  const titleId = `${cardId(area)}-title`;
  return (
    <article
      id={cardId(area)}
      aria-labelledby={titleId}
      className={`orgkit-health-card${wide ? " orgkit-health-card-wide" : ""}`}
      style={{
        ...PANEL_STYLE,
        borderRadius: 20,
        padding: "clamp(14px, 1.6vw, 18px)",
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
              borderRadius: 12,
              backgroundColor: "var(--color-brand-tint)",
              border: "1px solid color-mix(in srgb, var(--color-accent) 24%, transparent)",
              color: "var(--color-accent-strong)",
            }}
          >
            <Icon size={18} strokeWidth={1.75} />
          </span>
          <h3
            id={titleId}
            className="orgkit-wrap"
            style={{ margin: 0, fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em" }}
          >
            {/* The title is the link into the screen: it saves a footer row on every card */}
            <Link href={links[0].href} className="orgkit-tap-link orgkit-health-link orgkit-health-title-link">
              {title}
              <ArrowUpRight size={15} strokeWidth={2} aria-hidden="true" />
            </Link>
          </h3>
        </div>
        <StatusChip status={status} />
      </header>

      {/* When the card is taller than its content, the first line stays at the top and the last sinks to the bottom */}
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

/** What to show when an area has nothing to measure yet: one line of what it will do, and the way in */
function NotStarted({ title, hint }: { title: string; hint: string }) {
  return (
    <div>
      <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--color-ink)" }}>{title}</p>
      <p style={{ margin: "4px 0 0 0", fontSize: 13, lineHeight: 1.45, color: "var(--color-muted)" }}>{hint}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------

function DuesCard({ orgId, data, statuses }: CardsProps) {
  const d = data.dues;
  const status = statuses.dues;
  const links = [{ href: duesPath(orgId), label: d ? "Open dues" : "Set up dues" }];

  if (!d) {
    return (
      <AreaCard area="dues" title="Dues" icon={Banknote} status={status} wide links={links}>
        <NotStarted title="No open dues period" hint="Create a period to start collecting, then watch it fill here" />
      </AreaCard>
    );
  }

  if (d.expected <= 0) {
    return (
      <AreaCard area="dues" title="Dues" icon={Banknote} status={status} wide links={links}>
        <NotStarted title={d.name} hint="Dues are open, but there are no active members to collect from yet" />
      </AreaCard>
    );
  }

  const rate = percentOf(d.collected, d.expected);
  const pace = expectedPacePct(d.createdOn, d.dueOn, data.today);
  const daysToDue = daysBetween(data.today, d.dueOn);
  const dueText = daysToDue < 0 ? `${plural(-daysToDue, "day")} overdue` : `due ${inDays(daysToDue)}`;

  return (
    <AreaCard area="dues" title="Dues" icon={Banknote} status={status} wide links={links}>
      <div className="orgkit-health-dues-body">
      <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
      <p className="orgkit-wrap" style={{ margin: 0, fontSize: 13, color: "var(--color-muted-strong)" }}>
        {d.name} · {formatShortDate(d.dueOn)} ({dueText})
      </p>

      <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", columnGap: 10, rowGap: 2 }}>
        <span
          style={{ fontSize: "clamp(26px, 3vw, 32px)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.02em", color: "var(--color-ink)" }}
        >
          {formatPesoCompact(d.collected)}
        </span>
        <span style={{ fontSize: 14, color: "var(--color-muted)" }}>collected of {formatPesoCompact(d.expected)}</span>
      </div>

      <CollectionMeter collectedPct={rate} pacePct={pace} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0, justifyContent: "center" }}>
      <dl className="orgkit-health-stats" style={{ margin: 0 }}>
        <MiniStat label="Paid" value={d.paid} />
        <MiniStat label="Pending review" value={d.pending} tone={d.pending > 0 ? "warn" : undefined} />
        <MiniStat label="Rejected" value={d.rejected} tone={d.rejected > 0 ? "danger" : undefined} />
        <MiniStat label="Unpaid" value={d.unpaid} />
      </dl>

      {d.outstanding > 0 && (
        <Fact icon={Banknote} tone={daysToDue < 0 ? "warn" : "muted"}>
          {formatPesoCompact(d.outstanding)} still to collect from {plural(d.pending + d.rejected + d.unpaid, "member")}
        </Fact>
      )}
      </div>
      </div>
    </AreaCard>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: number; tone?: "warn" | "danger" }) {
  const color =
    tone === "warn" ? "var(--color-amber-strong)" : tone === "danger" ? "var(--color-danger-strong)" : "var(--color-ink)";
  return (
    <div style={{ minWidth: 0 }}>
      <dd style={{ margin: 0, fontSize: 22, fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.02em", color }}>{value}</dd>
      <dt style={{ marginTop: 2, fontSize: 12.5, color: "var(--color-muted)" }}>{label}</dt>
    </div>
  );
}

// ---------------------------------------------------------------------------

function MembersCard({ orgId, data, statuses }: CardsProps) {
  const m = data.members;
  const status = statuses.members;
  const links = [{ href: membersPath(orgId), label: m.active + m.pending === 0 ? "Add members" : "Open members" }];

  if (status === "empty") {
    return (
      <AreaCard area="members" title="Members" icon={Users} status={status} links={links}>
        <NotStarted title="No members yet" hint="Add your members, or share the join link, and their numbers appear here" />
      </AreaCard>
    );
  }

  const tone = m.joined30d > m.joinedPrev30d ? "up" : m.joined30d < m.joinedPrev30d ? "down" : "flat";

  return (
    <AreaCard area="members" title="Members" icon={Users} status={status} links={links}>
      <BigNumber value={m.active} label={m.active === 1 ? "active member" : "active members"} />
      <Delta tone={tone}>
        {m.joined30d} joined in the last 30 days
        <span style={{ color: "var(--color-muted)", fontWeight: 400 }}> · {m.joinedPrev30d} before</span>
      </Delta>
      {m.pending > 0 ? (
        <Fact icon={Users} tone="warn">
          {plural(m.pending, "student")} waiting to be confirmed
        </Fact>
      ) : (
        <Fact icon={Users}>No one is waiting to be confirmed</Fact>
      )}
    </AreaCard>
  );
}

// ---------------------------------------------------------------------------

function EventsCard({ orgId, data, statuses }: CardsProps) {
  const e = data.events;
  const status = statuses.events;
  const links = [{ href: eventsPath(orgId), label: e.total === 0 ? "Schedule an event" : "Open events" }];

  if (status === "empty") {
    return (
      <AreaCard area="events" title="Events" icon={CalendarDays} status={status} links={links}>
        <NotStarted title="No events yet" hint="Schedule an event and check members in to start tracking turnout" />
      </AreaCard>
    );
  }

  const change = turnoutChange(data);
  const dropped = change !== null && change <= -HEALTH_RULES.turnoutDropPoints;

  return (
    <AreaCard area="events" title="Events" icon={CalendarDays} status={status} links={links}>
      {e.turnoutPct90d !== null ? (
        <BigNumber value={`${e.turnoutPct90d}%`} label={`average turnout across ${plural(e.held90d, "event")} in the last 90 days`} />
      ) : (
        <BigNumber value={e.held90d} label="events held in the last 90 days" />
      )}

      {change !== null && (
        <Delta tone={dropped ? "warn" : change > 0 ? "up" : change < 0 ? "down" : "flat"}>
          {change === 0
            ? "Same turnout as the 90 days before"
            : `${plural(Math.abs(change), "point")} ${change > 0 ? "higher" : "lower"} than the 90 days before`}
        </Delta>
      )}

      {e.nextEvent ? (
        <Fact icon={CalendarDays}>
          <span className="orgkit-wrap" style={{ fontWeight: 600, color: "var(--color-ink)" }}>
            Next: {e.nextEvent.title}
          </span>
          <br />
          {formatEventStart(e.nextEvent.startsAt)}
        </Fact>
      ) : (
        <Fact icon={CalendarDays} tone="warn">
          Nothing is scheduled
        </Fact>
      )}
    </AreaCard>
  );
}

// ---------------------------------------------------------------------------

function OfficersCard({ orgId, data, statuses }: CardsProps) {
  const o = data.officers;
  const status = statuses.officers;
  const links = [{ href: termsPath(orgId), label: o.termsTotal === 0 ? "Record terms" : "Open terms" }];

  if (status === "empty") {
    return (
      <AreaCard area="officers" title="Terms" icon={Award} status={status} links={links}>
        <NotStarted title="No terms recorded" hint="Record who holds each role this term, so handovers can be planned" />
      </AreaCard>
    );
  }

  return (
    <AreaCard area="officers" title="Terms" icon={Award} status={status} links={links}>
      <BigNumber value={o.termsCurrent} label={o.termsCurrent === 1 ? "current term" : "current terms"} />
      {o.termsCurrent === 0 && <Fact icon={Award} tone="warn">Every recorded term has ended</Fact>}
      {o.termsEnding30d > 0 && (
        <Fact icon={Award} tone="warn">
          {plural(o.termsEnding30d, "term")} {o.termsEnding30d === 1 ? "ends" : "end"} within {HEALTH_RULES.termEndingDays} days
        </Fact>
      )}
      {o.termsEnding30d === 0 && o.nextTermEnd && <Fact icon={Award}>Next term ends {formatShortDate(o.nextTermEnd)}</Fact>}
      <Fact icon={Users}>
        {plural(o.withAccess, "officer")} {o.withAccess === 1 ? "has" : "have"} access to this workspace
      </Fact>
    </AreaCard>
  );
}

// ---------------------------------------------------------------------------

const GUIDE_LABEL = { ready: "Ready", draft: "Draft", missing: "No guide" } as const;

function HandoverCard({ orgId, data, statuses }: CardsProps) {
  const h = data.handover;
  const docs = data.documents;
  const status = statuses.handover;
  const links = [
    { href: handoverPath(orgId), label: status === "empty" ? "Start a guide" : "Open handover" },
    { href: documentsPath(orgId), label: "Documents" },
  ];

  const documentsFact =
    docs.total > 0 ? (
      <Fact icon={FileText}>
        {plural(docs.total, "document")} across {docs.categoriesCovered} of 5 categories
      </Fact>
    ) : (
      <Fact icon={FileText}>No documents stored yet</Fact>
    );

  if (status === "empty") {
    return (
      <AreaCard area="handover" title="Handover" icon={BookOpen} status={status} links={links}>
        <NotStarted title="No handover guides yet" hint="Write a guide for each role so the next officers do not start from scratch" />
        {documentsFact}
      </AreaCard>
    );
  }

  return (
    <AreaCard area="handover" title="Handover" icon={BookOpen} status={status} links={links}>
      {h.endingTotal > 0 ? (
        <>
          <BigNumber
            value={`${h.endingReady} of ${h.endingTotal}`}
            label={`${h.endingTotal === 1 ? "role" : "roles"} ending soon with a ready guide`}
          />
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
            {h.roles.slice(0, 2).map((role) => (
              <li
                key={role.roleTitle}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}
              >
                <span style={{ minWidth: 0 }}>
                  <span className="orgkit-wrap" style={{ fontSize: 13.5, fontWeight: 600, color: "var(--color-ink)" }}>
                    {role.roleTitle}
                  </span>
                  <span style={{ fontSize: 12.5, color: "var(--color-muted)" }}>
                    {" "}
                    · term ends {inDays(daysBetween(data.today, role.endDate))}
                  </span>
                </span>
                <GuidePill status={role.guideStatus} />
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <BigNumber value={h.guidesReady} label={h.guidesReady === 1 ? "handover guide ready" : "handover guides ready"} />
          <Fact icon={BookOpen}>No terms end in the next 60 days{h.guidesDraft > 0 ? `, ${plural(h.guidesDraft, "draft")} in progress` : ""}</Fact>
        </>
      )}
      {documentsFact}
    </AreaCard>
  );
}

function GuidePill({ status }: { status: "ready" | "draft" | "missing" }) {
  const tone =
    status === "ready"
      ? { fg: "var(--color-accent-strong)", bg: "color-mix(in srgb, var(--color-accent) 10%, var(--color-surface))" }
      : status === "draft"
        ? { fg: "var(--color-amber-strong)", bg: "var(--color-amber-soft)" }
        : { fg: "var(--color-danger-strong)", bg: "var(--color-danger-soft)" };
  return (
    <span
      style={{
        flexShrink: 0,
        padding: "2px 10px",
        borderRadius: 9999,
        backgroundColor: tone.bg,
        color: tone.fg,
        fontSize: 12.5,
        fontWeight: 600,
      }}
    >
      {GUIDE_LABEL[status]}
    </span>
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
