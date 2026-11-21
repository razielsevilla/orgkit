import { useEffect, type RefObject } from "react";
import { markLoaderStart, peekLoaderElapsed } from "./loader-clock";

/**
 * Starts the loader clock when a loader mounts, and sets --loader-offset on its
 * root so its CSS animations start part-way through. That way a loader that
 * replaces another carries on from where it stopped instead of starting over.
 */
export function useLoaderOffset(rootRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    markLoaderStart();
    rootRef.current?.style.setProperty("--loader-offset", `-${Math.round(peekLoaderElapsed())}ms`);
  }, [rootRef]);
}
