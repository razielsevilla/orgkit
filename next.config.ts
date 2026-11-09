import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
    // The member-list import (R3) uploads a CSV of up to 1 MB through a Server
    // Action. The default 1 MB cap, which also counts the multipart overhead,
    // would refuse a file at the limit before our code could show a clear
    // message. So allow a little more here and enforce the real limit
    // (MAX_CSV_BYTES) in the action.
    serverActions: {
      bodySizeLimit: "1300kb",
    },
  },
  cacheComponents: true,
  partialPrefetching: true,
  // Join and invite links carry a secret in the URL: don't pass it on through
  // Referer, and keep it out of search engines. Keep this list in step with
  // SECRET_URL_PREFIXES in src/lib/routes.ts (a test checks it).
  async headers() {
    const secretUrlHeaders = [
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "X-Robots-Tag", value: "noindex, nofollow" },
    ];
    return [
      { source: "/join/:path*", headers: secretUrlHeaders },
      { source: "/invite/:path*", headers: secretUrlHeaders },
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
