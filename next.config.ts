import type { NextConfig } from "next";
import { CSP_HEADER_NAME, HSTS_VALUE, buildCsp } from "./src/lib/security/csp.ts";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentUpgrade: "security",
    agentFeedback: true,
    // The member-list import (R3) uploads a CSV and dues payment screenshot
    // (P2) uploads proof of up to 5 MB through a Server Action. Allow up to 7 MB
    // here to safely account for multipart overhead.
    serverActions: {
      bodySizeLimit: "7mb",
    },
  },
  cacheComponents: true,
  partialPrefetching: true,
  // Join, invite, payment and check-in links carry a secret in the URL: don't pass it on through
  // Referer, and keep it out of search engines. Keep this list in step with
  // SECRET_URL_PREFIXES in src/lib/routes.ts (a test checks it).
  async headers() {
    // On every response. Nothing embeds our pages (sign-in with Google is a full-page
    // redirect), so framing is refused outright. Permissions-Policy turns off what the
    // app never uses; camera stays available to our own origin for a QR scanner, and
    // clipboard and fullscreen are left alone because the app uses them.
    // Content-Security-Policy and HSTS come from src/lib/security/csp.ts. The CSP starts as
    // Report-Only (CSP_ENFORCED = false there) until staging shows no violations.
    // X-Frame-Options stays alongside `frame-ancestors 'none'` for older browsers.
    const globalSecurityHeaders = [
      { key: CSP_HEADER_NAME, value: buildCsp({ supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL, isDev }) },
      { key: "Strict-Transport-Security", value: HSTS_VALUE },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      {
        key: "Permissions-Policy",
        value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=()",
      },
    ];
    // Rules that match the same path are merged, but when two set the same key the LAST
    // one wins. So the keys below must never be repeated in the global list above
    // (a test checks it).
    const secretUrlHeaders = [
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "X-Robots-Tag", value: "noindex, nofollow" },
    ];
    return [
      { source: "/:path*", headers: globalSecurityHeaders },
      { source: "/join/:path*", headers: secretUrlHeaders },
      { source: "/invite/:path*", headers: secretUrlHeaders },
      { source: "/pay/:path*", headers: secretUrlHeaders },
      { source: "/checkin/:path*", headers: secretUrlHeaders },
    ];
  },
  // Old addresses. Each page has exactly one URL (see docs/routes.md), so these
  // send bookmarks and shared links to it. Redirects run before the proxy.
  async redirects() {
    return [
      { source: "/org/:id", destination: "/workspace/:id", permanent: false },
      { source: "/org/:id/:path*", destination: "/workspace/:id/:path*", permanent: false },
      { source: "/orgs/new", destination: "/workspace/new", permanent: false },
      { source: "/setup", destination: "/workspace/new", permanent: false },
    ];
  },
};

export default nextConfig;
