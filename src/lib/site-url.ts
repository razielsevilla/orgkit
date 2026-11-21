/**
 * The public address of the app, from NEXT_PUBLIC_SITE_URL. This is the one place
 * that reads it. Links that members or officers will open (check-in, join, pay and
 * invite links, reminder emails) are built on this address.
 *
 * In production it is never taken from the request (Host / X-Forwarded-Host), because
 * a request header is not something to build an emailed link from. Outside production
 * a localhost fallback is allowed so the app works without setup.
 *
 * Everything here runs when called, never at import time, so a build without the
 * variable still works.
 */

/** Where links point when no address is configured, outside production only */
export const LOCAL_SITE_URL = "http://localhost:3000";

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * The address set in NEXT_PUBLIC_SITE_URL, without trailing slashes, or null when
 * it is not set. No fallback.
 */
export function getConfiguredSiteUrl(): string | null {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  return configured || null;
}

/**
 * The address to build links on: the configured one, else localhost outside
 * production. Null in production when nothing is configured, for callers that show
 * a message instead of failing.
 */
export function getSiteUrl(): string | null {
  return getConfiguredSiteUrl() ?? (isProduction() ? null : LOCAL_SITE_URL);
}

/**
 * Like `getSiteUrl`, but throws a clear error when there is no address, so a
 * misconfigured production deployment fails loudly instead of emailing bad links.
 */
export function requireSiteUrl(): string {
  const siteUrl = getSiteUrl();
  if (!siteUrl) {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL is not set. It is required in production to build links."
    );
  }
  return siteUrl;
}
