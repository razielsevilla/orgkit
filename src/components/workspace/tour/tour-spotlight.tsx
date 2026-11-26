import { dimPanels, expandRect, SPOTLIGHT_PAD, type Rect, type Size } from "@/src/lib/tour/tour-placement";

interface TourSpotlightProps {
  /** What to point at, in viewport pixels, or null for a plain dimmed screen */
  target: Rect | null;
  /** The target's corner radius, so the ring follows its shape */
  radius?: number;
  /** Lets clicks reach what is highlighted (a sidebar link). Otherwise it is only to look at */
  interactive?: boolean;
  viewport: Size;
}

const px = (rect: Rect) => ({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });

/**
 * The dim layer with a bright hole. Four panels surround the hole (a single
 * element with a cut-out cannot be hit-tested, so the panels are also what stops
 * clicks reaching the page), a ring marks the edge, and unless the highlighted
 * thing is meant to be clicked, a clear panel over the hole stops that too.
 * It is all decoration for sighted users: the card carries the same words.
 */
export function TourSpotlight({ target, radius = 12, interactive = false, viewport }: TourSpotlightProps) {
  const hole = target ? expandRect(target, SPOTLIGHT_PAD) : null;
  const panels = dimPanels(hole, viewport);

  return (
    <div aria-hidden="true" data-tour-layer="">
      {panels.map((panel, i) => (
        <div key={i} className="orgkit-tour-dim" style={px(panel)} />
      ))}
      {hole && (
        <>
          {!interactive && <div className="orgkit-tour-hole" style={px(hole)} />}
          <div className="orgkit-tour-ring" style={{ ...px(hole), borderRadius: radius + SPOTLIGHT_PAD }} />
        </>
      )}
    </div>
  );
}
