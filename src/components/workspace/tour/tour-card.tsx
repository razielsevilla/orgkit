import type { CSSProperties, Ref } from "react";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import { DialogButton } from "@/src/components/ui/dialog";
import {
  FIRST_WEEK_LINKS,
  SECTION_META,
  type TourBeat,
  type TourProgress,
} from "@/src/lib/tour/tour-beats";

export const TOUR_CARD_TITLE_ID = "orgkit-tour-title";

/**
 * "center": no target, the card sits in the middle of the screen.
 * "float": beside the highlighted thing, at `style`.
 * "sheet": on a phone, pinned to the bottom of the screen with the target above it.
 */
export type TourCardMode = "center" | "float" | "sheet";

interface TourCardProps {
  beat: TourBeat;
  progress: TourProgress;
  isAdmin: boolean;
  orgId: string;
  mode: TourCardMode;
  /** Where a floating card goes (top and left, in viewport pixels) */
  style?: CSSProperties;
  /** The thing to point at is not on screen, so say why */
  showMissing: boolean;
  /** The page behind the card is showing example data, so say it is not real */
  sample?: boolean;
  isFirst: boolean;
  isLast: boolean;
  /** "page" is the guide to one page: no welcome wording, no section skipping */
  variant?: "full" | "page";
  onBack: () => void;
  onNext: () => void;
  onSkipSection: () => void;
  /** Ends the tour: the close button, Escape, Skip for now, Finish, or a link in the card */
  onClose: () => void;
  cardRef?: Ref<HTMLDivElement>;
}

/** The card that explains the highlighted thing: where it is, what it is for, and numbered steps to use it */
export function TourCard({
  beat,
  progress,
  isAdmin,
  orgId,
  mode,
  style,
  showMissing,
  sample = false,
  isFirst,
  isLast,
  variant = "full",
  onBack,
  onNext,
  onSkipSection,
  onClose,
  cardRef,
}: TourCardProps) {
  const { label, icon: Icon } = SECTION_META[beat.section];
  const isPage = variant === "page";
  const nextLabel = isLast
    ? isPage
      ? "Done"
      : "Finish"
    : isFirst && !isPage
      ? "Start tour"
      : beat.kind === "nav"
        ? beat.title
        : "Next";
  const adminBlocked = beat.adminOnly && !isAdmin;

  return (
    <div
      ref={cardRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={TOUR_CARD_TITLE_ID}
      tabIndex={-1}
      className={`orgkit-tour-card is-${mode}`}
      style={style}
    >
      <header className="orgkit-tour-card-head">
        <span className="orgkit-tour-tile" aria-hidden="true">
          <Icon size={18} strokeWidth={2} />
        </span>
        <span className="orgkit-tour-tag">
          {label} · {progress.position} of {progress.count}
        </span>
        <button type="button" className="orgkit-dialog-close" onClick={onClose} aria-label="Skip tour">
          <X size={18} strokeWidth={2} aria-hidden="true" />
        </button>
      </header>

      {/* The card is one element for the whole tour: only its words change, so a step is instant. The body is keyed so a long step's scroll position does not carry over */}
      <div key={beat.id} className="orgkit-tour-card-body">
        <h2 id={TOUR_CARD_TITLE_ID} className="orgkit-tour-title">
          {beat.title}
        </h2>
        <p className="orgkit-tour-text">{beat.body}</p>

        {beat.id === "welcome" && <RoleNote isAdmin={isAdmin} />}

        {beat.steps && (
          <ol className="orgkit-tour-steps">
            {beat.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        )}

        {beat.section === "finish" && <FirstWeek isAdmin={isAdmin} orgId={orgId} onLeave={onClose} />}

        {beat.adminOnly && (
          <p className="orgkit-tour-note">
            <span className="orgkit-tour-pill">Admin only</span>
            {adminBlocked ? "Ask an admin on your team to do this." : "You are an admin, so you can do this."}
          </p>
        )}

        {showMissing && !adminBlocked && beat.missing && (
          <p className="orgkit-tour-note is-missing">Nothing to point at yet. {beat.missing}</p>
        )}

        {sample && (
          <p className="orgkit-tour-sample">Example data, made up for this tour. Nothing here is saved.</p>
        )}

        {beat.kind === "nav" && mode !== "center" && (
          <p className="orgkit-tour-hint">Click it in the sidebar, or press {beat.title}.</p>
        )}
      </div>

      <footer className="orgkit-tour-card-foot">
        <div
          className="orgkit-tour-progress"
          role="progressbar"
          aria-label="Tour progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress.overall * 100)}
          aria-valuetext={`${label}, step ${progress.position} of ${progress.count}`}
        >
          {progress.sections.map((section) => (
            <span
              key={section.id}
              className={`orgkit-tour-seg${section.id === beat.section ? " is-current" : ""}`}
              style={{ "--fill": `${Math.round(section.fill * 100)}%` } as CSSProperties}
            />
          ))}
        </div>

        <div className="orgkit-tour-actions">
          {!isPage && !isFirst && !isLast && (
            <button type="button" className="orgkit-tour-skip" onClick={onSkipSection}>
              Skip section
            </button>
          )}
          <span className="orgkit-tour-spacer" />
          {isFirst ? (
            <DialogButton onClick={onClose}>{isPage ? "Close" : "Skip for now"}</DialogButton>
          ) : (
            <DialogButton onClick={onBack}>Back</DialogButton>
          )}
          <DialogButton variant="primary" data-autofocus onClick={onNext}>
            {nextLabel}
          </DialogButton>
        </div>
      </footer>
    </div>
  );
}

/** Tells the officer which role they are in, so the "Admin only" notes make sense */
function RoleNote({ isAdmin }: { isAdmin: boolean }) {
  return (
    <p className="orgkit-tour-role">
      {isAdmin
        ? "You are an admin of this workspace, so you will also see how to manage the join link, invites, roles and terms."
        : "You are an officer of this workspace. Parts marked Admin only are done by an admin on your team, and the tour shows what to ask them for."}
    </p>
  );
}

/** The closing card: the first things to do, each a link to the page it starts on */
function FirstWeek({ isAdmin, orgId, onLeave }: { isAdmin: boolean; orgId: string; onLeave: () => void }) {
  const items = FIRST_WEEK_LINKS.filter((item) => isAdmin || !item.adminOnly);
  return (
    <ul className="orgkit-tour-first">
      {items.map((item, i) => (
        <li key={item.label}>
          <Link href={item.href(orgId)} onClick={onLeave} className="orgkit-tour-start">
            <span className="orgkit-tour-start-num" aria-hidden="true">
              {i + 1}
            </span>
            <span style={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>{item.label}</span>
            <ArrowRight size={16} strokeWidth={2} aria-hidden="true" style={{ color: "var(--color-muted)" }} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
