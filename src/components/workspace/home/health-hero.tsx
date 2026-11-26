import Link from "next/link";
import {
  AlertCircle,
  Award,
  Banknote,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AttentionItem, HealthArea, HealthStatus, HealthSummary } from "@/src/lib/health/org-health";
import { plural } from "@/src/lib/health/org-health";
import { documentsPath, duesPath, eventsPath, handoverPath, membersPath, termsPath } from "@/src/lib/routes";
import { cardId } from "./health-cards";
import { MONO, PANEL_STYLE, STATUS_META } from "./health-shared";

export const AREA_LABEL: Record<HealthArea, string> = {
  dues: "Dues",
  members: "Members",
  events: "Events",
  officers: "Terms",
  handover: "Handover",
};

/** Cards and chips read in this order */
export const DISPLAY_ORDER: readonly HealthArea[] = ["dues", "members", "events", "officers", "handover"];

function areaHref(orgId: string, area: HealthArea): string {
  switch (area) {
    case "dues":
      return duesPath(orgId);
    case "members":
      return membersPath(orgId);
    case "events":
      return eventsPath(orgId);
    case "officers":
      return termsPath(orgId);
    case "handover":
      return handoverPath(orgId);
  }
}

// Three rows keep Home on one screen. The rest are counted ("Plus N more") and live in the cards.
const MAX_NEXT_ITEMS = 3;

/** The area chips under the headline stay neutral: only the status pills on the cards carry the status colours */
const CHIP_ICON: Record<HealthStatus, string> = {
  good: "var(--color-accent)",
  watch: "var(--color-ink-soft)",
  critical: "var(--color-ink)",
  empty: "var(--color-muted)",
};

interface HeroProps {
  /** "Updated 10:00 AM", shown under the area chips */
  updatedText?: string;
  orgId: string;
  orgName: string;
  schoolName: string | null;
  summary: HealthSummary;
}

/** The ring: how many of the areas with data are on track */
function HealthRing({ good, considered }: { good: number; considered: number }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const share = considered > 0 ? good / considered : 0;

  return (
    <div
      role="img"
      aria-label={considered > 0 ? `${good} of ${considered} areas on track` : "No areas to rate yet"}
      style={{ position: "relative", width: 80, height: 80, flexShrink: 0 }}
    >
      <svg width={80} height={80} viewBox="0 0 96 96" style={{ transform: "rotate(-90deg)" }} aria-hidden="true">
        <circle cx={48} cy={48} r={radius} fill="transparent" stroke="color-mix(in srgb, var(--color-accent) 16%, transparent)" strokeWidth={8} />
        {share > 0 && (
          <circle
            cx={48}
            cy={48}
            r={radius}
            fill="transparent"
            stroke="var(--color-accent)"
            strokeWidth={8}
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - share)}
            strokeLinecap="round"
          />
        )}
      </svg>
      <div
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}
      >
        {considered > 0 ? (
          <>
            <span style={{ ...MONO, fontSize: 19, fontWeight: 600, lineHeight: 1, letterSpacing: "-0.02em", color: "var(--color-ink)" }}>
              {good}/{considered}
            </span>
            <span style={{ ...MONO, marginTop: 4, fontSize: 10, lineHeight: 1, letterSpacing: "-0.02em", color: "var(--color-muted-strong)" }}>on track</span>
          </>
        ) : (
          <Users size={30} strokeWidth={1.75} color="var(--color-accent)" />
        )}
      </div>
    </div>
  );
}

function AreaChips({ summary }: { summary: HealthSummary }) {
  return (
    <ul aria-label="Areas" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexWrap: "wrap", gap: 8 }}>
      {DISPLAY_ORDER.map((area) => {
        const status = summary.statuses[area];
        const { Icon, label } = STATUS_META[status];
        return (
          <li key={area}>
            <a href={`#${cardId(area)}`} className="orgkit-health-chip" data-status={status}>
              <Icon size={14} strokeWidth={2} aria-hidden="true" style={{ color: CHIP_ICON[status], flexShrink: 0 }} />
              {AREA_LABEL[area]}
              <span className="sr-only">: {label}</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}

/** The same colours as the status pills on the cards (and on the Members page): red for action, amber for a look */
const SEVERITY_ICON: Record<AttentionItem["severity"], { Icon: LucideIcon; fg: string; bg: string; line: string }> = {
  critical: {
    Icon: AlertCircle,
    fg: "var(--color-danger-strong)",
    bg: "var(--color-danger-soft)",
    line: "var(--color-danger-line)",
  },
  watch: {
    Icon: Clock,
    fg: "var(--color-amber-strong)",
    bg: "var(--color-amber-soft)",
    line: "var(--color-amber-line)",
  },
};

function NextRow({
  href,
  Icon,
  fg,
  bg,
  line,
  title,
  detail,
  showDetail = true,
}: {
  href: string;
  Icon: LucideIcon;
  fg: string;
  bg: string;
  /** A hairline around the tile, when it carries a status colour */
  line?: string;
  title: string;
  detail: string;
  /** Hidden rows keep the detail for screen readers and as the hover text, to save words and height */
  showDetail?: boolean;
}) {
  return (
    <li>
      <Link href={href} className="orgkit-health-next-item" title={showDetail ? undefined : detail}>
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
            border: line ? `1px solid ${line}` : undefined,
            boxSizing: "border-box",
            backgroundColor: bg,
            color: fg,
          }}
        >
          <Icon size={16} strokeWidth={2} />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span className="orgkit-wrap" style={{ display: "block", fontSize: 14, fontWeight: 600, lineHeight: 1.35, letterSpacing: "-0.01em", color: "var(--color-ink)" }}>
            {title}
          </span>
          <span
            className={showDetail ? "orgkit-wrap" : "sr-only"}
            style={showDetail ? { display: "block", marginTop: 1, fontSize: 13, lineHeight: 1.4, color: "var(--color-muted)" } : undefined}
          >
            {showDetail ? detail : `. ${detail}`}
          </span>
        </span>
        <ChevronRight size={18} strokeWidth={1.75} aria-hidden="true" style={{ flexShrink: 0, color: "var(--color-muted-soft)" }} />
      </Link>
    </li>
  );
}

const GET_STARTED = (orgId: string) => [
  { href: membersPath(orgId), Icon: Users, title: "Add your members", detail: "Import a list or share the join link" },
  { href: eventsPath(orgId), Icon: CalendarDays, title: "Schedule your first event", detail: "Check members in with a QR code" },
  { href: duesPath(orgId), Icon: Banknote, title: "Set up a dues period", detail: "Collect and verify payments in one place" },
  { href: termsPath(orgId), Icon: Award, title: "Record officer terms", detail: "So handovers can be planned ahead" },
  { href: documentsPath(orgId), Icon: BookOpen, title: "Store your key documents", detail: "Budgets, bylaws and templates, kept for the next officers" },
];

function NextColumn({ orgId, summary }: { orgId: string; summary: HealthSummary }) {
  const getStarted = summary.considered === 0;
  const items = summary.attention.slice(0, MAX_NEXT_ITEMS);
  const hidden = summary.attention.length - items.length;

  return (
    <div className="orgkit-health-hero-next">
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, margin: "0 0 4px 0" }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--color-ink)" }}>
          {getStarted ? "Get started" : "Do next"}
        </h2>
        {!getStarted && hidden > 0 && (
          <span style={{ fontSize: 13, color: "var(--color-muted-strong)" }}>Plus {plural(hidden, "more item")} in the cards</span>
        )}
      </div>

      {getStarted ? (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {GET_STARTED(orgId)
            .slice(0, 3)
            .map((step) => (
              <NextRow
                key={step.href}
                href={step.href}
                Icon={step.Icon}
                fg="var(--color-ink-soft)"
                bg="var(--color-base)"
                title={step.title}
                detail={step.detail}
              />
            ))}
        </ul>
      ) : items.length === 0 ? (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "8px 0" }}>
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
              color: "var(--color-accent)",
            }}
          >
            <CheckCircle2 size={16} strokeWidth={2} />
          </span>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--color-ink)" }}>Nothing needs your attention</p>
            <p style={{ margin: "1px 0 0 0", fontSize: 13, lineHeight: 1.4, color: "var(--color-muted)" }}>
              Anything an officer should act on will show up here
            </p>
          </div>
        </div>
      ) : (
        <>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {items.map((item) => {
              const { Icon, fg, bg, line } = SEVERITY_ICON[item.severity];
              return (
                <NextRow key={item.id} href={areaHref(orgId, item.area)} Icon={Icon} fg={fg} bg={bg} line={line} title={item.title} detail={item.detail} showDetail={false} />
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

export function HealthHero({ orgId, orgName, schoolName, summary, updatedText }: HeroProps) {
  const subtitle = schoolName ? `${orgName} · ${schoolName}` : orgName;

  return (
    <section aria-labelledby="health-title" className="orgkit-health-hero stagger-1" style={{ ...PANEL_STYLE, boxShadow: "var(--shadow-card)", borderRadius: 24 }}>
      <div className="orgkit-health-hero-main">
        <div style={{ display: "flex", alignItems: "center", gap: 18, minWidth: 0 }}>
          <HealthRing good={summary.counts.good} considered={summary.considered} />
          <div style={{ minWidth: 0 }}>
            <p className="orgkit-wrap" style={{ margin: "0 0 4px 0", fontSize: 13.5, fontWeight: 500, color: "var(--color-muted-strong)" }}>
              {subtitle}
            </p>
            <h1
              id="health-title"
              tabIndex={-1}
              style={{
                outline: "none",
                margin: 0,
                fontSize: "clamp(24px, 2.6vw, 34px)",
                fontWeight: 700,
                lineHeight: 1.1,
                letterSpacing: "-0.035em",
                color: "var(--color-ink)",
              }}
            >
              {summary.headline}
            </h1>
            <p style={{ margin: "6px 0 0 0", fontSize: 14, fontWeight: 450, lineHeight: 1.4, letterSpacing: "-0.01em", color: "var(--color-muted)" }}>
              {summary.subline}
              {updatedText ? (
                <>
                  {" · "}
                  <span style={{ ...MONO, fontSize: 12.5 }}>{updatedText.toLowerCase()}</span>
                </>
              ) : null}
            </p>
          </div>
        </div>
        {summary.considered > 0 && <AreaChips summary={summary} />}
      </div>
      <NextColumn orgId={orgId} summary={summary} />
    </section>
  );
}
