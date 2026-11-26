"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { buildTourBeats, describeProgress, type TourScope, type TourSection } from "@/src/lib/tour/tour-beats";
import { expandRect, placeCard, SPOTLIGHT_PAD, type Size } from "@/src/lib/tour/tour-placement";
import { useExampleDataShown } from "@/src/lib/tour/tour-demo";
import { useTourTarget } from "@/src/lib/tour/use-tour-target";
import { useMounted } from "@/src/lib/use-mounted";
import { useNarrowScreen } from "@/src/lib/use-narrow-screen";
import { useMediaQuery, useViewport } from "@/src/lib/use-viewport";
import { TourCard } from "./tour-card";
import { TourExampleBadge } from "./tour-example-badge";
import { TourSpotlight } from "./tour-spotlight";
import { TourStyles } from "./tour-styles";

/** On a phone the card is a sheet at the bottom: this much of the screen is kept clear of the target */
const SHEET_RESERVE = 360;

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface OfficerTourProps {
  orgId: string;
  isAdmin: boolean;
  /** "all" for the full tour, or one sidebar section for the guide to that page */
  scope?: TourScope;
  /** Ends the tour and remembers it was seen. Called for finishing, skipping, Escape and following a link */
  onClose: () => void;
}

/**
 * The officer tour. It dims the screen, lights up the real button, list or
 * sidebar entry being explained, and shows a card beside it with numbered steps
 * for using it. It opens each page itself as it goes (the workspace frame stays
 * mounted across pages, so the tour carries on while the page changes under it).
 *
 * Mounted only while it is open, so it always starts at the beginning: the welcome for the
 * full tour, or the first thing on the page for one page's guide (`scope`).
 *
 * - A sidebar beat leaves the link clickable: clicking it, or pressing the button,
 *   opens the page and moves on.
 * - Every other beat is look-only: the highlighted control cannot be clicked, so
 *   the tour never starts something half way (a dialog, an upload).
 * - If what a beat points at is not on screen (an empty page, a role without it),
 *   the card says so and sits in the middle instead of pointing at nothing.
 */
export function OfficerTour({ orgId, isAdmin, scope = "all", onClose }: OfficerTourProps) {
  const mounted = useMounted();
  const router = useRouter();
  const pathname = usePathname();
  const narrow = useNarrowScreen();
  const sheet = useMediaQuery("(max-width: 640px)");
  const viewport = useViewport();

  // The sidebar is a menu on a phone, so its entries are not pointed at one by one
  const beats = useMemo(() => buildTourBeats({ narrow, scope }), [narrow, scope]);

  // Remember the beat by id (and section), not by position: turning a phone sideways
  // changes the list, and the tour should stay where it was
  const [cursor, setCursor] = useState<{ id: string; section: TourSection }>(() => ({
    id: beats[0].id,
    section: beats[0].section,
  }));
  const byId = beats.findIndex((b) => b.id === cursor.id);
  const index = byId >= 0 ? byId : Math.max(0, beats.findIndex((b) => b.section === cursor.section));
  const beat = beats[index];
  const isFirst = index === 0;
  const isLast = index === beats.length - 1;
  const progress = useMemo(() => describeProgress(beats, index), [beats, index]);

  // Officers are not shown what only admins can do: the card explains, with nothing to point at
  const names = beat.adminOnly && !isAdmin ? undefined : beat.target;
  const target = useTourTarget(names, beat.id, sheet ? SHEET_RESERVE : 0);
  const found = target.status === "found" ? target : null;
  // True while an empty page is showing made-up example data, so it is never mistaken for real
  const exampleShown = useExampleDataShown();

  const go = (to: number) => {
    const next = beats[Math.min(Math.max(to, 0), beats.length - 1)];
    setCursor({ id: next.id, section: next.section });
  };
  // Moving on never waits for a page: the next beat opens its page itself (below) and shows its card
  // while the page loads, then points at the control once it appears
  const next = () => (isLast ? onClose() : go(index + 1));
  const back = () => go(index - 1);
  const skipSection = () => {
    const after = beats.findIndex((b, i) => i > index && b.section !== beat.section);
    go(after < 0 ? beats.length - 1 : after);
  };

  // The newest handlers, for listeners that are set up once and must not go stale
  const actions = useRef({ next, back, onClose });
  useEffect(() => {
    actions.current = { next, back, onClose };
  });

  // Open the page this beat is about, once per beat
  const openedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!beat.path) return;
    const want = beat.path(orgId);
    if (pathname === want) {
      openedFor.current = null;
      return;
    }
    if (openedFor.current === beat.id) return;
    openedFor.current = beat.id;
    router.push(want);
  }, [beat, orgId, pathname, router]);

  // The officer clicked the highlighted sidebar link: move on straight away. The link opens the page
  // by itself, so the next beat is told not to open it a second time
  useEffect(() => {
    if (beat.kind !== "nav") return;
    const selector = `[data-tour="nav-${beat.section}"]`;
    const following = beats[index + 1];
    const onClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest(selector)) return;
      if (following) openedFor.current = following.id;
      actions.current.next();
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [beat, beats, index]);

  // Warm up the pages the next few steps will open, so they are ready by the time the officer gets there
  useEffect(() => {
    const seen = new Set<string>();
    for (const upcoming of beats.slice(index + 1, index + 4)) {
      const path = upcoming.path?.(orgId) ?? upcoming.expectPath?.(orgId);
      if (path && path !== pathname && !seen.has(path)) {
        seen.add(path);
        router.prefetch(path);
      }
    }
  }, [beats, index, orgId, pathname, router]);

  // The card's size decides where it can go, so watch it
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [cardSize, setCardSize] = useState<Size>({ width: 328, height: 320 });
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() =>
      setCardSize((prev) =>
        prev.width === el.offsetWidth && prev.height === el.offsetHeight ? prev : { width: el.offsetWidth, height: el.offsetHeight }
      )
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [beat.id, mounted]);

  // Focus moves to the card for each beat, so a screen reader reads the new title
  const ready = target.status !== "searching";
  useEffect(() => {
    if (ready) cardRef.current?.focus({ preventScroll: true });
  }, [ready, beat.id]);

  // Give focus back to what opened the tour (the ? button or the profile menu) when it ends
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    return () => opener?.focus?.();
  }, []);

  // Keyboard: Escape ends it, the arrows move, Tab stays inside the card
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        actions.current.onClose();
      } else if (event.key === "ArrowRight") {
        actions.current.next();
      } else if (event.key === "ArrowLeft") {
        actions.current.back();
      } else if (event.key === "Tab" && cardRef.current) {
        const items = Array.from(cardRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
        if (items.length === 0) return event.preventDefault();
        const first = items[0];
        const last = items[items.length - 1];
        const active = document.activeElement;
        if (event.shiftKey && (active === first || active === cardRef.current || !cardRef.current.contains(active))) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && (active === last || !cardRef.current.contains(active))) {
          event.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  if (!mounted) return null;

  const mode = found ? (sheet ? "sheet" : "float") : "center";
  // Always top and left (the middle of the screen too), so any move from one place to another can glide.
  // A phone's bottom sheet is pinned by CSS instead.
  const place =
    mode === "float" && found
      ? placeCard({ target: expandRect(found.rect, SPOTLIGHT_PAD), card: cardSize, viewport, preferred: beat.placement })
      : mode === "center"
        ? {
            top: Math.max(12, (viewport.height - cardSize.height) / 2),
            left: Math.max(12, (viewport.width - cardSize.width) / 2),
          }
        : null;

  return createPortal(
    <>
      <TourStyles />
      {exampleShown && <TourExampleBadge />}
      <TourSpotlight
        target={found?.rect ?? null}
        radius={found?.radius}
        interactive={beat.kind === "nav"}
        viewport={viewport}
      />
      <TourCard
        cardRef={cardRef}
        beat={beat}
        progress={progress}
        isAdmin={isAdmin}
        orgId={orgId}
        mode={mode}
        style={place ?? undefined}
        showMissing={target.status === "missing"}
        sample={exampleShown && Boolean(beat.path)}
        isFirst={isFirst}
        isLast={isLast}
        variant={scope === "all" ? "full" : "page"}
        onBack={back}
        onNext={next}
        onSkipSection={skipSection}
        onClose={onClose}
      />
    </>,
    document.body
  );
}
