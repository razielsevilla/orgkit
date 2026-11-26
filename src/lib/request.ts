import { headers } from "next/headers";
import { LOCAL_SITE_URL, getConfiguredSiteUrl, requireSiteUrl } from "@/src/lib/site-url";
import { logger } from "@/src/lib/logger";

/**
 * The public address of the app, for links that are shown to an admin or emailed to
 * members. The configured NEXT_PUBLIC_SITE_URL always wins.
 *
 * In production it is the only source: a missing value throws (see `requireSiteUrl`),
 * and the request's Host / X-Forwarded-Host are never used, so a forged header cannot
 * put another address into an emailed link. Outside production, with nothing
 * configured, it falls back to the request's host (handy when opening the dev server
 * from a phone) and then to localhost.
 */
export async function getBaseUrl(): Promise<string> {
  const configured = getConfiguredSiteUrl();
  if (configured) return configured;

  if (process.env.NODE_ENV === "production") return requireSiteUrl();

  try {
    const headerList = await headers();
    const host = headerList.get("x-forwarded-host") || headerList.get("host");
    const proto =
      headerList.get("x-forwarded-proto") ||
      (host?.includes("localhost") || host?.includes("127.0.0.1") ? "http" : "https");
    if (host) {
      return `${proto}://${host}`;
    }
  } catch {
    // Fallback if headers() is unavailable
  }
  return LOCAL_SITE_URL;
}

let proxyWarningLogged = false;

/** Logs once per process when production is not on Vercel, where X-Forwarded-For is not guaranteed. */
export function warnIfProxyNotTrusted(): void {
  if (proxyWarningLogged) return;
  if (process.env.NODE_ENV !== "production" || process.env.VERCEL) return;
  proxyWarningLogged = true;
  logger.error(
    "rate_limit.untrusted_proxy",
    "Production is not running on Vercel, so X-Forwarded-For may be set by the caller and per-device rate limits can be bypassed. Fix getClientIp in src/lib/request.ts for this host before launch.",
    {}
  );
}

/**
 * The caller's IP address from the proxy headers, or "unknown" when there is
 * none. Used only to rate limit; callers should hash it before storing it.
 *
 * DEPLOYMENT ASSUMPTION: the app is deployed on Vercel, whose platform overwrites
 * X-Forwarded-For with the real client address instead of passing on a value the
 * client sent, so the first entry cannot be forged by the caller. This function
 * therefore trusts that header as it is.
 *
 * If the app is ever hosted somewhere else, or put behind a proxy that appends to
 * X-Forwarded-For rather than overwriting it, this must be revisited first: a client
 * could send its own header, take a fresh rate-limit bucket on every request and
 * get around the limits on the join, check-in, pay and invite pages.
 *
 * The code cannot prove where it runs, but it can notice: Vercel sets VERCEL=1 in every
 * build and runtime. In production without it, `warnIfProxyNotTrusted` logs one loud
 * `rate_limit.untrusted_proxy` error per server process, so a move to another host
 * shows up in the logs instead of silently weakening the limits.
 */
export async function getClientIp(): Promise<string> {
  warnIfProxyNotTrusted();
  const headerList = await headers();
  return (
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerList.get("x-real-ip") ||
    "unknown"
  );
}
